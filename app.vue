<script setup>
import { NConfigProvider, NGlobalStyle, enUS, etEE, dateEnUS, dateEtEE } from 'naive-ui'

const { query } = useRoute()
const currentLocale = ref(enUS)
const currentDateLocale = ref(dateEnUS)

onMounted(() => {
  if (query.locale === 'et') {
    currentLocale.value = etEE
    currentDateLocale.value = dateEtEE
  }
})
</script>

<template>
  <n-config-provider
    class="h-full"
    inline-theme-disabled
    :locale="currentLocale"
    :date-locale="currentDateLocale"
    :theme-overrides="themeOverrides"
  >
    <nuxt-page />

    <n-global-style />
  </n-config-provider>
</template>
