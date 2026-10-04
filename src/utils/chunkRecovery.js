let reloadStarted = false;
const RELOAD_KEY = 'daja-chunk-reload-at';

export function isChunkLoadError(error) {
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .* failed|unable to preload css/i.test(error?.message || String(error));
}

export function recoverChunkLoad(error) {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return false;
  if (reloadStarted) return true;
  if (navigator.onLine === false) return false;
  try {
    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY));
    // Persist across reloads so a broken release never causes a reload loop.
    if (lastReload && now - lastReload < 60000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Without persistent protection, leave recovery to the visible button.
    return false;
  }
  reloadStarted = true;
  window.location.reload();
  return true;
}
