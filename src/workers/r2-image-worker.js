const IMAGE_PREFIX = 'images/';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function normalizePath(pathname) {
  return pathname.replace(/^\/+/, '');
}

function getObjectKey(pathname) {
  const normalized = normalizePath(pathname);
  if (!normalized.startsWith(IMAGE_PREFIX)) return null;
  const key = normalized.slice(IMAGE_PREFIX.length);
  return key || null;
}

function getCorsHeaders() {
  return {
    // Product images are public. A fixed wildcard header prevents a cached
    // no-Origin response from being reused by a CORS request (e.g. QR tools).
    'Access-Control-Allow-Origin': '*',
  };
}

function isAuthorized(request, env) {
  const reqToken = request.headers.get('X-Auth-Token');
  const authToken = env.R2_AUTH_TOKEN;
  return !!authToken && reqToken === authToken;
}

function cacheHeaders() {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const corsHeaders = getCorsHeaders();

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (!url.pathname.startsWith('/images/')) {
      return json({ success: false, error: 'Not found' }, 404);
    }

    const objectKey = getObjectKey(url.pathname);
    if (!objectKey) {
      return json({ success: false, error: 'Invalid image key' }, 400);
    }

    if (method === 'GET') {
      const object = await env.DAJASHOP_IMAGES.get(objectKey);
      if (!object) {
        return json({ success: false, error: 'Image not found' }, 404, {
          ...corsHeaders,
        });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set(
        'Content-Type',
        object.httpMetadata?.contentType || 'image/webp',
      );
      const cc = cacheHeaders();
      headers.set('Cache-Control', cc['Cache-Control']);

      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(object.body, {
        status: 200,
        headers,
      });
    }

    if (method === 'PUT') {
      if (!isAuthorized(request, env)) {
        return json({ success: false, error: 'Unauthorized' }, 401);
      }

      const body = await request.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return json({ success: false, error: 'Body is empty' }, 400);
      }

      const contentType = request.headers.get('Content-Type') || 'image/webp';

      await env.DAJASHOP_IMAGES.put(objectKey, body, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      return json({
        success: true,
        key: `images/${objectKey}`,
        url: `${url.origin}/images/${objectKey}`,
      });
    }

    if (method === 'DELETE') {
      if (!isAuthorized(request, env)) {
        return json({ success: false, error: 'Unauthorized' }, 401);
      }

      const isPrefixDelete = objectKey.endsWith('*');

      if (!isPrefixDelete) {
        await env.DAJASHOP_IMAGES.delete(objectKey);
        return json({ success: true, deleted: [objectKey] });
      }

      const prefix = objectKey.slice(0, -1);
      const deleted = [];

      let cursor;
      do {
        const list = await env.DAJASHOP_IMAGES.list({
          prefix,
          cursor,
          limit: 1000,
        });

        if (list.objects.length > 0) {
          await Promise.all(
            list.objects.map(async (obj) => {
              await env.DAJASHOP_IMAGES.delete(obj.key);
              deleted.push(obj.key);
            }),
          );
        }

        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);

      return json({ success: true, deleted });
    }

    return json({ success: false, error: 'Method not allowed' }, 405);
  },
};
