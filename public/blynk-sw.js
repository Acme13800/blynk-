self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Blynk", {
    body: data.body || "You have a new update.",
    icon: "/blynk-eye.svg",
    badge: "/blynk-eye.svg",
    tag: data.tag || "blynk-update",
    renotify: true,
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  const destination = event.notification.data?.url || "/";
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows[0];
    if (existing) return existing.focus().then(() => existing.navigate(destination));
    return clients.openWindow(destination);
  }));
});
