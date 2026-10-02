import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { workforceApi } from '../services/dajaPlatform';
import { getStaffAccessToken } from '../services/apiClient';
import { readStoredValue, writeStoredValue } from '../services/consentStorage';

const pendingRequests = new Map();
const runningQueues = new Map();
function loadQueue(key) {
  try {
    const value = JSON.parse(readStoredValue(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
async function drain(key) {
  const running = runningQueues.get(key);
  if (running) {
    const failed = await running;
    // A terminal snapshot may arrive as the previous drain is finishing.
    // Send it before this caller completes, including after modal unmount.
    if (!failed && Object.keys(pendingRequests.get(key) || {}).length) return drain(key);
    return;
  }
  // Register the running drain before it inspects the queue. A flush in the
  // same turn must never join an empty, already-resolved drain.
  const task = Promise.resolve().then(async () => {
    const queue = pendingRequests.get(key) || loadQueue(key);
    pendingRequests.set(key, queue);
    let blocked = false;
    while (Object.keys(queue).length) {
      let failed = false;
      for (const [token, request] of Object.entries(queue)) {
        try {
          await workforceApi.recordSession(request.id, request.body);
          // Drain newer terminal snapshots before a modal unmount stops its timer.
          if (queue[token]?.body.sequence === request.body.sequence) delete queue[token];
        } catch {
          // A transport failure is pending delivery, not proof of lost time.
          // The backend determines completeness from accepted heartbeat gaps.
          failed = true;
        }
      }
      writeStoredValue(key, Object.keys(queue).length ? JSON.stringify(queue) : null);
      if (failed) { blocked = true; break; }
    }
    writeStoredValue(key, Object.keys(queue).length ? JSON.stringify(queue) : null);
    return blocked;
  });
  runningQueues.set(key, task);
  try { await task; } finally { runningQueues.delete(key); }
}

export default function useWorkTiming({ product, draft, reviewContext }) {
  const { user, staffReady } = useAuth();
  const meta = useRef(draft?.workTiming || { id: crypto.randomUUID(), startedAt: new Date().toISOString() });
  const draftProductId = useRef(draft?.savedProductId);
  const initialComplete = useRef(!draft || Boolean(draft.workTiming));
  const controller = useRef(null);
  const userKey = user?.id || user?.uid || user?.email;
  const isReview = Boolean(reviewContext);
  useEffect(() => {
    if (!userKey || !staffReady) return;
    let identity;
    try {
      const encoded = getStaffAccessToken().split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      identity = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      if (!identity.sub || !identity.org) return;
    } catch { return; }
    const key = `daja_work_timing_queue:${identity.org}:${identity.sub}`;
    const ownerId = crypto.randomUUID();
    const kind = isReview ? 'review' : product?.id ? 'edit' : 'create';
    let activeSeconds = 0;
    let sequence = 0;
    let complete = initialComplete.current;
    let terminal = false;
    let lastTick = Date.now();
    let lastInput = lastTick;
    let currentProductId = product?.id || draftProductId.current;
    let focused = document.hasFocus() && document.visibilityState === 'visible';
    const eligible = () => focused && Date.now() - lastInput < 300_000;
    const settle = () => {
      const now = Date.now();
      if (focused) activeSeconds += Math.max(0, Math.min(now, lastInput + 300_000) - lastTick) / 1000;
      lastTick = now;
    };
    const flush = (status = 'open', productId, finishedAt, release = false) => {
      settle();
      const body = { ownerId, actorUserId: identity.sub, organizationId: identity.org, sequence: ++sequence, startedAt: meta.current.startedAt,
        kind, activeSeconds, eligible: !release && status === 'open' && eligible(), complete, status,
        ...(productId || currentProductId ? { productId: productId || currentProductId } : {}),
        ...(finishedAt ? { finishedAt } : {}) };
      const queue = pendingRequests.get(key) || loadQueue(key);
      queue[`${meta.current.id}:${ownerId}`] = { id: meta.current.id, body };
      pendingRequests.set(key, queue);
      if (!writeStoredValue(key, JSON.stringify(queue))) {
        // Without durable replay, a closed/offline tab can lose measurements.
        // Keep that uncertainty in admin statistics, never in the worker form.
        complete = false;
        body.complete = false;
      }
      void drain(key);
    };
    const interact = () => { if (!terminal) { settle(); lastInput = Date.now(); } };
    const focusChanged = () => {
      if (terminal) return;
      settle();
      focused = document.hasFocus() && document.visibilityState === 'visible';
      flush();
    };
    controller.current = {
      interact,
      attach: (id) => { currentProductId = id; },
      finish: (productId) => {
        if (terminal) return;
        flush('completed', productId, new Date().toISOString(), true);
        terminal = true;
      },
      close: (keepDraft) => {
        if (terminal) return;
        flush(keepDraft ? 'open' : 'abandoned', undefined, keepDraft ? undefined : new Date().toISOString(), true);
        terminal = true;
      }
    };
    // Queue replay is independent of the product save operation.
    flush();
    const timer = window.setInterval(() => { if (!terminal) flush(); else void drain(key); }, 30_000);
    const pageHide = () => { if (!terminal) flush('open', undefined, undefined, true); };
    const online = () => { if (!terminal) flush(); else void drain(key); };
    window.addEventListener('focus', focusChanged);
    window.addEventListener('blur', focusChanged);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', focusChanged);
    return () => {
      if (!terminal) flush('open', undefined, undefined, true);
      window.clearInterval(timer);
      window.removeEventListener('focus', focusChanged);
      window.removeEventListener('blur', focusChanged);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', focusChanged);
      controller.current = null;
    };
  }, [userKey, staffReady, product?.id, isReview]);
  return { meta: meta.current,
    interact: () => controller.current?.interact(),
    finish: (id) => controller.current?.finish(id),
    attach: (id) => controller.current?.attach(id),
    close: (keepDraft) => controller.current?.close(keepDraft) };
}
