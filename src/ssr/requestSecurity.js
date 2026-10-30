// Reject source/config/backup requests before they reach Pages' SPA fallback.
// Decode repeatedly so encoded dotfiles cannot bypass this boundary.
export function isSensitivePath(pathname) {
  let path = pathname;
  for (let i = 0; i < 5; i += 1) {
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return true; }
    if (decoded === path) break;
    path = decoded;
    if (i === 4) return true;
  }
  if ([...path].some(char => char.charCodeAt(0) < 32 || char === '\\')) return true;
  const segments = path.toLowerCase().split('/');
  if (segments.some(segment => segment.startsWith('.') && segment !== '.well-known')) return true;
  if (segments.some(segment => ['node_modules', 'src', 'scripts', 'functions', '__ssr-data'].includes(segment))) return true;
  return /\.(?:sql|sqlite3?|db|bak|backup|old|orig|log|pem|key|p12|pfx|map|toml|ya?ml|tsx?|jsx?|mjs|cjs)$/i.test(path)
    // Only bundled scripts under /assets are public executable source.
    && !/^\/assets\/[^/]+\.(?:js|mjs)$/i.test(path)
    || /\/(?:package(?:-lock)?\.json|AGENTS\.md|vite\.config\.[^/]+|serviceAccount\.json)$/i.test(path);
}

export function hiddenFileResponse(request) {
  return new Response(request.method === 'HEAD' ? null : 'Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
