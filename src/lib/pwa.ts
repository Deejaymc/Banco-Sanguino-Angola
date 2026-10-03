// Single, guarded service-worker registration point. Never registers in dev,
// iframes or Lovable preview hosts; `?sw=off` unregisters the app worker.
const SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (blocked.some((d) => h === d || h.endsWith(`.${d}`))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) =>
        [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith(SW_PATH)),
      )
      .map((r) => r.unregister()),
  );
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    if (isRefusedContext()) {
      await unregisterAppWorkers();
      return;
    }
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch (e) {
    console.warn("SW registration failed", e);
  }
}
