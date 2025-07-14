<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">KML Import</h1>

      <!-- Step 1: File Upload -->
      <div v-if="step === 'upload'" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Upload KML File</h2>

        <div class="mb-6">
          <label for="kml-file" class="block text-sm font-medium text-gray-700 mb-2">
            Select KML File
          </label>
          <input
            id="kml-file"
            ref="fileInput"
            type="file"
            accept=".kml,.xml"
            @change="handleFileSelect"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="mt-2 text-sm text-gray-500">
            Select a KML file to import locations from.
          </p>
        </div>

        <button
          @click="parseKML"
          :disabled="!selectedFile || parsing"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {{ parsing ? 'Parsing KML...' : 'Parse KML File' }}
        </button>
      </div>

      <!-- Step 2: Review Locations -->
      <div v-if="step === 'review'" class="bg-white shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Review Locations</h2>
          <button
            @click="goBackToUpload"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Upload
          </button>
        </div>

        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Found {{ locations.length }} location(s). Select which ones to import:
          </p>
          <div class="flex gap-2">
            <button
              @click="selectAll"
              class="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Select All
            </button>
            <button
              @click="selectNone"
              class="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Select None
            </button>
          </div>
        </div>

        <div class="mb-6 max-h-96 overflow-y-auto border border-gray-200 rounded-md">
          <div
            v-for="(location, index) in locations"
            :key="index"
            class="flex items-start p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
          >
            <input
              :id="`location-${index}`"
              v-model="location.selected"
              type="checkbox"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div class="ml-3 flex-1 min-w-0">
              <label :for="`location-${index}`" class="block text-sm font-medium text-gray-900 cursor-pointer">
                {{ location.name || 'Unnamed Location' }}
              </label>
              <p class="text-sm text-gray-500">
                Coordinates: {{ location.coordinates[1].toFixed(6) }}, {{ location.coordinates[0].toFixed(6) }}
              </p>
              <p v-if="location.description" class="text-sm text-gray-600 mt-1">
                {{ location.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            @click="importSelected"
            :disabled="!hasSelectedLocations || importing"
            class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {{ importing ? 'Importing...' : `Import ${selectedCount} Selected Location(s)` }}
          </button>
        </div>
      </div>

      <!-- Step 3: Import Results -->
      <div v-if="step === 'results'" class="bg-white shadow rounded-lg p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Import Results</h2>
        </div>

        <div v-if="importResults.success.length > 0" class="mb-6">
          <h3 class="text-lg font-medium text-green-800 mb-2">
            Successfully Imported ({{ importResults.success.length }})
          </h3>
          <div class="bg-green-50 border border-green-200 rounded-md p-4">
            <ul class="list-disc list-inside space-y-1">
              <li v-for="result in importResults.success" :key="result.name" class="text-sm text-green-700">
                <a
                  v-if="result.entityId"
                  :href="`${runtimeConfig.public.entuUrl}/${query.account}/${result.entityId}#edit`"
                  target="_blank"
                  class="text-green-600 hover:text-green-800 underline"
                >
                  {{ result.name || 'Unnamed Location' }}
                </a>
                <span v-else>
                  {{ result.name || 'Unnamed Location' }}
                </span>
                <span v-if="result.entityId" class="text-green-600 ml-1">
                  (ID: {{ result.entityId }})
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="importResults.errors.length > 0" class="mb-6">
          <h3 class="text-lg font-medium text-red-800 mb-2">
            Import Errors ({{ importResults.errors.length }})
          </h3>
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <ul class="list-disc list-inside space-y-1">
              <li v-for="error in importResults.errors" :key="error.name" class="text-sm text-red-700">
                {{ error.name || 'Unnamed Location' }}: {{ error.error }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="importResults.stopped" class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-yellow-800">
                Import Stopped
              </h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>Import was stopped after the first error occurred. {{ importResults.skipped }} location(s) were not processed.</p>
              </div>
              <div class="mt-4">
                <button
                  @click="retryImport"
                  :disabled="importing"
                  class="bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {{ importing ? 'Importing...' : 'Retry Failed Import' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as toGeoJSON from '@tmcw/togeojson'

const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const { query } = route

// Reactive state
const step = ref('upload')
const selectedFile = ref(null)


const locations = ref([])
const parsing = ref(false)
const importing = ref(false)
const error = ref('')
const importResults = ref({
  success: [],
  errors: [],
  stopped: false,
  skipped: 0
})

// Refs
const fileInput = ref(null)

// Computed properties
const hasSelectedLocations = computed(() =>
  locations.value.some(location => location.selected)
)

const selectedCount = computed(() =>
  locations.value.filter(location => location.selected).length
)



// Initialize from URL parameters
onMounted(async () => {
  // Validate required parameters
  if (!query.account) {
    error.value = 'Missing account parameter in URL'
    return
  }

  if (!query.token) {
    error.value = 'Missing token parameter in URL'
    return
  }

  if (!query.type) {
    error.value = 'Missing type parameter in URL'
    return
  }
})



// Helper function to clean up HTML descriptions and convert links to markdown
const cleanDescription = (description) => {
  if (!description) return ''

  // Handle cases where description might be an object
  let htmlContent = ''
  if (typeof description === 'string') {
    htmlContent = description
  } else if (typeof description === 'object' && description.value) {
    // Handle structured description objects like { "@type": "html", "value": "..." }
    htmlContent = description.value
  } else if (typeof description === 'object') {
    // Try to extract any string content from the object
    htmlContent = description.toString()
  } else {
    return ''
  }

  // Create a temporary DOM element to work with the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  // Convert <br> tags to newlines before processing links
  tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n')

  // Convert links to markdown format before extracting text
  const links = tempDiv.querySelectorAll('a')
  links.forEach(link => {
    const href = link.getAttribute('href')
    const text = link.textContent || link.innerText || href

    if (href) {
      // Replace the link element with markdown format [text](url)
      const markdownLink = `[${text}](${href})`
      link.outerHTML = markdownLink
    }
  })

  // Also handle plain URLs that aren't wrapped in <a> tags
  let textContent = tempDiv.textContent || tempDiv.innerText || ''

  // Convert plain URLs to markdown links (basic pattern)
  textContent = textContent.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)')

  // Clean up extra whitespace but preserve line breaks
  // First normalize line breaks, then clean up spaces
  return textContent
    .replace(/\r\n/g, '\n')  // normalize Windows line breaks
    .replace(/\r/g, '\n')    // normalize Mac line breaks
    .replace(/[ \t]+/g, ' ') // collapse spaces and tabs, but keep newlines
    .replace(/\n\s*/g, '\n') // clean up spaces after line breaks
    .replace(/\n{3,}/g, '\n\n') // limit consecutive line breaks to max 2
    .trim()
}

// Methods
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    error.value = ''
  }
}

const parseKML = async () => {
  if (!selectedFile.value) {
    error.value = 'Please select a file'
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
          if (!Array.isArray(coordinates) || coordinates.length < 2 ||
              typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' ||
              isNaN(coordinates[0]) || isNaN(coordinates[1])) {
            continue // Skip invalid coordinates
          }

          const location = {
            name: (feature.properties?.name || '').trim(),
            description: cleanDescription(feature.properties?.description),
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
    step.value = 'review'
  } catch (err) {
    error.value = `Failed to parse KML file: ${err.message}`
  } finally {
    parsing.value = false
  }
}

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

const selectAll = () => {
  locations.value.forEach(location => {
    location.selected = true
  })
}

const selectNone = () => {
  locations.value.forEach(location => {
    location.selected = false
  })
}

const goBackToUpload = () => {
  step.value = 'upload'
  error.value = ''
}

const importSelected = async () => {
  const selectedLocations = locations.value.filter(location => location.selected)

  if (selectedLocations.length === 0) {
    error.value = 'Please select at least one location to import'
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
            name: location.name || 'Unnamed Location',
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
      } catch (err) {
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

    step.value = 'results'
  } catch (err) {
    error.value = `Import failed: ${err.message}`
  } finally {
    importing.value = false
  }
}

const createEntity = async (entityData) => {
  // Prepare properties for Entu API
  const properties = [
    { type: '_type', string: query.type }
  ]

  // Add parent if specified in URL
  if (query.parent) {
    properties.push({ type: '_parent', reference: query.parent })
  }

  // Add entity-specific properties
  if (entityData.properties.name) {
    properties.push({ type: 'name', string: entityData.properties.name.trim() })
  }

  if (entityData.properties.description) {
    properties.push({ type: 'kirjeldus', string: entityData.properties.description.trim() })
  }

  // Add coordinates as separate latitude and longitude properties
  if (entityData.properties.coordinates) {
    properties.push({
      type: 'lat',
      number: entityData.properties.coordinates.latitude
    })
    properties.push({
      type: 'long',
      number: entityData.properties.coordinates.longitude
    })
  }

  // Make API call to create entity
  const result = await fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${query.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(properties)
  })

  if (!result.ok) {
    const errorText = await result.text()
    throw new Error(`API request failed (${result.status}): ${errorText}`)
  }

  const response = await result.json()
  return response._id
}

const retryImport = async () => {
  // Go back to review step and allow user to retry import
  step.value = 'review'
  error.value = ''
}

const startOver = () => {
  step.value = 'upload'
  selectedFile.value = null
  locations.value = []
  error.value = ''
  importResults.value = {
    success: [],
    errors: [],
    stopped: false,
    skipped: 0
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>
