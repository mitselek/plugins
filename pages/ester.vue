<script setup>
import { NButton, NInput, NInputGroup, NTable } from 'naive-ui'

const { query } = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const queryString = ref('')
const isLoading = ref(false)
const esterItems = ref([])

async function doSearch () {
  if (isLoading.value || !queryString.value) return

  isLoading.value = true
  esterItems.value = []

  const url = new URL(runtimeConfig.public.esterUrl)
  url.searchParams.append('f', 'human')
  url.searchParams.append('q', queryString.value)

  const result = await fetch(url.toString())

  isLoading.value = false

  if (!result.ok) {
    console.error('Failed to fetch data from ESTER')
    return
  }

  esterItems.value = await result.json()
}

async function addEsterItem (item) {
  if (!query.account) return
  if (!query.type) return
  if (!query.token) return

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

  const result = await fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${query.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(properties)
  })

  if (!result.ok) {
    error.value = 'Failed to add entity!'

    setTimeout(() => {
      error.value = null
    }, 3000)

    return
  }

  const { _id } = await result.json()

  await navigateTo(`${runtimeConfig.public.entuUrl}/${query.account}/entity/${_id}#edit`, { external: true, open: { target: '_top' } })
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
    class="h-full max-h-full flex justify-center items-center text-red-700 font-bold"
  >
    {{ error }}
  </div>
  <div
    v-else
    class="h-full max-h-full pt-6 mx-auto flex flex-col gap-6"
  >
    <n-input-group class="max-w-80 mx-auto">
      <n-input
        v-model:value="queryString"
        autofocus
        placeholder="Search from ESTER"
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
            <td class="flex justify-between items-center gap-2">
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

              <n-button
                @click="addEsterItem(item)"
              >
                Add
              </n-button>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>
  </div>
</template>
