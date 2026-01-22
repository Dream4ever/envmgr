export default defineNuxtConfig({
  // Keep Nuxt 3-style root srcDir while on Nuxt 4
  srcDir: ".",
  // Required when using root srcDir to avoid conflicts with reserved app/ dir
  dir: {
    app: "app"
  },
  css: ["~/assets/main.css"],
  devtools: { enabled: true },
  typescript: {
    strict: true
  },
  nitro: {
    routeRules: {
      "/api/**": { cors: true }
    }
  }
});
