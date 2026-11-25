import { readerStationApi, subscribeReaderFind, subscribeReaderSession } from './dajaPlatform';

const terminalStatuses = new Set(['completed', 'cancelled', 'expired']);

export function monitorReaderSession(session, kind, onData, onError) {
  const sessionId = session.id;
  let expiresAt = session.expiresAt ? Date.parse(session.expiresAt)
    : (session.expiresInSeconds > 0 ? Date.now() + session.expiresInSeconds * 1_000 : NaN);
  const read = kind === 'find' ? readerStationApi.findSession : readerStationApi.session;
  const subscribe = kind === 'find' ? subscribeReaderFind : subscribeReaderSession;
  let active = true;
  let connected = false;
  let timer;
  let request;
  let readAgain = false;
  let eventVersion = 0;
  let stopRealtime;
  const lastLabelEdits = {};

  const stop = () => {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    request?.abort();
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('online', wake);
    stopRealtime?.();
  };
  const apply = data => {
    if (!active || !data) return;
    if (terminalStatuses.has(data.status)) stop();
    if (data.expiresAt) expiresAt = Date.parse(data.expiresAt);
    else if (data.expiresInSeconds > 0) expiresAt = Date.now() + data.expiresInSeconds * 1_000;
    const labelEdits = {};
    for (const field of ['sku', 'variantName']) {
      const value = data.product?.labelEdits?.[field];
      if (typeof value !== 'string' || lastLabelEdits[field] === value) continue;
      lastLabelEdits[field] = value;
      labelEdits[field] = value;
    }
    onData(data, Object.keys(labelEdits).length ? labelEdits : undefined);
  };
  async function refresh() {
    if (!active || document.hidden || navigator.onLine === false) return;
    const controller = new AbortController();
    const version = eventVersion;
    const timeout = setTimeout(() => controller.abort(), 8_000);
    request = controller;
    try {
      const data = await read(sessionId, controller.signal);
      if (!controller.signal.aborted && data?.id === sessionId &&
          (version === eventVersion || terminalStatuses.has(data.status))) apply(data);
    } catch {
      // A failed read does not tell us anything about the actual session.
    } finally {
      clearTimeout(timeout);
      request = undefined;
      if (active && !document.hidden && navigator.onLine !== false) {
        if (readAgain) {
          readAgain = false;
          void refresh();
        } else {
          const timeToExpiry = expiresAt - Date.now();
          const delay = connected && timeToExpiry > 0 ? Math.min(30_000, timeToExpiry) : 1_250;
          timer = setTimeout(refresh, connected && !Number.isFinite(expiresAt) ? 30_000 : delay);
        }
      }
    }
  }
  function wake() {
    clearTimeout(timer);
    if (!active || document.hidden || navigator.onLine === false) return;
    if (request) readAgain = true;
    else {
      readAgain = false;
      void refresh();
    }
  }

  stopRealtime = subscribe(sessionId, event => {
    if (!active || event.data?.sessionId !== sessionId) return;
    eventVersion++;
    switch (event.event) {
      case 'reader.label.updated':
        apply(event.data);
        break;
      case 'reader.scan.product':
        apply({ ...event.data, status: 'awaiting_barcode' });
        break;
      case 'reader.find.proximity':
        apply({ status: 'active', lastProximity: event.data });
        break;
      case 'reader.scan.completed':
      case 'reader.find.completed':
        apply({ ...event.data, status: 'completed' });
        break;
      case 'reader.scan.cancelled':
      case 'reader.find.cancelled':
        apply({ ...event.data, status: event.data.status === 'expired' ? 'expired' : 'cancelled' });
        break;
    }
  }, onError, ready => {
    connected = ready;
    wake();
  });
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  wake();
  return stop;
}
