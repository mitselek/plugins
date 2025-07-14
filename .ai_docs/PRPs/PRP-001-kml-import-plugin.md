# PRP-001: KML Import Plugin

**Status:** Ready for Implementation

## 1. Problem Statement

Users need a way to import geographical data from KML files into the Entu system. Currently, there is no direct method to upload a KML file and have its placemarks automatically converted into "location" entities associated with a parent "map" entity. This manual process is time-consuming and error-prone.

This PRP proposes the creation of a new plugin that provides a user interface for uploading a KML file and browser-based processing to parse the file and create the corresponding entities.

## 2. Success Criteria

- A new page is available at `/kml`. The plugin receives `account`, `token`, `parent`, and `type` as URL query parameters.
- The parent `kaart` (map) entity is identified by the `parent` URL parameter.
- The entity type is configurable via the `type` URL parameter (e.g., `type=asukoht`).
- The browser successfully parses the uploaded KML file using `@tmcw/togeojson` library in the browser.
- After successful parsing, users are presented with a list of all locations found in the KML file with pre-checked checkboxes for selection.
- Users can review, uncheck unwanted locations, and then proceed with the import of selected items only.
- For each selected `<Placemark>` in the KML file, a new entity is created in Entu using the provided `token` for API authentication.
- The `name`, `description`, and `coordinates` from the Placemark are mapped to the `name`, `kirjeldus`, `long`, and `lat` properties of the entity.
- Elevation coordinates are ignored as specified.
- Extended data and media links are ignored as specified.
- Description is stored as-is without HTML parsing or cleaning.
- Entities without coordinates are created without location data (processing continues).
- Individual entity creation failures stop the entire import process with clear error feedback.
- The newly created entities are linked to the parent entity via `_parent` property.
- The user receives clear error feedback on failures with the ability to retry the import process.
- All code must adhere to the updated project standards, including 500-line file size limits and test coverage.

## 3. Implementation Blueprint

### 3.1. Frontend (Vue Component)

**File:** `app/pages/kml.vue`

This component will handle the complete KML import process in the browser.

**Pattern:** This component will follow the structure of `app/pages/csv.vue`, but with client-side processing instead of server upload.

**Implementation Details:**

```vue
<template>
  <div>
    <!-- Use NUpload for file input (local processing, no server upload) -->
    <!-- Show file name once selected -->
    <!-- After parsing: Display list of locations with checkboxes (pre-checked) -->
    <!-- Allow users to review and uncheck unwanted locations -->
    <!-- Button to trigger import of selected items only -->
    <!-- Real-time progress counter (X of Y selected processed) -->
    <!-- Clear error messages with retry option on failures -->
  </div>
</template>

<script setup>
// 1. Imports (Naive UI components + @tmcw/togeojson)
import { kml } from '@tmcw/togeojson'

// 2. Get `account`, `token`, `parent`, and `type` from URL query parameters
// 3. State management (file object, parsed locations, selected items, loading state, progress, results)
// 4. `handleFileUpload` function to capture and process the file locally
// 5. `parseKMLFile` function:
//    - Read file content as text using FileReader API
//    - Parse XML using DOMParser: new DOMParser().parseFromString(xml, "text/xml")
//    - Convert to GeoJSON using: kml(parsedXML)
//    - Display locations list with pre-checked checkboxes
// 6. `doImport` function:
//    - Validate that locations are selected
//    - For each selected feature, create Entu entity
//    - Direct API calls to Entu from browser
//    - Stop on any API failure with clear error message
</script>
```

### 3.2. No Backend Required

**Architecture Change:** All processing happens in the browser:

- **File Reading**: FileReader API reads KML content as text
- **XML Parsing**: Browser's native DOMParser
- **KML Conversion**: `@tmcw/togeojson` library using `kml(new DOMParser().parseFromString(xml, "text/xml"))`
- **API Calls**: Direct fetch calls to Entu API from browser
- **Authentication**: Use provided token directly in Authorization headers

**Implementation Pattern:**

```javascript
// File reading
const reader = new FileReader()
reader.onload = (event) => {
  const xml = event.target.result

  // Parse and convert
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const geoJSON = kml(doc)

  // Process features
  geoJSON.features.forEach(feature => {
    // Display in UI with checkboxes for user selection
  })

  // User selects which locations to import
  // Then create Entu entities for selected items only
}
reader.readAsText(file)
```

**Benefits:**

- No server-side file handling or storage
- Faster processing (no upload/download)
- Reduced server load
- Works with existing `@tmcw/togeojson` library without modifications

### 3.3. Error Handling Strategy

**Browser-based Processing:**

- Display clear error messages for file reading failures
- Handle XML parsing errors for malformed KML files
- Show real-time progress counter during import
- Stop processing on individual API call failures with clear error messages
- Create entities without coordinates if coordinates are missing/malformed
- Wrap KML parsing in try/catch for malformed files

**Entity Creation Failure Handling:**

- Individual entity creation failures stop the entire import process
- Clear error messages displayed to user with details about the failure
- Users can retry the import after resolving issues

## 4. Technical Specifications

### 4.1. URL Parameters

**Required:**

- `account`: Entu account identifier
- `token`: Authentication token for API access
- `parent`: Parent entity ID (map/kaart entity)
- `type`: Entity type for created locations (e.g., 'asukoht')

**Optional:**

- `locale`: Interface language (en/et)

**Example URL:**

```url
/kml?account=myaccount&token=abc123&parent=map123&type=asukoht&locale=et
```

### 4.2. Data Mapping

**KML to Entu Entity Properties:**

| KML Element | GeoJSON Path | Entu Property | Notes |
|-------------|--------------|---------------|-------|
| `<name>` | `feature.properties.name` | `name` | Optional |
| `<description>` | `feature.properties.description` | `kirjeldus` | Stored as-is, no HTML processing |
| `<coordinates>` longitude | `feature.geometry.coordinates[0]` | `long` | Required for location entities |
| `<coordinates>` latitude | `feature.geometry.coordinates[1]` | `lat` | Required for location entities |
| `<coordinates>` elevation | `feature.geometry.coordinates[2]` | *ignored* | As per requirements |
| - | `query.parent` | `_parent` | Links to parent map entity |
| - | `query.type` | `_type` | Configurable entity type |

### 4.3. File Processing Workflow

1. **Upload**: User selects KML file via NUpload component (local processing only)
2. **File Reading**: FileReader API reads file content as text
3. **XML Parsing**: Browser's DOMParser parses KML XML
4. **Conversion**: `@tmcw/togeojson` converts KML DOM to GeoJSON using `kml(parsedXML)`
5. **Review**: Display list of all found locations with pre-checked checkboxes for user selection
6. **Selection**: Users can uncheck unwanted locations before import
7. **Processing**: For each selected feature in the list:

   - Extract name, description, coordinates
   - Build Entu properties array
   - Direct fetch to Entu API: `${entuUrl}/api/${account}/entity`
   - Stop processing on any individual entity failure

8. **Feedback**: Progress updates and error messages with retry option

### 4.4. Error Handling Matrix

| Error Condition | Behavior | User Feedback |
|-----------------|----------|---------------|
| Invalid KML file | Stop processing | Clear error message |
| File reading error | Stop processing | File access error |
| XML parsing error | Stop processing | Invalid KML format |
| No coordinates | Create entity without location | Continue, note in summary |
| Individual API failure | Stop processing | Clear error message with retry option |
| Authentication failure | Stop processing | Authentication error |
| Network timeout | Stop processing | Network error with retry option |

### 4.5. Performance Considerations

- **File Size**: Tested with files up to 470KB (276+ placemarks)
- **Batch Processing**: Sequential API calls (no parallel to avoid rate limits)
- **Progress Updates**: Real-time counter for user experience
- **Memory Usage**: Stream processing for large files

## 5. Validation Gates

### 5.1. Linting and Formatting

```bash
npm run lint
```

### 5.2. File Size Compliance

```bash
node .ai_docs/scripts/file-size-scanner.js
```

Ensure all files are under 500 lines.

### 5.3. Testing

```bash
# Manual testing with provided KML samples
# Test file reading, parsing, and entity creation workflow
# Verify error handling scenarios in browser environment
```

## 6. Confidence Score

**9/10:** The plan is based on existing, well-understood patterns within the codebase and uses the already-available `@tmcw/togeojson` library. The KML parsing test demonstrates clear data structures with 831 placemarks across sample files. The implementation strategy handles edge cases (missing coordinates, individual failures) gracefully while providing detailed user feedback. The primary risk is unexpected variations in KML file format, which can be mitigated with robust error handling that continues processing even when individual entities fail.
