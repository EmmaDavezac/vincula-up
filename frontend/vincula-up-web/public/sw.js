self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = new URL(event.notification.data?.url || '/solicitudes', self.location.origin).href;
	event.waitUntil((async () => {
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
		for (const client of clients) {
			if ('focus' in client) {
				await client.focus();
				if ('navigate' in client && new URL(client.url).href !== targetUrl) await client.navigate(targetUrl);
				return;
			}
		}
		await self.clients.openWindow(targetUrl);
	})());
});