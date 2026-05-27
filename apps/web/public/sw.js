/**
 * Push Notification Service Worker — MVP
 * Handles push events and notification clicks only
 */

self.addEventListener("push", function (event) {
  console.log("[SW] Push event received", event.data ? "with data" : "no data");
  if (!event.data) {
    console.warn("[SW] Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[SW] Push data:", data.title);

    const options = {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: data.tag || "general",
      requireInteraction: false,
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(
      self.registration
        .showNotification(data.title, options)
        .then(() => console.log("[SW] Notification shown"))
        .catch((err) => console.error("[SW] showNotification failed:", err)),
    );
  } catch (error) {
    console.error("[SW] Push error:", error);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});

self.addEventListener("install", function () {
  self.skipWaiting();
});
