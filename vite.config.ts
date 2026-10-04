// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false, // served statically from public/manifest.webmanifest
        filename: "sw.js",
        devOptions: { enabled: false },
        workbox: {
          // Only same-origin static build assets + icons. Never cache HTML, navigations,
          // Supabase/API responses, OAuth callbacks, or authenticated user data.
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}"],
          globIgnores: ["**/server/**", "**/_worker.js/**"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname),
              handler: "CacheFirst",
              options: { cacheName: "static-assets", expiration: { maxEntries: 200 } },
            },
          ],
        },
      }),
    ],
  },
});
