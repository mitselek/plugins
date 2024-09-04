<script setup>
import jschardet from 'jschardet'
import { parse } from 'papaparse'
import { NButton, NForm, NFormItem, NInputNumber, NUpload, NUploadDragger, NSelect, NSpin, NTable } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()

const error = ref()
const csvContent = ref()
const file = ref()
const encoding = ref('utf-8')
const encodingsOptions = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'windows-1257', label: 'Windows-1257' }
]
const fieldOptions = ref([
  { value: '', label: '' }
])
const fields = ref([])
const skipLines = ref(0)
const importing = ref(false)

watch(file, (value) => {
  if (!value) return

  const reader = new FileReader()

  reader.onload = (e) => {
    const text = new TextDecoder().decode(e.target.result)
    encoding.value = jschardet.detect(text).encoding
  }

  reader.readAsArrayBuffer(value)
})

watch([file, encoding, skipLines], ([fileValue, encodingValue, skipLinesValue]) => {
  if (!fileValue) return

  const reader = new FileReader()

  reader.onload = (e) => {
    parse(e.target.result, {
      complete: ({ data }) => { parseCsv(data, skipLinesValue) },
      dynamicTyping: true,
      skipEmptyLines: 'greedy'
    })
  }

  reader.readAsText(fileValue, encodingValue)
})

function csvUpload (data) {
  file.value = data.file?.file
}

function parseCsv (data, skipLines) {
  const rows = data.slice(skipLines)
  const colsCount = Math.max(...rows.map(x => x.length))
  const dataCols = []

  for (let i = 0; i < colsCount; i++) {
    if (rows.map(x => x[i]).some(Boolean)) {
      dataCols.push(i)
    }
  }

  csvContent.value = rows.map(x => dataCols.map(i => x[i]))
}

function doImport () {
  importing.value = true

  setTimeout(() => {
    importing.value = false
  }, 10000)
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
        class="flex flex-col justify-center items-center gap-"
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

    <n-form
      v-if="file && !importing"
      class="flex flex-col gap-6"
      label-placement="left"
      label-width="auto"
      :show-feedback="false"
    >
      <n-form-item
        class="m-0"
        :label="t('encoding')"
      >
        <div class="w-full">
          <n-select
            v-model:value="encoding"
            class="w-full"
            :options="encodingsOptions"
          />
          <p class="mt-1 text-sm text-gray-500">
            {{ t('encodingInfo') }}
          </p>
        </div>
      </n-form-item>

      <n-form-item
        class="m-0"
        :label="t('skipLines')"
      >
        <div class="w-full">
          <n-input-number
            v-model:value="skipLines"
            class="w-full"
            :min="0"
            :step="1"
          />
          <p class="mt-1 text-sm text-gray-500">
            {{ t('skipLinesInfo') }}
          </p>
        </div>
      </n-form-item>
    </n-form>

    <n-table
      v-if="csvContent"
      :bordered="false"
      :bottom-bordered="false"
    >
      <thead v-if="!importing">
        <tr>
          <th
            class="!pb-0 text-sm !text-center text-gray-500 !font-normal !border-0"
            :colspan="csvContent.at(0).length"
          >
            {{ t('fieldInfo') }}
          </th>
        </tr>
        <tr>
          <th
            v-for="(column, index) in csvContent.at(0)"
            :key="index"
            :title="column"
          >
            <n-select
              v-model:value="fields[index]"
              class="w-full"
              clearable
              :options="fieldOptions"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, rowIndex) in csvContent"
          :key="rowIndex"
        >
          <td
            v-for="(column, columnIndex) in row"
            :key="columnIndex"
          >
            {{ column }}
          </td>
        </tr>
      </tbody>
    </n-table>

    <div class="w-full flex justify-center">
      <n-button
        v-if="csvContent?.length && !importing"
        class="block"
        type="primary"
        :disabled="!fields.some(Boolean)"
        @click="doImport()"
      >
        {{ t('import', csvContent?.length || 0) }}
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
    encoding: Encoding
    encodingInfo: If you see strange characters in the table below, try changing the file encoding.
    skipLines: Skip first lines
    skipLinesInfo: If the CSV file has headers, skip those lines.
    fieldInfo: Choose which column corresponds to which data field.
    import: Import | Import {n} rows | Import {n} rows
  et:
    errorNoAccount: Puudub parameeter "account"!
    errorNoType: Puudub parameeter "type"!
    errorNoToken: Puudub parameeter "token"!
    uploadText: Lohista CSV fail siia või klõpsa siin, et fail valida.
    encoding: Faili kodeering
    encodingInfo: Kui näed allpool olevas tabelis veidraid märke, proovi muuta faili kodeeringut.
    skipLines: Jäta esimesed read vahele
    skipLinesInfo: Kui CSV failis on päiseid, siis jäta need read vahele.
    fieldInfo: Vali mis veerg millise andmeväljaga seostub.
    import: Impordi | Impordi {n} rida | Impordi {n} rida
</i18n>
