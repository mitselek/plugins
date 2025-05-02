<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const esterItems = ref([])
const isLoading = ref(false)
const isAdding = ref(false)

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true

  esterItems.value = []
  esterItems.value = await $fetch('/api/ester', { query: { q: queryString.value } })

  isLoading.value = false
}

async function doImport (item) {
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

  isAdding.value = true

  const properties = [
    { type: '_type', reference: query.type }
  ]

  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

  for (const [key, value] of Object.entries(item)) {
    for (const i of value) {
      properties.push({
        type: convertType(key),
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

function convertType (type) {
  switch (type) {
    case 'title':
      return 'name'
    case 'isbn':
      return 'isn'
    case 'issn':
      return 'isn'
    default:
      return type.replaceAll('-', '_')
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
        v-if="esterItems.length > 0"
        :bordered="false"
        :bottom-bordered="false"
        :single-line="false"
        :striped="true"
      >
        <tbody>
          <tr
            v-for="item in esterItems"
            :key="item['ester-id']"
          >
            <td class="flex items-center justify-between gap-2">
              <div>
                <div class="font-bold">
                  {{ item.title?.join(', ') }}
                </div>
                <div class="italic">
                  {{ item.subtitle?.join(', ') }}
                </div>
                <div>
                  {{ item.author?.join(', ') }}
                </div>
                <div>
                  {{ [item?.['publishing-place'] || [], ...item?.['publishing-date'] || []]?.join(' ') }}
                </div>
                <div>
                  {{ item?.['isbn']?.join(', ') }}
                </div>
              </div>

              <n-button @click="doImport(item)">
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
    searchInfo: Search from ESTER
    import: Import
  et:
    search: Otsi
    searchInfo: Otsi ESTER-ist
    import: Impordi
  </i18n>
