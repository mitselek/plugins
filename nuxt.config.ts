// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-04',
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
      entuUrl: '',
      esterUrl: ''
    }
  },
  spaLoadingTemplate: false,
  ssr: false
})
