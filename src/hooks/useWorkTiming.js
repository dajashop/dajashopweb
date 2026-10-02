import { useEffect, useRef, useState } from 'react';
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
  if (runningQueues.has(key)) return runningQueues.get(key);
  const task = (async () => {
    const queue = pendingRequests.get(key) || loadQueue(key);
    pendingRequests.set(key, queue);
    while (Object.keys(queue).length) {
      let failed = false;
      for (const [token, request] of Object.entries(queue)) {
        try {
          await workforceApi.recordSession(request.id, request.body);
          // Drain newer terminal snapshots before a modal unmount stops its timer.
          if (queue[token]?.body.sequence === request.body.sequence) delete queue[token];
        } catch {
          if (queue[token]) queue[token].body.complete = false;
          failed = true;
        }
      }
      writeStoredValue(key, Object.keys(queue).length ? JSON.stringify(queue) : null);
      if (failed) break;
    }
    writeStoredValue(key, Object.keys(queue).length ? JSON.stringify(queue) : null);
  })();
  runningQueues.set(key, task);
  try { await task; } finally { runningQueues.delete(key); }
}

export default function useWorkTiming({ product, draft, reviewContext }) {
  const { user, staffReady } = useAuth();
  const meta = useRef(draft?.workTiming || { id: crypto.randomUUID(), startedAt: new Date().toISOString() });
  const draftProductId = useRef(draft?.savedProductId);
  const initialComplete = useRef(!draft || Boolean(draft.workTiming));
  const controller = useRef(null);
  const [notice, setNotice] = useState('');
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
    if (!complete) setNotice('Početak starog nacrta nije zabeležen; merenje je nepotpuno.');
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
        complete = false;
        body.complete = false;
        setNotice('Evidencija vremena nije potpuna; čuvanje artikla radi normalno.');
      }
      void drain(key).then(() => {
        if (Object.values(queue).some((request) => request.id === meta.current.id)) {
          complete = false;
          setNotice('Evidencija vremena čeka slanje; merenje može biti nepotpuno.');
        }
      });
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
    void drain(key);
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
  return { meta: meta.current, notice,
    interact: () => controller.current?.interact(),
    finish: (id) => controller.current?.finish(id),
    attach: (id) => controller.current?.attach(id),
    close: (keepDraft) => controller.current?.close(keepDraft) };
}
