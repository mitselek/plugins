// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-04',
  devtools: { enabled: false },
  eslint: {
    config: {
      autoInit: false,
      stylistic: true
    }
  },
  future: {
    compatibilityVersion: 4
  },
  i18n: {
    vueI18n: '~~/.config/i18n.config.ts'
  },
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt'
  ],
  runtimeConfig: {
    public: {
      entuUrl: '',
      esterUrl: ''
    }
  },
  spaLoadingTemplate: false,
  ssr: false,
  tailwindcss: {
    cssPath: '~/assets/tailwind.css',
    configPath: '~~/.config/tailwind.config.ts'
  }
})
