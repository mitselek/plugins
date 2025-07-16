<script setup>
/*
  KML Import Plugin Script

  Handles browser-based KML file parsing and entity creation in Entu.
  Architecture: Client-side processing with direct API calls to Entu.
*/

// IMPORTS AND DEPENDENCIES
// ======================================
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as toGeoJSON from '@tmcw/togeojson'
import TurndownService from 'turndown'
import { NUpload, NUploadDragger, NSpin } from 'naive-ui'

// CONFIGURATION AND CONSTANTS
// ======================================
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const { query } = route

// Step constants for clarity and maintainability
const STEPS = {
  UPLOAD: 'upload',
  REVIEW: 'review',
  RESULTS: 'results'
}

// REACTIVE STATE MANAGEMENT
// ======================================
// UI state
const step = ref(STEPS.UPLOAD)
const selectedFile = ref(null)
const locations = ref([])
const parsing = ref(false)
const importing = ref(false)
const error = ref('')
const importProgress = ref({
  current: 0,
  total: 0,
  percentage: 0
})

// Import results tracking
const importResults = ref({
  success: [],
  errors: [],
  stopped: false,
  skipped: 0
})

// COMPUTED PROPERTIES
// ======================================
const hasSelectedLocations = computed(() =>
  locations.value.some((location) => location.selected)
)

const selectedCount = computed(
  () => locations.value.filter((location) => location.selected).length
)

// LIFECYCLE HOOKS
// ======================================
// Initialize from URL parameters
onMounted(async () => {
  // Validate required parameters
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

// UTILITY FUNCTIONS
// ======================================
/**
 * Converts HTML content from KML descriptions to markdown
 *
 * Uses Turndown library to handle conversion of HTML to markdown:
 * - Converts HTML tags to appropriate markdown syntax
 * - Properly handles links, lists, formatting
 * - Maintains structure while removing HTML complexity
 *
 * @param {string|Object} description - Raw description from KML
 * @returns {string} Description converted to markdown format
 */
function convertToMarkdown (description) {
  if (!description) return ''

  // Extract HTML content from description
  const htmlContent = typeof description === 'string'
    ? description
    : description?.value || description?.toString() || ''

  if (!htmlContent) return ''

  // Convert HTML to Markdown using Turndown with custom configuration
  const turndownService = new TurndownService({
    headingStyle: 'atx', // Use # style headings
    codeBlockStyle: 'fenced', // Use ``` style code blocks
    hr: '---', // Use --- for horizontal rules
    bulletListMarker: '-', // Use - for bullet lists
    emDelimiter: '_' // Use _underscore_ for emphasis
  })

  // Add custom rule for line breaks to preserve paragraph structure better
  turndownService.addRule('lineBreaks', {
    filter: ['br'],
    replacement: function () {
      return '\n\n' // Simple newline instead of hardcoded line breaks
    }
  })

  // Improve image handling - place images on their own line
  turndownService.addRule('images', {
    filter: 'img',
    replacement: function (content, node) {
      const alt = node.getAttribute('alt') || 'Location Image'
      const src = node.getAttribute('src') || ''
      return '\n\n![' + alt + '](' + src + ')\n\n'
    }
  })

  // Convert and clean up the result
  let markdown = turndownService.turndown(htmlContent)

  // Clean up: convert consecutive line breaks to proper paragraph breaks
  markdown = markdown.replace(/\n{3,}/g, '\n\n') // No more than 2 consecutive line breaks

  // Second pass to ensure all URLs are converted to markdown links
  // This catches any URLs that weren't handled by the Turndown rule
  markdown = markdown.replace(
    /(^|\s)(https?:\/\/[^\s\n]+)(?=\s|$|\n|\.)/g,
    function (match, p1, p2) {
      // Don't convert URLs that are already in markdown link format
      if (match.indexOf('[') !== -1 && match.indexOf('](') !== -1) {
        return match
      }
      return p1 + '[' + p2 + '](' + p2 + ')'
    }
  )

  return markdown
}

// FILE HANDLING METHODS
// ======================================
/**
 * File selection and parsing methods for KML import workflow
 */

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
 *
 * Workflow:
 * 1. Read file content as text using FileReader
 * 2. Parse XML using DOMParser with application/xml MIME type
 * 3. Convert KML to GeoJSON using @tmcw/togeojson library
 * 4. Extract Point geometries with valid coordinates
 * 5. Convert descriptions to markdown format
 * 6. Transition to review step with pre-selected locations
 *
 * @throws {Error} For invalid files, XML parsing errors, or no locations found
 */
async function parseKML () {
  if (!selectedFile.value) {
    error.value = t('errorSelectFile')
    return
  }

  parsing.value = true
  error.value = ''

  try {
    const text = await readFileAsText(selectedFile.value)
    const parser = new DOMParser()
    const kmlDoc = parser.parseFromString(text, 'application/xml')

    // Check for XML parsing errors
    const parserError = kmlDoc.querySelector('parsererror')
    if (parserError) {
      throw new Error('Invalid KML file: XML parsing failed')
    }

    // Convert KML to GeoJSON
    const geoJson = toGeoJSON.kml(kmlDoc)

    // Extract locations from GeoJSON
    const extractedLocations = []

    if (geoJson.features) {
      for (const feature of geoJson.features) {
        if (feature.geometry && feature.geometry.type === 'Point') {
          const coordinates = feature.geometry.coordinates

          // Validate coordinates
          if (
            !Array.isArray(coordinates)
            || coordinates.length < 2
            || typeof coordinates[0] !== 'number'
            || typeof coordinates[1] !== 'number'
            || isNaN(coordinates[0])
            || isNaN(coordinates[1])
          ) {
            continue // Skip invalid coordinates
          }

          const location = {
            name: (feature.properties?.name || '').trim(),
            description: convertToMarkdown(feature.properties?.description),
            coordinates: coordinates, // [longitude, latitude]
            selected: true // Pre-checked as per requirements
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

// LOCATION SELECTION METHODS
// ======================================
/**
 * Methods for managing location selection in the review step
 */

function selectAll () {
  locations.value.forEach((location) => {
    location.selected = true
  })
}

function selectNone () {
  locations.value.forEach((location) => {
    location.selected = false
  })
}

// NAVIGATION METHODS
// ======================================
/**
 * Methods for navigating between workflow steps
 */

function goBackToUpload () {
  step.value = STEPS.UPLOAD
  error.value = ''
}

async function retryImport () {
  // Go back to review step and allow user to retry import
  step.value = STEPS.REVIEW
  error.value = ''
}

// API INTERACTION METHODS
// ======================================
/**
 * Methods for importing locations and creating entities in Entu
 */

/**
 * Imports selected locations to Entu as new entities
 *
 * Process:
 * 1. Validates that locations are selected
 * 2. Iterates through selected locations sequentially
 * 3. Creates entity data with name, description, and coordinates
 * 4. Calls createEntity API for each location
 * 5. Stops on first error (fail-fast approach)
 * 6. Tracks success/error results for user feedback
 *
 * @throws {Error} For validation failures or API errors
 */
async function importSelected () {
  const selectedLocations = locations.value.filter(
    (location) => location.selected
  )

  if (selectedLocations.length === 0) {
    error.value = t('errorSelectOneLocation')
    return
  }

  importing.value = true
  error.value = ''
  importResults.value = {
    success: [],
    errors: [],
    stopped: false,
    skipped: 0
  }

  // Reset and initialize progress tracking
  importProgress.value = {
    current: 0,
    total: selectedLocations.length,
    percentage: 0
  }

  try {
    for (let i = 0; i < selectedLocations.length; i++) {
      const location = selectedLocations[i]

      try {
        // Validate location data
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

        // Add description if present
        if (location.description) {
          entityData.properties.description = location.description
        }

        const entityId = await createEntity(entityData)

        importResults.value.success.push({
          name: location.name,
          entityId: entityId
        })

        // Update progress
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

        // Stop on first error as per requirements
        importResults.value.stopped = true
        importResults.value.skipped = selectedLocations.length - i - 1
        break
      }
    }

    step.value = STEPS.RESULTS
  }
  catch (err) {
    error.value = `Import failed: ${err.message}`
  }
  finally {
    importing.value = false
  }
}

/**
 * Creates a new entity in Entu via direct API call with graceful degradation
 * @param {Object} entityData - Entity data with properties (name, description, coordinates)
 * @returns {string} - Created entity ID
 */
async function createEntity (entityData) {
  // Prepare base properties for Entu API
  const baseProperties = [{ type: '_type', reference: query.type }]

  // Add parent if specified in URL
  if (query.parent) {
    baseProperties.push({ type: '_parent', reference: query.parent })
  }

  // Add entity-specific properties
  if (entityData.properties.name) {
    baseProperties.push({
      type: 'name',
      string: entityData.properties.name
    })
  }

  // Add coordinates as separate latitude and longitude properties
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

  // Add description if present
  if (entityData.properties.description) {
    // Basic safety checks
    let processedDescription = entityData.properties.description
    const MAX_DESCRIPTION_LENGTH = 20000
    if (processedDescription.length > MAX_DESCRIPTION_LENGTH) {
      processedDescription = processedDescription.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
    }

    baseProperties.push({
      type: 'kirjeldus',
      text: processedDescription
    })
  }

  // Create entity with properties
  const response = await $fetch(
    `${runtimeConfig.public.entuUrl}/api/${query.account}/entity`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${query.token}`
      },
      body: baseProperties
    }
  )

  if (response && response._id) {
    return response._id
  }

  throw new Error('Missing entity ID in response')
}
</script>

<!--
  KML Import Plugin Template

  Three-step wizard for importing KML files into Entu:
  1. Upload: File selection and validation
  2. Review: Location selection with checkboxes
  3. Results: Import feedback and error handling
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
          class="flex flex-col items-center justify-center gap-2 rounded-none"
          :class="{ 'h-96': !selectedFile }"
          @dragover.prevent
          @dragenter.prevent
          @drop.prevent="handleDrop"
        >
          {{ t('uploadText') }}

          <div
            v-if="selectedFile"
            class="font-bold"
          >
            {{ selectedFile.name }}
          </div>
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
    <div v-if="step === STEPS.REVIEW">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ t('reviewLocations') }}
        </h2>
        <button
          class="text-blue-600 underline hover:text-blue-800"
          @click="goBackToUpload"
        >
          {{ t('backToUpload') }}
        </button>
      </div>

      <div class="mb-4 flex items-center justify-between">
        <p class="text-sm text-gray-600">
          {{ t('foundLocations', locations.length) }}
        </p>
        <div class="flex gap-2">
          <button
            class="text-sm text-blue-600 underline hover:text-blue-800"
            @click="selectAll"
          >
            {{ t('selectAll') }}
          </button>
          <button
            class="text-sm text-blue-600 underline hover:text-blue-800"
            @click="selectNone"
          >
            {{ t('selectNone') }}
          </button>
        </div>
      </div>

      <div
        class="mb-6 max-h-96 overflow-y-auto rounded-md border border-gray-200"
      >
        <div
          v-for="(location, index) in locations"
          :key="index"
          class="flex items-start border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50"
        >
          <input
            :id="`location-${index}`"
            v-model="location.selected"
            type="checkbox"
            class="mt-1 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <div class="ml-3 min-w-0 flex-1">
            <label
              :for="`location-${index}`"
              class="block cursor-pointer text-sm font-medium text-gray-900"
            >
              {{ location.name || t('unnamedLocation') }}
            </label>
            <p class="text-sm text-gray-500">
              {{ t('coordinates') }}: {{ location.coordinates[1].toFixed(6) }},
              {{ location.coordinates[0].toFixed(6) }}
            </p>
            <p
              v-if="location.description"
              class="mt-1 text-sm text-gray-600"
            >
              {{ location.description }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <button
          :disabled="!hasSelectedLocations || importing"
          class="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
          @click="importSelected"
        >
          {{
            importing
              ? t('importingProgress', { current: importProgress.current, total: importProgress.total, percentage: importProgress.percentage })
              : t('importSelected', selectedCount)
          }}
        </button>

        <!-- Progress bar (visible only during import) -->
        <div
          v-if="importing"
          class="w-full"
        >
          <div class="h-2 w-full rounded-full bg-gray-200">
            <div
              class="h-2 rounded-full bg-green-600 transition-all duration-300 ease-in-out"
              :style="{ width: importProgress.percentage + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Import Results -->
    <div v-if="step === STEPS.RESULTS">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ t('importResults') }}
        </h2>
      </div>

      <div
        v-if="importResults.success.length > 0"
        class="mb-6"
      >
        <h3 class="mb-2 text-lg font-medium text-green-800">
          {{ t('successfullyImported', importResults.success.length) }}
        </h3>
        <div class="rounded-md border border-green-200 bg-green-50 p-4">
          <ul class="list-inside list-disc space-y-1">
            <li
              v-for="result in importResults.success"
              :key="result.name"
              class="text-sm text-green-700"
            >
              <a
                v-if="result.entityId"
                :href="`${runtimeConfig.public.entuUrl}/${query.account}/${result.entityId}`"
                target="_blank"
                class="text-green-600 underline hover:text-green-800"
              >
                {{ result.name || t('unnamedLocation') }}
              </a>
              <span v-else>
                {{ result.name || t('unnamedLocation') }}
              </span>
              <span
                v-if="result.entityId"
                class="ml-1 text-green-600"
              >
                (ID: {{ result.entityId }})
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div
        v-if="importResults.errors.length > 0"
        class="mb-6"
      >
        <h3 class="mb-2 text-lg font-medium text-red-800">
          {{ t('importErrors', importResults.errors.length) }}
        </h3>
        <div class="rounded-md border border-red-200 bg-red-50 p-4">
          <ul class="list-inside list-disc space-y-1">
            <li
              v-for="errorItem in importResults.errors"
              :key="errorItem.name"
              class="text-sm text-red-700"
            >
              {{ errorItem.name || t('unnamedLocation') }}: {{ errorItem.error }}
            </li>
          </ul>
        </div>
      </div>

      <div
        v-if="importResults.stopped"
        class="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4"
      >
        <div class="flex">
          <div class="shrink-0">
            <svg
              class="size-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium text-yellow-800">
              {{ t('importStopped') }}
            </h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>
                {{ t('importStoppedMessage', { skipped: importResults.skipped }) }}
              </p>
            </div>
            <div class="mt-4">
              <button
                :disabled="importing"
                class="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
                @click="retryImport"
              >
                {{ importing ? t('importing') : t('retryFailedImport') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="mt-6 rounded-md border border-red-200 bg-red-50 p-4"
    >
      <div class="flex">
        <div class="shrink-0">
          <svg
            class="size-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
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
  backToUpload: "Back to Upload"
  foundLocations: "Found {n} location(s). Select which ones to import:"
  selectAll: "Select All"
  selectNone: "Select None"
  unnamedLocation: "Unnamed Location"
  coordinates: "Coordinates"
  importSelected: "Import | Import {n} Selected Location | Import {n} Selected Locations"
  importingProgress: "Importing... {current}/{total} ({percentage}%)"
  importing: "Importing..."
  importResults: "Import Results"
  successfullyImported: "Successfully Imported ({n})"
  importErrors: "Import Errors ({n})"
  importStopped: "Import Stopped"
  importStoppedMessage: "Import was stopped after the first error occurred. {skipped} location(s) were not processed."
  retryFailedImport: "Retry Failed Import"
  error: "Error"
et:
  errorNoAccount: "Puudub parameeter \"account\"!"
  errorNoType: "Puudub parameeter \"type\"!"
  errorNoToken: "Puudub parameeter \"token\"!"
  errorInvalidFile: "Palun valige KML või XML fail"
  errorSelectFile: "Palun valige fail"
  errorSelectOneLocation: "Palun valige vähemalt üks asukoht importimiseks"
  uploadText: "Lohista KML fail siia või klõpsa siin, et fail valida."
  reviewLocations: "Asukohtade ülevaade"
  backToUpload: "Tagasi üleslaadimisele"
  foundLocations: "Leitud {n} asukoht(a). Valige, millised importida:"
  selectAll: "Vali kõik"
  selectNone: "Tühista valik"
  unnamedLocation: "Nimetu asukoht"
  coordinates: "Koordinaadid"
  importSelected: "Impordi | Impordi {n} valitud asukoht | Impordi {n} valitud asukohta"
  importingProgress: "Importimine... {current}/{total} ({percentage}%)"
  importing: "Importimine..."
  importResults: "Importimise tulemused"
  successfullyImported: "Edukalt imporditud ({n})"
  importErrors: "Importimise vead ({n})"
  importStopped: "Importimine peatatud"
  importStoppedMessage: "Importimine peatati pärast esimest viga. {skipped} asukoht(a) jäi töötlemata."
  retryFailedImport: "Proovi ebaõnnestunud importi uuesti"
  error: "Viga"
</i18n>
