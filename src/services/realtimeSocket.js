import { io } from 'socket.io-client';
import { resumeAuthSession } from './apiClient.js';

export function createRealtimeSocket(url, readAuth) {
  const socket = io(url, {
    path: '/socket.io',
    // A WebSocket keeps all packets on one connection. Polling requires every
    // HTTP request to reach the instance which owns its Engine.IO session.
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    withCredentials: true,
    auth: (callback) => {
      const initial = readAuth();
      if (initial.publicCatalog === true) {
        callback(initial);
        return;
      }
      // A persistent socket now expires with its access token. Renew before
      // reconnecting, so idle authenticated tabs can recover securely.
      Promise.resolve(resumeAuthSession()).then(() => callback(readAuth())).catch(() => callback({}));
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });

  const resume = () => {
    // `active` excludes intentional cleanup and rejected authentication.
    if (socket.active && !socket.connected && navigator.onLine !== false) {
      socket.connect();
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') resume();
  };
  const cleanup = () => {
    window.removeEventListener('online', resume);
    document.removeEventListener('visibilitychange', onVisibility);
    socket.off('disconnect', onDisconnect);
  };
  const onDisconnect = (reason) => {
    if (reason === 'io client disconnect' || reason === 'io server disconnect') cleanup();
  };
  window.addEventListener('online', resume);
  document.addEventListener('visibilitychange', onVisibility);
  socket.on('disconnect', onDisconnect);
  // close() may be called before the first successful connection, when there
  // is no disconnect event. Manager.close is emitted in that case as well.
  socket.io.on('close', () => {
    if (!socket.active) cleanup();
  });
  return socket;
}
