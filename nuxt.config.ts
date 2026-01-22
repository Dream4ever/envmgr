export default defineNuxtConfig({
  // Nuxt 4 default: app/ is the srcDir
  srcDir: "app",
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
