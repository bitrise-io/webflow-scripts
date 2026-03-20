const MAINTENANCE_PAGE_URL = 'https://webflow-scripts.bitrise.io/maintenance.html';
const MAINTENANCE_END_DATETIME = new Date(Date.UTC(2026, 2, 21, 16, 0, 0)).toUTCString(); // March 21, 2026, 16:00 UTC

const MAINTENANCE_MESSAGE = 'Service under maintenance';
const BYPASS_SECRET = 'purrequest';
const BYPASS_COOKIE = 'maintenance_bypass';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /maintenance.bypass?purrequest -> set bypass cookie
    // /maintenance.bypass?off -> clear bypass cookie
    if (url.pathname === '/maintenance.bypass') {
      if (url.searchParams.has(BYPASS_SECRET)) {
        return new Response('Bypass enabled', {
          headers: {
            'Set-Cookie': `${BYPASS_COOKIE}=${BYPASS_SECRET}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      if (url.searchParams.has('off')) {
        return new Response('Bypass disabled', {
          headers: {
            'Set-Cookie': `${BYPASS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
    }

    // If bypass cookie is set, pass through to origin
    const cookies = request.headers.get('Cookie') || '';
    if (cookies.includes(`${BYPASS_COOKIE}=${BYPASS_SECRET}`)) {
      return fetch(request);
    }

    const accept = request.headers.get('Accept') || '';

    // JSON response for API clients
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ error: MAINTENANCE_MESSAGE }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': MAINTENANCE_END_DATETIME,
        },
      });
    }

    // Plain text response for CLI tools, curl, etc.
    if (!accept.includes('text/html')) {
      return new Response(MAINTENANCE_MESSAGE, {
        status: 503,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': MAINTENANCE_END_DATETIME,
        },
      });
    }

    // HTML response for browsers
    const cache = caches.default;
    let maintenanceHTML;
    const cached = await cache.match(MAINTENANCE_PAGE_URL);

    if (cached) {
      maintenanceHTML = await cached.text();
    } else {
      try {
        const response = await fetch(MAINTENANCE_PAGE_URL);
        maintenanceHTML = await response.text();

        ctx.waitUntil(
          cache.put(
            MAINTENANCE_PAGE_URL,
            new Response(maintenanceHTML, {
              headers: { 'Cache-Control': 'public, max-age=300' },
            }),
          ),
        );
      } catch (err) {
        maintenanceHTML =
          '<html><body><h1>Under maintenance</h1><p>A quick tune-up is in progress. Faster builds on the way.</p></body></html>';
      }
    }

    return new Response(maintenanceHTML, {
      status: 503,
      headers: {
        'Content-Type': 'text/html',
        'Retry-After': MAINTENANCE_END_DATETIME,
      },
    });
  },
};
