if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister()));
if (window.caches) caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
document.querySelector("#setup").addEventListener("submit", async event => {
  event.preventDefault();
  const button = document.querySelector("#submit");
  const message = document.querySelector("#message");
  button.disabled = true;
  message.textContent = "Creating your account…";
  try {
    const response = await fetch("/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupKey: document.querySelector("#key").value,
        username: document.querySelector("#username").value,
        password: document.querySelector("#password").value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to create account.");
    location.replace("/login");
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});