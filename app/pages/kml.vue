<script setup>
/*
  KML Import Plugin Script

  Handles browser-based KML file parsing and entity creation in Entu.
  Architecture: Client-side processing with direct API calls to Entu.
*/

import TurndownService from 'turndown'
import { marked } from 'marked'
import { NUpload, NUploadDragger, NSpin, NCheckbox, NButton, NProgress } from 'naive-ui'
import MyIcon from '../components/my/icon.vue'

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const { query } = useRoute()

const STEPS = {
  UPLOAD: 'upload',
  REVIEW: 'review'
}

const ANIMATION_DURATIONS = {
  BUTTON_LOCK: 500,
  TOGGLE_PAUSE_LOCK: 100
}

const CONTENT_LIMITS = {
  MAX_DESCRIPTION_LENGTH: 20000,
  MAX_DESCRIPTION_HEIGHT: 384
}

const COORDINATE_VALIDATION = {
  COORDINATE_PRECISION: 6
}

const step = ref(STEPS.UPLOAD)
const selectedFile = ref(null)
const locations = ref([])
const parsing = ref(false)
const importing = ref(false)
const paused = ref(false)
const error = ref('')
const buttonLock = ref(false)
const importProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  pendingLocations: null
})

const importResults = ref({
  success: [],
  errors: [],
  stopped: false,
  skipped: 0
})

const hasSelectedLocations = computed(() =>
  locations.value.some((location) => location.selected)
)

const selectedCount = computed(
  () => locations.value.filter((location) => location.selected).length
)

const selectableLocationsInfo = computed(() => {
  const selectableLocations = locations.value.filter((location) => !location.imported)
  const selectedSelectableCount = selectableLocations.filter((location) => location.selected).length

  return {
    total: selectableLocations.length,
    selected: selectedSelectableCount
  }
})

const masterCheckboxState = computed(() => {
  const { total, selected } = selectableLocationsInfo.value

  if (selected === 0) {
    return { checked: false, indeterminate: false }
  }
  else if (selected === total) {
    return { checked: true, indeterminate: false }
  }
  else {
    return { checked: false, indeterminate: true }
  }
})

onMounted(async () => {
  if (!query.account) {
    error.value = t('errorNoAccount')
    return
  }

  if (!query.token) {
    error.value = t('errorNoToken')
    return
  }

  if (!query.type) {
    error.value = t('errorNoType')
    return
  }
})

function convertToMarkdown (description) {
  if (!description) return ''

  const htmlContent = extractHtmlContent(description)
  if (!htmlContent) return ''

  const turndownService = createTurndownService()
  let markdown = turndownService.turndown(htmlContent)

  markdown = cleanupMarkdown(markdown)
  markdown = convertUrlsToMarkdownLinks(markdown)

  return markdown
}

/**
 * Converts markdown text to HTML for safe display
 */
function convertMarkdownToHtml (markdown) {
  if (!markdown) return ''

  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
      smartypants: false
    })

    let html = marked(markdown)

    html = html.replace(
      /<a\s+href="([^"]+)"[^>]*>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">'
    )

    return html
  }
  catch (error) {
    console.warn('Failed to convert markdown to HTML:', error)
    return markdown
  }
}

function extractHtmlContent (description) {
  return typeof description === 'string'
    ? description
    : description?.value || description?.toString() || ''
}

function createTurndownService () {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-',
    emDelimiter: '_'
  })

  turndownService.addRule('lineBreaks', {
    filter: ['br'],
    replacement: function () {
      return '\n\n'
    }
  })

  turndownService.addRule('images', {
    filter: 'img',
    replacement: function (content, node) {
      const alt = node.getAttribute('alt') || 'Location Image'
      const src = node.getAttribute('src') || ''
      return '\n\n![' + alt + '](' + src + ')\n\n'
    }
  })

  return turndownService
}

function cleanupMarkdown (markdown) {
  return markdown.replace(/\n{3,}/g, '\n\n')
}

function convertUrlsToMarkdownLinks (markdown) {
  return markdown.replace(
    /(^|\s)(https?:\/\/[^\s\n]+)(?=\s|$|\n|\.)/g,
    function (match, p1, p2) {
      if (match.indexOf('[') !== -1 && match.indexOf('](') !== -1) {
        return match
      }
      return p1 + '[' + p2 + '](' + p2 + ')'
    }
  )
}

function kmlUpload (data) {
  const file = data.file?.file || data.file

  if (file) {
    selectedFile.value = file
    error.value = ''
    parseKML()
  }
}

function handleFileChange (data) {
  const file = data.fileList?.[0]?.file
  if (file) {
    selectedFile.value = file
    error.value = ''
    parseKML()
  }
}

function handleDrop (event) {
  const file = event.dataTransfer.files?.[0]

  if (file && (file.name.toLowerCase().endsWith('.kml') || file.name.toLowerCase().endsWith('.xml'))) {
    selectedFile.value = file
    error.value = ''
    parseKML()
  }
  else {
    error.value = t('errorInvalidFile')
  }
}

function readFileAsText (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Parses uploaded KML file and extracts point locations
 */
async function parseKML () {
  if (!selectedFile.value) {
    error.value = t('errorSelectFile')
    return
  }

  if (parsing.value) return

  parsing.value = true
  error.value = ''

  try {
    const text = await readFileAsText(selectedFile.value)
    const parser = new DOMParser()
    const kmlDoc = parser.parseFromString(text, 'application/xml')

    const parserError = kmlDoc.querySelector('parsererror')
    if (parserError) {
      throw new Error('Invalid KML file: XML parsing failed')
    }

    const extractedLocations = []
    const placemarks = kmlDoc.querySelectorAll('Placemark')

    for (const placemark of placemarks) {
      const point = placemark.querySelector('Point')
      if (!point) continue

      const coordinatesText = point.querySelector('coordinates')?.textContent?.trim()
      if (!coordinatesText) continue

      const coordParts = coordinatesText.split(',')
      if (coordParts.length < 2) continue

      const longitude = parseFloat(coordParts[0])
      const latitude = parseFloat(coordParts[1])

      if (isNaN(longitude) || isNaN(latitude)) continue

      const name = placemark.querySelector('name')?.textContent?.trim() || ''
      const description = placemark.querySelector('description')?.textContent?.trim() || ''

      const markdownDescription = convertToMarkdown(description)
      const location = {
        name,
        description: markdownDescription,
        htmlDescription: markdownDescription ? convertMarkdownToHtml(markdownDescription) : '',
        coordinates: [longitude, latitude],
        selected: true,
        imported: false,
        entityId: null
      }
      extractedLocations.push(location)
    }

    if (extractedLocations.length === 0) {
      throw new Error('No point locations found in the KML file')
    }

    locations.value = extractedLocations
    step.value = STEPS.REVIEW
  }
  catch (err) {
    error.value = `Failed to parse KML file: ${err.message}`
  }
  finally {
    parsing.value = false
  }
}

function handleMasterCheckboxChange (checked) {
  locations.value.forEach((location) => {
    if (!location.imported) {
      location.selected = checked
    }
  })
}

function goBackToUpload () {
  if (buttonLock.value) return

  buttonLock.value = true
  step.value = STEPS.UPLOAD
  error.value = ''
  selectedFile.value = null

  setTimeout(() => {
    buttonLock.value = false
  }, ANIMATION_DURATIONS.BUTTON_LOCK)
}

function togglePause () {
  if (importing.value) {
    paused.value = !paused.value

    if (!paused.value) {
      importSelected()
    }
  }
}

function togglePauseProtected () {
  let localLock = false

  if (localLock) return
  localLock = true

  togglePause()

  setTimeout(() => {
    localLock = false
  }, ANIMATION_DURATIONS.TOGGLE_PAUSE_LOCK)
}

/**
 * Imports selected locations to Entu as new entities
 * Supports pause/resume functionality and stops on first error
 */
async function importSelected () {
  if (buttonLock.value) return

  if (!importing.value) {
    const selectedLocations = locations.value.filter(
      (location) => location.selected
    )

    if (selectedLocations.length === 0) {
      error.value = t('errorSelectOneLocation')
      return
    }

    buttonLock.value = true
    importing.value = true
    error.value = ''
    paused.value = false

    locations.value = locations.value.filter((location) => location.selected || location.imported)

    importResults.value = {
      success: [],
      errors: [],
      stopped: false,
      skipped: 0
    }

    importProgress.value = {
      current: 0,
      total: selectedLocations.length,
      percentage: 0,
      pendingLocations: null
    }
  }

  try {
    if (!importProgress.value.pendingLocations) {
      importProgress.value.pendingLocations = locations.value
        .filter((location) => location.selected && !location.imported)
        .map((location, index) => ({ location, index }))
    }

    for (let i = importProgress.value.current; i < importProgress.value.pendingLocations.length; i++) {
      if (paused.value) {
        return
      }

      const { location } = importProgress.value.pendingLocations[i]

      try {
        if (!location.coordinates || location.coordinates.length < 2) {
          throw new Error('Invalid coordinates')
        }

        const entityData = {
          type: query.type,
          properties: {
            name: location.name || t('unnamedLocation'),
            coordinates: {
              latitude: location.coordinates[1],
              longitude: location.coordinates[0]
            }
          }
        }

        if (location.description) {
          entityData.properties.description = location.description
        }

        const entityId = await createEntity(entityData)

        location.imported = true
        location.entityId = entityId

        const originalLocation = locations.value.find((loc) => {
          return loc.coordinates[0] === location.coordinates[0]
            && loc.coordinates[1] === location.coordinates[1]
            && loc.name === location.name
        })
        if (originalLocation) {
          originalLocation.imported = true
          originalLocation.entityId = entityId
        }

        importResults.value.success.push({
          entityId: entityId
        })

        importProgress.value.current++
        importProgress.value.percentage = Math.round(
          (importProgress.value.current / importProgress.value.total) * 100
        )
      }
      catch (err) {
        const errorMessage = err.message || 'Unknown error occurred'
        importResults.value.errors.push({
          name: location.name,
          error: errorMessage
        })

        importResults.value.stopped = true
        importResults.value.skipped = importProgress.value.pendingLocations.length - i - 1
        break
      }
    }

    if (importResults.value.errors.length === 0) {
      error.value = ''
    }
    else {
      error.value = t('importStopped')
    }
  }
  catch (err) {
    error.value = `Import failed: ${err.message}`
  }
  finally {
    if (!paused.value) {
      importing.value = false
      importProgress.value.pendingLocations = null
      buttonLock.value = false
    }
  }
}

async function createEntity (entityData) {
  const baseProperties = buildEntityProperties(entityData)
  const response = await sendEntityToEntu(baseProperties)

  if (response && response._id) {
    return response._id
  }

  throw new Error('Missing entity ID in response')
}

function buildEntityProperties (entityData) {
  const baseProperties = [{ type: '_type', reference: query.type }]

  if (query.parent) {
    baseProperties.push({ type: '_parent', reference: query.parent })
  }

  if (entityData.properties.name) {
    baseProperties.push({
      type: 'name',
      string: entityData.properties.name
    })
  }

  if (entityData.properties.coordinates) {
    baseProperties.push({
      type: 'lat',
      number: entityData.properties.coordinates.latitude
    })
    baseProperties.push({
      type: 'long',
      number: entityData.properties.coordinates.longitude
    })
  }

  if (entityData.properties.description) {
    const processedDescription = processDescription(entityData.properties.description)
    baseProperties.push({
      type: 'kirjeldus',
      text: processedDescription
    })
  }

  return baseProperties
}

function processDescription (description) {
  if (description.length > CONTENT_LIMITS.MAX_DESCRIPTION_LENGTH) {
    return description.substring(0, CONTENT_LIMITS.MAX_DESCRIPTION_LENGTH) + '...'
  }
  return description
}

async function sendEntityToEntu (baseProperties) {
  return await $fetch(
    `${runtimeConfig.public.entuUrl}/api/${query.account}/entity`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${query.token}`
      },
      body: baseProperties
    }
  )
}
</script>

<!--
  KML Import Plugin - Two-step wizard for importing KML files into Entu
-->
<template>
  <div
    v-if="error"
    class="flex h-full max-h-full items-center justify-center font-bold text-red-700"
  >
    {{ error }}
  </div>

  <div
    v-else
    class="flex h-full max-h-full flex-col gap-6 overflow-auto p-6"
  >
    <!-- Step 1: File Upload -->
    <div v-if="step === STEPS.UPLOAD">
      <n-upload
        v-if="!parsing"
        :custom-request="kmlUpload"
        :show-file-list="false"
        accept=".kml,.xml"
        :multiple="false"
        :directory="false"
        @change="handleFileChange"
      >
        <n-upload-dragger
          class="flex h-96 flex-col items-center justify-center gap-2 rounded-none"
          @dragover.prevent
          @dragenter.prevent
          @drop.prevent="handleDrop"
        >
          {{ t('uploadText') }}
        </n-upload-dragger>
      </n-upload>

      <div
        v-if="parsing"
        class="flex h-48 items-center justify-center"
      >
        <n-spin show />
      </div>
    </div>

    <!-- Step 2: Review Locations -->
    <div
      v-if="step === STEPS.REVIEW"
      class="flex h-full flex-col"
    >
      <!-- Sticky header with controls -->
      <div class="sticky top-0 z-10 border-b border-gray-200 p-2">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ importing ? t('importing') : t('reviewLocations') }}
          </h2>
          <n-button
            v-if="!importing"
            text
            type="primary"
            :disabled="buttonLock"
            @click="goBackToUpload"
          >
            {{ t('backToUpload') }}
          </n-button>
        </div>

        <div class="mb-2 flex items-center justify-between">
          <!-- Show found locations count when not importing -->
          <p
            v-if="!importing"
            class="text-sm text-gray-600"
          >
            {{ t('foundLocations', locations.length) }}
          </p>

          <!-- Show import progress when importing and not paused -->
          <p
            v-else-if="importing && !paused"
            class="text-sm text-gray-600"
          >
            {{ t('importingProgress', { current: importProgress.current, total: importProgress.total, percentage: importProgress.percentage }) }}
          </p>

          <!-- Show paused status when importing and paused -->
          <p
            v-else-if="importing && paused"
            class="text-sm text-gray-600"
          >
            {{ t('importPaused', { current: importProgress.current, total: importProgress.total, percentage: importProgress.percentage }) }}
          </p>
          <div class="flex items-center gap-2">
            <n-button
              v-if="!importing"
              :disabled="!hasSelectedLocations || buttonLock"
              type="primary"
              size="small"
              @click="importSelected"
            >
              {{ t('importSelected', selectedCount) }}
            </n-button>
            <n-button
              v-else
              type="primary"
              size="small"
              @click="togglePauseProtected"
            >
              {{ paused ? t('resumeImport') : t('pauseImport') }}
            </n-button>
          </div>
        </div>

        <!-- Master checkbox for select all/none -->
        <div
          v-if="!importing && locations.length > 0"
          class="mb-2 ml-1 inline-flex cursor-pointer items-start"
          @click="handleMasterCheckboxChange(!masterCheckboxState.checked)"
        >
          <n-checkbox
            :checked="masterCheckboxState.checked"
            :indeterminate="masterCheckboxState.indeterminate"
            class="mt-1"
            size="small"
            @update:checked="handleMasterCheckboxChange"
            @click.stop
          />
          <span class="ml-3 text-sm text-gray-600">
            {{ t('selectAll') }}
          </span>
        </div>

        <!-- Progress bar (visible only during import) -->
        <div
          v-if="importing"
          class="mb-2 ml-1 inline-flex items-start"
        >
          <div class="mt-1 w-80">
            <n-progress
              type="line"
              :percentage="importProgress.percentage"
              :height="16"
              :border-radius="8"
              :show-indicator="false"
              status="success"
            />
          </div>
        </div>

        <!-- Error messages if any -->
        <div
          v-if="importResults.errors.length > 0"
          class="mb-2 rounded-md border border-red-200 bg-red-50 p-2"
        >
          <h3 class="mb-1 text-sm font-medium text-red-800">
            {{ t('importErrors', importResults.errors.length) }}
          </h3>
          <ul class="list-inside list-disc space-y-1">
            <li
              v-for="errorItem in importResults.errors"
              :key="errorItem.name"
              class="text-sm text-red-700"
            >
              {{ errorItem.name || t('unnamedLocation') }}: {{ errorItem.error }}
            </li>
          </ul>

          <!-- Warning if import was stopped -->
          <div
            v-if="importResults.stopped"
            class="mt-2"
          >
            <p class="text-sm text-yellow-800">
              {{ t('importStoppedMessage', { skipped: importResults.skipped }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Scrollable locations container -->
      <div class="flex-1 overflow-y-auto pt-3">
        <div>
          <div
            v-for="location in locations"
            :key="`${location.coordinates[0]}-${location.coordinates[1]}-${location.name}`"
            class="flex items-start border-b border-gray-100 p-3 transition-all duration-500 ease-in-out last:border-b-0"
            :class="{
              'bg-green-50': location.imported,
              'border-green-100': location.imported,
            }"
          >
            <!-- Show check box for non-imported locations -->
            <n-checkbox
              v-if="!location.imported"
              v-model:checked="location.selected"
              class="mt-1 transition-opacity duration-1000"
              :class="importing ? 'opacity-0 pointer-events-none' : 'opacity-100'"
              size="small"
            />

            <!-- Show marker icon for imported locations -->
            <div
              v-else
              class="mt-0.5 flex size-5 items-center justify-center text-green-600"
            >
              <my-icon
                icon="check-circle"
                class="size-5"
              />
            </div>
            <div class="ml-3 min-w-0 flex-1 transition-all duration-500 ease-in-out">
              <!-- Location name - always shown but changes link/color when imported -->
              <p class="text-sm font-medium text-gray-900">
                <a
                  v-if="location.imported"
                  :href="`${runtimeConfig.public.entuUrl}/${query.account}/${location.entityId}`"
                  target="_blank"
                  class="text-green-600 hover:text-green-800"
                >
                  {{ location.name || t('unnamedLocation') }}
                </a>
                <span
                  v-else
                  class="cursor-pointer hover:text-blue-600"
                  @click="!importing && (location.selected = !location.selected)"
                >
                  {{ location.name || t('unnamedLocation') }}
                </span>
                <span class="ml-1 text-sm text-gray-500">
                  {{ location.coordinates[1].toFixed(COORDINATE_VALIDATION.COORDINATE_PRECISION) }}, {{ location.coordinates[0].toFixed(COORDINATE_VALIDATION.COORDINATE_PRECISION) }}
                </span>
              </p>

              <!-- Description - smoothly collapses when imported -->
              <div
                v-if="location.description"
                class="overflow-hidden transition-all duration-500 ease-in-out"
                :class="location.imported ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'"
              >
                <div>
                  <!-- v-html safe: content sanitized through HTML→Markdown→HTML pipeline -->
                  <!-- eslint-disable vue/no-v-html -->
                  <div
                    class="prose prose-sm mt-1 max-w-none overflow-y-auto text-gray-600 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-2 [&_a]:break-words [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800 [&_img]:h-auto [&_img]:max-w-full"
                    :style="{ maxHeight: `${CONTENT_LIMITS.MAX_DESCRIPTION_HEIGHT}px` }"
                    v-html="location.htmlDescription"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results are now integrated into the review screen -->

    <!-- Error Display -->
    <div
      v-if="error"
      class="mt-6 rounded-md border border-red-200 bg-red-50 p-4"
    >
      <div class="flex">
        <div class="shrink-0">
          <my-icon
            icon="error-circle"
            class="size-5 text-red-400"
          />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            {{ t('error') }}
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  errorNoAccount: No account parameter!
  errorNoType: No type parameter!
  errorNoToken: No token parameter!
  errorInvalidFile: Please select a KML or XML file
  errorSelectFile: Please select a file
  errorSelectOneLocation: Please select at least one location to import
  uploadText: Click or drag a KML file to this area to upload.
  reviewLocations: Review Locations
  backToUpload: Back to File Selection
  foundLocations: Found {n} location(s). Select which ones to import
  selectAll: Select all
  unnamedLocation: Unnamed Location
  importSelected: Import | Import the Selected Location | Import {n} Selected Locations
  importingProgress: Importing... {current}/{total} ({percentage}%)
  importPaused: Paused... {current}/{total} ({percentage}%)
  importing: Importing...
  pauseImport: Pause
  resumeImport: Resume
  importErrors: Import Error | Import Error | Import Errors ({n})
  importStopped: Import Stopped
  importStoppedMessage: Import was stopped after the first error occurred. No locations were not processed. | Import was stopped after the first error occurred. The remaining single location was not processed. | Import was stopped after the first error occurred. {skipped} locations were not processed.
  error: Error
et:
  errorNoAccount: Puudub 'account' parameeter!
  errorNoType: Puudub 'type' parameeter!
  errorNoToken: Puudub 'token' parameeter!
  errorInvalidFile: Palun valige KML või XML fail
  errorSelectFile: Palun valige fail
  errorSelectOneLocation: Palun valige vähemalt üks asukoht importimiseks
  uploadText: Lohista KML fail siia või klõpsa siin, et fail valida.
  reviewLocations: Asukohtade ülevaade
  backToUpload: Tagasi faili valikusse
  foundLocations: Leitud {n} asukoht(a). Valige, millised importida
  selectAll: Vali kõik
  unnamedLocation: Nimetu asukoht
  importSelected: Impordi | Impordi valitud asukoht | Impordi {n} valitud asukohta
  importingProgress: Importimine... {current}/{total} ({percentage}%)
  importPaused: Peatatud... {current}/{total} ({percentage}%)
  importing: Importimine...
  pauseImport: Peata
  resumeImport: Jätka
  importErrors: Importimise viga | Importimise viga | Importimise vead ({n})
  importStopped: Importimine peatatud
  importStoppedMessage: Importimine peatati pärast esimest viga. Ühtegi asukohta ei jäänud töötlemata. | Importimine peatati pärast esimest viga. Üks asukoht jäi töötlemata. | Importimine peatati pärast esimest viga. {skipped} asukohta jäi töötlemata.
  error: Viga
</i18n>
