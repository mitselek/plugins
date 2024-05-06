// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/tailwind.css'],
  devtools: { enabled: false },
  modules: [
    '@vueuse/nuxt'
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  runtimeConfig: {
    public: {
      apiUrl: '',
      esterUrl: ''
    }
  },
  spaLoadingTemplate: false,
  ssr: false
})
