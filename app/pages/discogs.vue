<script setup>
import { NButton, NInput, NInputGroup, NSpin, NTable } from 'naive-ui'

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

  console.log(properties.filter((x) => Boolean(x.type)))

  return

  const { _id } = await $fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${query.token}` },
    body: properties.filter((x) => Boolean(x.type))
  })

  await navigateTo(`${runtimeConfig.public.entuUrl}/${query.account}/${_id}#edit`, { external: true, open: { target: '_top' } })
}

function convertType (type) {
  switch (type) {
    case 'title':
      return 'name'
    case 'url':
      return undefined
    case 'image':
      return undefined
    default:
      return type.replaceAll('-', '_')
  }
}

onMounted(() => {
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
        placeholder="Search from Discogs"
        :loading="isLoading"
        @keyup.enter="doSearch()"
      />

      <n-button
        ghost
        type="primary"
        :disabled="isLoading"
        @click="doSearch()"
      >
        Search
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
            :key="item.release_id?.at(0)"
          >
            <td class="flex items-start justify-between gap-4">
              <img
                :src="item.image?.at(0)"
                class="size-16"
              >

              <div class="grow">
                <a
                  class="font-bold hover:underline"
                  :href="item.url?.at(0)"
                  target="_blank"
                >
                  {{ item.title?.join(', ') }}
                </a>
                <div>
                  {{ item.format?.join(', ') }}
                </div>
                <div class="italic">
                  {{ [...item.year || [], ...item.country || []].join(', ') }}
                </div>
                <div>
                  {{ item.label?.join(', ') }}
                </div>
              </div>

              <n-button @click="doImport(item)">
                Add
              </n-button>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>
  </div>
</template>
