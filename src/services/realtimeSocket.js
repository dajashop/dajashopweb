import { io } from 'socket.io-client';

export function createRealtimeSocket(url, readAuth) {
  const socket = io(url, {
    path: '/socket.io',
    // A WebSocket keeps all packets on one connection. Polling requires every
    // HTTP request to reach the instance which owns its Engine.IO session.
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    withCredentials: true,
    auth: (callback) => callback(readAuth()),
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
