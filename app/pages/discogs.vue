<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const items = ref([])
const isLoading = ref(false)
const isAdding = ref(false)

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  items.value = []
  items.value = await $fetch('/api/discogs', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doImport (id) {
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

  isAdding.value = true

  const release = await getRelease(id)

  const properties = [
    { type: '_type', reference: query.type }
  ]

  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

  for (const [key, value] of Object.entries(release)) {
    for (const i of value) {
      properties.push({
        type: key,
        string: i
      })
    }
  }

  const { _id } = await $fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${query.token}` },
    body: properties.filter((x) => x.type && (x.string || x.reference))
  })

  await navigateTo(`${runtimeConfig.public.entuUrl}/${query.account}/${_id}#edit`, { external: true, open: { target: '_top' } })
}

async function getRelease (id) {
  const data = await $fetch(`https://api.discogs.com/releases/${id}`)

  return {
    discogs_id: [data.id],
    year: [data.year],
    artists: [...new Set(data.artists?.map((x) => x.name))],
    series: [...new Set(data.series?.map((x) => x.name))],
    series_number: [...new Set(data.series?.map((x) => x.catno))],
    label: [...new Set(data.labels?.map((x) => x.name))],
    company: [...new Set(data.companies?.map((x) => x.name))],
    format: [...new Set(data.formats?.map((x) => [x.name, ...x.descriptions]).flat())],
    title: [data.title],
    country: [data.country],
    notes: [data.notes],
    barcode: [...new Set(data.identifiers?.filter((x) => x.type.toLowerCase() === 'Barcode')?.map((x) => x.value))],
    genre: [...new Set(data.genres)],
    style: [...new Set(data.styles)]
  }
}

onMounted(() => {
  locale.value = query.locale || 'en'

  if (!query.account) {
    error.value = 'No account parameter!'
    return
  }

  if (!query.type) {
    error.value = 'No type parameter!'
  }

  if (!query.token) {
    error.value = 'No token parameter!'
  }
})
</script>

<template>
  <div
    v-if="error"
    class="flex h-full max-h-full items-center justify-center font-bold text-red-700"
  >
    {{ error }}
  </div>

  <div
    v-else-if="isAdding"
    class="flex h-full max-h-full items-center justify-center"
  >
    <n-spin show />
  </div>

  <div
    v-else
    class="flex h-full max-h-full flex-col gap-6 pt-6"
  >
    <n-input-group class="mx-auto max-w-80">
      <n-input
        v-model:value="queryString"
        autofocus
        :loading="isLoading"
        :placeholder="t('searchInfo')"
        @keyup.enter="doSearch()"
      />

      <n-button
        ghost
        type="primary"
        :disabled="isLoading"
        @click="doSearch()"
      >
        {{ t('search') }}
      </n-button>
    </n-input-group>

    <div class="overflow-auto">
      <n-table
        v-if="items.length > 0"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
      >
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
          >
            <td class="flex items-start justify-between gap-4">
              <img
                :src="item.image"
                class="size-16"
              >

              <div class="grow">
                <a
                  class="font-bold hover:underline"
                  target="_blank"
                  :href="`https://www.discogs.com/release/${item.id}`"
                >
                  {{ item.title }}
                </a>
                <div>
                  {{ item.format?.join(', ') }}
                </div>
                <div class="italic">
                  {{ [item.year, item.country].join(', ') }}
                </div>
                <div>
                  {{ item.label?.join(', ') }}
                </div>
              </div>

              <n-button @click="doImport(item.id)">
                {{ t('import') }}
              </n-button>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>
  </div>
</template>

<i18n lang="yaml">
  en:
    search: Search
    searchInfo: Search from Discogs
    import: Import
  et:
    search: Otsi
    searchInfo: Otsi Discogs-ist
    import: Impordi
</i18n>
