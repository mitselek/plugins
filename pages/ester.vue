<script setup>
import { NButton, NInput, NInputGroup, NTable } from 'naive-ui'

const runtimeConfig = useRuntimeConfig()
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
  console.log('Adding ESTER item', item)
}
</script>

<template>
  <div class="h-full max-h-full pt-6 mx-auto flex flex-col gap-6">
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
