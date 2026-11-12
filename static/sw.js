/**
 * IRA MEDIA CONCEPTS - Work Report System Service Worker
 * - Caches only essential public static assets and the offline fallback page.
 * - Never caches API responses, auth endpoints, exports, or private HTML pages.
 */

const CACHE_VERSION = 'ira-pwa-v5';
const STATIC_CACHE = `ira-static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

const PRECACHE_ASSETS = [
    '/static/style.css',
    '/static/script.js?v=1.0.5',
    '/static/location.js?v=1.0.0',
    '/static/pwa.js?v=1.0.0',
    '/static/images/logo.png',
    '/static/images/icon-192.png',
    '/static/images/icon-512.png',
    '/static/images/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);
            await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
            await Promise.allSettled(
                PRECACHE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
            );
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheKeys = await caches.keys();
            await Promise.all(
                cacheKeys
                    .filter((key) => key !== STATIC_CACHE)
                    .map((key) => caches.delete(key))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Never intercept non-GET requests (logins, report submissions, uploads, deletes)
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Never intercept cross-origin requests (e.g., geolocation reverse geocoding, fonts, CDNs)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Never cache or interfere with APIs, auth endpoints, downloads, or service worker files
    if (
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/download/') ||
        url.pathname === '/login' ||
        url.pathname === '/logout' ||
        url.pathname === '/auto-logout' ||
        url.pathname === '/sw.js' ||
        url.pathname === '/manifest.webmanifest'
    ) {
        return;
    }

    // Navigation requests: network-only (no caching of private pages) with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(STATIC_CACHE);
                const offlineResponse = await cache.match(OFFLINE_URL);
                if (offlineResponse) {
                    return offlineResponse;
                }
                return new Response(
                    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - IRA Work Reports</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;"><h1>You\'re Offline</h1><p>You\'re currently offline. Please check your internet connection.</p><button onclick="location.reload()">Retry</button></body></html>',
                    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                );
            })
        );
        return;
    }

    // Static assets: Stale-While-Revalidate
    if (url.pathname.startsWith('/static/')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(STATIC_CACHE);
                const cached = await cache.match(request);

                const networkFetch = fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => null);

                if (cached) {
                    event.waitUntil(networkFetch);
                    return cached;
                }

                const fresh = await networkFetch;
                return fresh || new Response('', { status: 504, statusText: 'Gateway Timeout' });
            })()
        );
    }
});

