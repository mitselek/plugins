<script setup>
/*
  KML Import Plugin Script

  Handles browser-based KML file parsing and entity creation in Entu.
  Architecture: Client-side processing with direct API calls to Entu.
*/

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import * as toGeoJSON from '@tmcw/togeojson'
import TurndownService from 'turndown'
import { NUpload, NUploadDragger, NSpin, NCheckbox, NButton } from 'naive-ui'
import MyIcon from '../components/my/icon.vue'

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const { query } = route

const STEPS = {
  UPLOAD: 'upload',
  REVIEW: 'review'
}

const ANIMATION_DURATIONS = {
  BUTTON_LOCK: 500, // ms - prevents double-clicking
  TOGGLE_PAUSE_LOCK: 100, // ms - minimal lock for pause/resume
  SCROLL_BASE: 300, // ms - base scroll animation duration
  SCROLL_MAX: 1000, // ms - maximum scroll animation duration
  USER_SCROLL_RESUME: 5000, // ms - time before auto-scroll resumes after user interaction
  SCROLL_DEBOUNCE: 100 // ms - debounce threshold for user scroll detection
}

const CONTENT_LIMITS = {
  MAX_DESCRIPTION_LENGTH: 20000 // characters - prevent extremely long descriptions
}

// UI state
const step = ref(STEPS.UPLOAD)
const selectedFile = ref(null)
const locations = ref([])
const parsing = ref(false)
const importing = ref(false)
const paused = ref(false)
const error = ref('')
const buttonLock = ref(false) // Prevents double-clicking on action buttons
const locationRefs = ref([]) // References to location elements for auto-scroll
const scrollContainer = ref(null) // Reference to the scrollable container
const userScrollPaused = ref(false) // Tracks if auto-scroll is paused due to user interaction
const userScrollTimer = ref(null) // Timer for resuming auto-scroll after user interaction
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

onUnmounted(() => {
  if (userScrollTimer.value) {
    clearTimeout(userScrollTimer.value)
  }
})

// UTILITY FUNCTIONS
// ======================================
/**
 * Prevents rapid button clicks by temporarily locking the action
 */
function protectFromDoubleClick (fn) {
  return async (...args) => {
    if (buttonLock.value) return

    buttonLock.value = true

    try {
      await fn(...args)
    }
    finally {
      setTimeout(() => {
        buttonLock.value = false
      }, ANIMATION_DURATIONS.BUTTON_LOCK)
    }
  }
}

/**
 * Scrolls to keep the currently importing location visible with enhanced easing
 */
function scrollToLocation (index) {
  const element = locationRefs.value[index]
  if (!element) return

  const container = element.closest('.overflow-y-auto')
  if (!container) return

  if (!scrollContainer.value) {
    scrollContainer.value = container
    setupScrollListener()
  }

  if (userScrollPaused.value) {
    return
  }

  const currentScrollTop = container.scrollTop
  const elementOffsetTop = element.offsetTop
  const containerHeight = container.clientHeight

  const targetScrollTop = elementOffsetTop - (containerHeight / 2) + (element.offsetHeight / 2)

  // Never scroll backwards - only scroll forward or stay in place
  if (targetScrollTop <= currentScrollTop) {
    return
  }

  const distance = Math.abs(targetScrollTop - currentScrollTop)

  const baseDuration = ANIMATION_DURATIONS.SCROLL_BASE
  const maxDuration = ANIMATION_DURATIONS.SCROLL_MAX
  const duration = Math.min(baseDuration + (distance / 2), maxDuration)

  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  }

  const startTime = performance.now()
  const startScrollTop = currentScrollTop

  const animateScroll = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    const easedProgress = easeInOutCubic(progress)
    const newScrollTop = startScrollTop + (targetScrollTop - startScrollTop) * easedProgress

    container.scrollTop = newScrollTop

    if (progress < 1) {
      requestAnimationFrame(animateScroll)
    }
  }

  requestAnimationFrame(animateScroll)
}

/**
 * Sets up scroll listener to detect user scroll and pause auto-scrolling
 */
function setupScrollListener () {
  if (!scrollContainer.value) return

  let scrollTimeout
  let lastScrollTime = 0

  const handleScroll = () => {
    const currentTime = Date.now()

    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }

    if (currentTime - lastScrollTime > ANIMATION_DURATIONS.SCROLL_DEBOUNCE) {
      userScrollPaused.value = true

      if (userScrollTimer.value) {
        clearTimeout(userScrollTimer.value)
      }

      userScrollTimer.value = setTimeout(() => {
        userScrollPaused.value = false
      }, ANIMATION_DURATIONS.USER_SCROLL_RESUME)
    }

    lastScrollTime = currentTime
  }

  scrollContainer.value.addEventListener('scroll', handleScroll, { passive: true })
}

/**
 * Converts HTML content from KML descriptions to markdown
 */
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

// FILE HANDLING METHODS
// ======================================
function kmlUpload (data) {
  const file = data.file?.file || data.file

  if (file) {
    selectedFile.value = file
    error.value = ''
    parseKML()
  }
}

const kmlUploadProtected = protectFromDoubleClick(kmlUpload)

function handleFileChange (data) {
  const file = data.fileList?.[0]?.file
  if (file) {
    selectedFile.value = file
    error.value = ''
    parseKML()
  }
}

const handleFileChangeProtected = protectFromDoubleClick(handleFileChange)

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

const handleDropProtected = protectFromDoubleClick(handleDrop)

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

    const geoJson = toGeoJSON.kml(kmlDoc)
    const extractedLocations = []

    if (geoJson.features) {
      for (const feature of geoJson.features) {
        if (feature.geometry && feature.geometry.type === 'Point') {
          const coordinates = feature.geometry.coordinates

          if (
            !Array.isArray(coordinates)
            || coordinates.length < 2
            || typeof coordinates[0] !== 'number'
            || typeof coordinates[1] !== 'number'
            || isNaN(coordinates[0])
            || isNaN(coordinates[1])
          ) {
            continue
          }

          const location = {
            name: (feature.properties?.name || '').trim(),
            description: convertToMarkdown(feature.properties?.description),
            coordinates: coordinates,
            selected: true,
            imported: false,
            entityId: null
          }
          extractedLocations.push(location)
        }
      }
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

function selectAll () {
  locations.value.forEach((location) => {
    location.selected = true
  })
}

const selectAllProtected = protectFromDoubleClick(selectAll)

function selectNone () {
  locations.value.forEach((location) => {
    location.selected = false
  })
}

const selectNoneProtected = protectFromDoubleClick(selectNone)

function goBackToUpload () {
  step.value = STEPS.UPLOAD
  error.value = ''
  selectedFile.value = null
}

const goBackToUploadProtected = protectFromDoubleClick(goBackToUpload)

function togglePause () {
  if (importing.value) {
    paused.value = !paused.value

    if (!paused.value) {
      importSelected()
    }
  }
}

const togglePauseProtected = function () {
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
  if (!importing.value) {
    const selectedLocations = locations.value.filter(
      (location) => location.selected
    )

    if (selectedLocations.length === 0) {
      error.value = t('errorSelectOneLocation')
      return
    }

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

      scrollToLocation(i)

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
    }
  }
}

const importSelectedProtected = protectFromDoubleClick(importSelected)

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
        :custom-request="kmlUploadProtected"
        :show-file-list="false"
        accept=".kml,.xml"
        :multiple="false"
        :directory="false"
        @change="handleFileChangeProtected"
      >
        <n-upload-dragger
          class="flex h-96 flex-col items-center justify-center gap-2 rounded-none"
          @dragover.prevent
          @dragenter.prevent
          @drop.prevent="handleDropProtected"
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
      <div class="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 p-2 shadow-lg">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ importing ? t('importing') : t('reviewLocations') }}
          </h2>
          <n-button
            v-if="!importing"
            text
            type="primary"
            :disabled="buttonLock"
            @click="goBackToUploadProtected"
          >
            {{ t('backToUpload') }}
          </n-button>
          <n-button
            v-else
            text
            type="primary"
            @click="togglePauseProtected"
          >
            {{ paused ? t('resumeImport') : t('pauseImport') }}
          </n-button>
        </div>

        <!-- Success message if items were imported -->
        <div
          v-if="importResults.success.length > 0"
          class="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2"
        >
          <p class="text-sm font-medium text-green-800">
            {{ t('successfullyImported', importResults.success.length) }}
          </p>
        </div>

        <div
          v-if="!importing"
          class="mb-2 flex items-center justify-between"
        >
          <p class="text-sm text-gray-600">
            {{ t('foundLocations', locations.length) }}
          </p>
          <div class="flex gap-2">
            <n-button
              text
              type="primary"
              size="small"
              :disabled="buttonLock"
              @click="selectAllProtected"
            >
              {{ t('selectAll') }}
            </n-button>
            <n-button
              text
              type="primary"
              size="small"
              :disabled="buttonLock"
              @click="selectNoneProtected"
            >
              {{ t('selectNone') }}
            </n-button>
            <n-button
              :disabled="!hasSelectedLocations || buttonLock"
              type="primary"
              size="small"
              @click="importSelectedProtected"
            >
              {{ t('importSelected', selectedCount) }}
            </n-button>
          </div>
        </div>

        <!-- Progress bar (visible only during import) -->
        <div
          v-if="importing"
          class="mb-2"
        >
          <div class="h-2 w-full rounded-full bg-gray-200">
            <div
              class="h-2 rounded-full bg-green-600 transition-all duration-300 ease-in-out"
              :style="{ width: importProgress.percentage + '%' }"
            />
          </div>
          <div class="mt-1 text-center text-xs text-gray-500">
            {{ paused
              ? t('importPaused', { current: importProgress.current, total: importProgress.total, percentage: importProgress.percentage })
              : t('importingProgress', { current: importProgress.current, total: importProgress.total, percentage: importProgress.percentage })
            }}
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
        <div
          class="rounded-md border border-gray-200"
        >
          <div
            v-for="(location, index) in locations"
            :key="index"
            :ref="el => locationRefs[index] = el"
            class="flex items-start border-b border-gray-100 p-3 transition-all duration-500 ease-in-out last:border-b-0"
            :class="[
              location.imported ? 'bg-green-50' : '',
              location.imported ? 'border-green-100' : '',
              location.imported ? 'cursor-default' : importing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50',
            ]"
            @click="!location.imported && !importing && (location.selected = !location.selected)"
          >
            <!-- Show check box for non-imported locations -->
            <n-checkbox
              v-if="!location.imported"
              v-model:checked="location.selected"
              class="mt-1 transition-opacity duration-1000"
              :class="importing ? 'opacity-0 pointer-events-none' : 'opacity-100'"
              size="small"
              @click.stop
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
                <span v-else>
                  {{ location.name || t('unnamedLocation') }}
                </span>
                <span class="ml-1 text-sm text-gray-500">
                  {{ location.coordinates[1].toFixed(6) }}, {{ location.coordinates[0].toFixed(6) }}
                </span>
                <span
                  class="ml-1 text-xs text-green-600 transition-all duration-500 ease-in-out"
                  :style="{ opacity: location.imported ? 1 : 0, maxHeight: location.imported ? '20px' : '0px' }"
                >({{ t('imported') }})</span>
              </p>

              <!-- Coordinates label - smoothly disappears when imported -->
              <div
                class="overflow-hidden transition-all duration-500 ease-in-out"
                :style="{ opacity: location.imported ? 0 : 1, maxHeight: location.imported ? '0px' : '24px' }"
              >
                <p class="text-sm text-gray-500">
                  {{ t('coordinates') }}: {{ location.coordinates[1].toFixed(6) }},
                  {{ location.coordinates[0].toFixed(6) }}
                </p>
              </div>

              <!-- Description - smoothly collapses when imported -->
              <div
                v-if="location.description"
                class="overflow-hidden transition-all duration-500 ease-in-out"
                :style="{ maxHeight: location.imported ? '0px' : '200px', opacity: location.imported ? 0 : 1 }"
              >
                <p class="mt-1 text-sm text-gray-600">
                  {{ location.description }}
                </p>
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
  errorNoAccount: "No account parameter!"
  errorNoType: "No type parameter!"
  errorNoToken: "No token parameter!"
  errorInvalidFile: "Please select a KML or XML file"
  errorSelectFile: "Please select a file"
  errorSelectOneLocation: "Please select at least one location to import"
  uploadText: "Click or drag a KML file to this area to upload."
  reviewLocations: "Review Locations"
  backToUpload: "Back to File Selection"
  foundLocations: "Found {n} location(s). Select which ones to import:"
  selectAll: "Select All"
  selectNone: "Select None"
  unnamedLocation: "Unnamed Location"
  coordinates: "Coordinates"
  importSelected: "Import | Import {n} Selected Location | Import {n} Selected Locations"
  importingProgress: "Importing... {current}/{total} ({percentage}%)"
  importPaused: "Paused... {current}/{total} ({percentage}%)"
  importing: "Importing..."
  pauseImport: "Pause"
  resumeImport: "Resume"
  importResults: "Import Results"
  successfullyImported: "Successfully Imported ({n})"
  importErrors: "Import Errors ({n})"
  importStopped: "Import Stopped"
  importStoppedMessage: "Import was stopped after the first error occurred. {skipped} location(s) were not processed."
  retryFailedImport: "Retry Failed Import"
  error: "Error"
  imported: "Imported"
et:
  errorNoAccount: "Puudub 'account' parameeter!"
  errorNoType: "Puudub 'type' parameeter!"
  errorNoToken: "Puudub 'token' parameeter!"
  errorInvalidFile: "Palun valige KML või XML fail"
  errorSelectFile: "Palun valige fail"
  errorSelectOneLocation: "Palun valige vähemalt üks asukoht importimiseks"
  uploadText: "Lohista KML fail siia või klõpsa siin, et fail valida."
  reviewLocations: "Asukohtade ülevaade"
  backToUpload: "Tagasi faili valikusse"
  foundLocations: "Leitud {n} asukoht(a). Valige, millised importida:"
  selectAll: "Vali kõik"
  selectNone: "Tühista valik"
  unnamedLocation: "Nimetu asukoht"
  coordinates: "Koordinaadid"
  importSelected: "Impordi | Impordi {n} valitud asukoht | Impordi {n} valitud asukohta"
  importingProgress: "Importimine... {current}/{total} ({percentage}%)"
  importPaused: "Peatatud... {current}/{total} ({percentage}%)"
  importing: "Importimine..."
  pauseImport: "Peata"
  resumeImport: "Jätka"
  importResults: "Importimise tulemused"
  successfullyImported: "Edukalt imporditud ({n})"
  importErrors: "Importimise vead ({n})"
  importStopped: "Importimine peatatud"
  importStoppedMessage: "Importimine peatati pärast esimest viga. {skipped} asukoht(a) jäi töötlemata."
  retryFailedImport: "Proovi ebaõnnestunud importi uuesti"
  error: "Viga"
  imported: "Imporditud"
</i18n>
