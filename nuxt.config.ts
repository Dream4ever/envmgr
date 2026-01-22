export default defineNuxtConfig({
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
