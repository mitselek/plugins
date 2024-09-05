<script setup>
import jschardet from 'jschardet'
import { parse } from 'papaparse'
import { NButton, NCheckbox, NForm, NFormItem, NSelect, NSpin, NUpload, NUploadDragger } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref()
const csvContent = ref()
const file = ref()
const encoding = ref('utf-8')
const encodingOptions = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'ascii', label: 'ASCII' },
  { value: 'big5', label: 'Big5' },
  { value: 'euc-jp', label: 'EUC-JP' },
  { value: 'euc-kr', label: 'EUC-KR' },
  { value: 'gb18030', label: 'gb18030' },
  { value: 'gbk', label: 'GBK' },
  { value: 'ibm866', label: 'IBM866' },
  { value: 'iso-2022-jp', label: 'ISO-2022-JP' },
  { value: 'iso-8859-10', label: 'ISO-8859-10' },
  { value: 'iso-8859-13', label: 'ISO-8859-13' },
  { value: 'iso-8859-14', label: 'ISO-8859-14' },
  { value: 'iso-8859-15', label: 'ISO-8859-15' },
  { value: 'iso-8859-16', label: 'ISO-8859-16' },
  { value: 'iso-8859-2', label: 'ISO-8859-2' },
  { value: 'iso-8859-3', label: 'ISO-8859-3' },
  { value: 'iso-8859-4', label: 'ISO-8859-4' },
  { value: 'iso-8859-5', label: 'ISO-8859-5' },
  { value: 'iso-8859-6', label: 'ISO-8859-6' },
  { value: 'iso-8859-7', label: 'ISO-8859-7' },
  { value: 'iso-8859-8', label: 'ISO-8859-8' },
  { value: 'iso-8859-8-I', label: 'ISO-8859-8-I' },
  { value: 'koi8-r', label: 'KOI8-R' },
  { value: 'koi8-u', label: 'KOI8-U' },
  { value: 'macintosh', label: 'macintosh' },
  { value: 'shift_jis', label: 'Shift_JIS' },
  { value: 'utf-16be', label: 'UTF-16BE' },
  { value: 'utf-16le', label: 'UTF-16LE' },
  { value: 'windows-1250', label: 'windows-1250' },
  { value: 'windows-1251', label: 'windows-1251' },
  { value: 'windows-1252', label: 'windows-1252' },
  { value: 'windows-1253', label: 'windows-1253' },
  { value: 'windows-1254', label: 'windows-1254' },
  { value: 'windows-1255', label: 'windows-1255' },
  { value: 'windows-1256', label: 'windows-1256' },
  { value: 'windows-1257', label: 'windows-1257' },
  { value: 'windows-1258', label: 'windows-1258' },
  { value: 'windows-874', label: 'windows-874' },
  { value: 'x-mac-cyrillic', label: 'x-mac-cyrillic' }
]
const propertyOptions = ref([])
const selectedProperties = ref([])
const importing = ref(false)

const allChecked = computed({
  get: () => {
    return csvContent.value?.every(x => x.selected)
  },
  set: (value) => {
    csvContent.value?.filter(x => !x._id)?.forEach((x) => { x.selected = value })
  }
})

const someChecked = computed(() => csvContent.value?.filter(x => !x._id)?.some(x => x.selected) && !allChecked.value)
watch(file, (value) => {
  if (!value) return

  const reader = new FileReader()

  reader.onload = (e) => {
    const text = new TextDecoder().decode(e.target.result)
    encoding.value = jschardet.detect(text).encoding
  }

  reader.readAsArrayBuffer(value)
})

const checkedCount = computed(() => csvContent.value?.filter(x => !x._id).filter(x => x.selected)?.length || 0)

watch([file, encoding], ([fileValue, encodingValue]) => {
  if (!fileValue) return

  const reader = new FileReader()

  reader.onload = (e) => {
    parse(e.target.result, {
      complete: ({ data }) => { parseCsv(data) },
      dynamicTyping: true,
      skipEmptyLines: 'greedy'
    })
  }

  reader.readAsText(fileValue, encodingValue)
})

async function getTypes () {
  const params = new URLSearchParams({
    '_parent.reference': query.type,
    '_type.string': 'property',
    props: ['name', 'label', 'type', 'ordinal'].join(',')
  })
  const result = await fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${query.token}`
    }
  })

  if (!result.ok) {
    console.error('Failed to fetch types')
    return
  }

  const { entities } = await result.json()

  if (!entities.length) {
    console.error('No types')
    return
  }

  propertyOptions.value = entities.map(x => ({
    value: getValue(x.name, locale.value),
    label: getValue(x.label, locale.value),
    type: getValue(x.type, locale.value),
    ordinal: getValue(x.ordinal, locale.value, 'number')
  })).sort((a, b) => a.ordinal - b.ordinal)
}

function csvUpload (data) {
  file.value = data.file?.file
}

function parseCsv (data) {
  const colsCount = Math.max(...data.map(x => x.length))
  const dataCols = []

  for (let i = 0; i < colsCount; i++) {
    if (data.map(x => x[i]).some(Boolean)) {
      dataCols.push(i)
    }
  }

  csvContent.value = data.map(x => ({
    selected: true,
    data: dataCols.map(i => x[i])
  }))
}

function convertValue (datatype, value) {
  switch (datatype) {
    case 'boolean':
      return !!value
    case 'date':
      return new Date(value).toISOString()
    case 'datetime':
      return new Date(value).toISOString()
    case 'string':
      return `${value}`
    case 'reference':
      return `${value}`
    default:
      return value
  }
}

async function doImport () {
  importing.value = true

  const entities = []

  csvContent.value.forEach((row, index) => {
    if (row._id) return
    if (!row.selected) return

    const properties = [
      { type: '_type', reference: query.type }
    ]

    if (query.parent) {
      properties.push({ type: '_parent', reference: query.parent })
    }

    row.data.forEach((value, i) => {
      const property = selectedProperties.value[i]

      if (!property) return

      const datatype = propertyOptions.value.find(x => x.value === property)?.type

      if (!datatype) return

      if (value === null || value === undefined) return

      properties.push({ type: property, [datatype]: convertValue(datatype, value) })
    })

    entities.push({ index, properties })
  })

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]

    const result = await fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${query.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entity.properties)
    })

    if (!result.ok) {
      error.value = 'Failed to add entity!'

      setTimeout(() => {
        error.value = null
      }, 3000)

      return
    }

    const { _id } = await result.json()

    csvContent.value[entity.index]._id = _id
  }

  importing.value = false
}

onMounted(() => {
  if (query.locale) {
    locale.value = query.locale
  }

  if (!query.account) {
    error.value = t('errorNoAccount')
    return
  }

  if (!query.type) {
    error.value = t('errorNoType')
  }

  if (!query.token) {
    error.value = t('errorNoToken')
  }

  getTypes()
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
    class="h-full max-h-full p-6 flex flex-col gap-6 overflow-auto"
  >
    <n-upload
      v-if="!importing"
      :custom-request="csvUpload"
      :show-file-list="false"
    >
      <n-upload-dragger
        class="flex flex-col justify-center items-center gap-2 rounded-none"
        :class="{ 'h-96': !file }"
      >
        {{ t('uploadText') }}

        <div
          v-if="file"
          class="font-bold"
        >
          {{ file.name }}
        </div>
      </n-upload-dragger>
    </n-upload>

    <table
      v-if="csvContent"
      class="w-full"
    >
      <thead v-if="!importing">
        <tr>
          <th
            class="p-3 pb-1 text-center font-normal"
            :colspan="csvContent.at(0).data.length + 1"
          >
            {{ t('fieldInfo') }}
          </th>
        </tr>

        <tr>
          <th class="p-3 text-left bg-gray-100">
            <n-checkbox
              v-model:checked="allChecked"
              :indeterminate="someChecked"
            />
          </th>
          <th
            v-for="(column, index) in csvContent.at(0).data"
            :key="index"
            class="p-3 text-left bg-gray-100"
            :title="column"
          >
            <n-select
              v-model:value="selectedProperties[index]"
              class="w-full"
              clearable
              searchable
              :options="propertyOptions"
            />
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, rowIndex) in csvContent"
          :key="rowIndex"
          class="group border-t border-gray-200 hover:bg-gray-50"
        >
          <td class="p-3">
            <n-checkbox
              v-model:checked="row.selected"
              :disabled="!!row._id"
            />
          </td>
          <td
            v-for="(column, columnIndex) in row.data"
            :key="columnIndex"
            class="p-3 text-sm"
          >
            {{ column }}
          </td>
        </tr>
      </tbody>
    </table>

    <n-form
      v-if="file && !importing"
      :show-feedback="false"
    >
      <n-form-item :label="t('encoding')">
        <n-select
          v-model:value="encoding"
          filterable
          :options="encodingOptions"
        />
      </n-form-item>
    </n-form>

    <div class="w-full flex justify-center">
      <n-button
        v-if="csvContent?.length && !importing"
        class="block"
        type="primary"
        :disabled="checkedCount === 0"
        @click="doImport()"
      >
        {{ t('import', checkedCount || 0) }}
      </n-button>
      <div
        v-else-if="importing"
        class="h-full max-h-full flex justify-center items-center"
      >
        <n-spin show />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
  en:
    errorNoAccount: No account parameter!
    errorNoType: No type parameter!
    errorNoToken: No token parameter!
    uploadText: Click or drag a CSV file to this area to upload.
    encoding: 'Encoding (if you see strange characters in the table, try changing the file encoding):'
    fieldInfo: Choose which rows to import and what column corresponds to which property.
    import: Import | Import {n} rows | Import {n} rows
  et:
    errorNoAccount: Puudub parameeter "account"!
    errorNoType: Puudub parameeter "type"!
    errorNoToken: Puudub parameeter "token"!
    uploadText: Lohista CSV fail siia või klõpsa siin, et fail valida.
    encoding: 'Faili kodeering (kui tabeli tekstis on veidrad märgid, proovi muuta faili kodeeringut):'
    fieldInfo: Vali mis read importida ja milline veerg vastab millisele parameetrile.
    import: Impordi | Impordi {n} rida | Impordi {n} rida
</i18n>
