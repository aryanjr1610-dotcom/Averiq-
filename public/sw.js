/* Averiq service worker: separate caches, bounded runtime caching. */
const VERSION = 'v1'
const SHELL = `averiq-shell-${VERSION}`
const STATIC = `averiq-static-${VERSION}`
const META = `averiq-meta-${VERSION}`
const META_MAX = 60

const SHELL_URLS = ['/', '/index.html']

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => ![SHELL, STATIC, META].includes(key)).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	)
})

const trim = async (name, max) => {
	const cache = await caches.open(name)
	const keys = await cache.keys()
	if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)))
}

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (request.method !== 'GET') return
	const url = new URL(request.url)

	// Never cache auth, AI or write traffic.
	if (url.pathname.includes('/auth/') || url.pathname.includes('/functions/v1/')) return

	// Navigations: network first, shell fallback offline.
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
		return
	}

	// Hashed build assets, fonts, images: cache first.
	if (/\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|glb|gltf)$/.test(url.pathname)) {
		event.respondWith(
			caches.match(request).then(
				(hit) =>
					hit ??
					fetch(request).then((response) => {
						if (response.ok) caches.open(STATIC).then((cache) => cache.put(request, response.clone()))
						return response
					}),
			),
		)
		return
	}

	// Small academic metadata reads: stale-while-revalidate with a bounded cache.
	if (url.pathname.includes('/rest/v1/')) {
		event.respondWith(
			caches.open(META).then(async (cache) => {
				const hit = await cache.match(request)
				const network = fetch(request)
					.then((response) => {
						if (response.ok) {
							cache.put(request, response.clone())
							trim(META, META_MAX)
						}
						return response
					})
					.catch(() => hit)
				return hit ?? network
			}),
		)
	}
})
