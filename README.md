# Entu Plugins

Collection of plugins for importing data into Entu.

## Available Plugins

### CSV Import Plugin (`/csv`)
Import data from CSV files with support for multiple encodings.

### Discogs Import Plugin (`/discogs`)
Search and import music release data from the Discogs database.

### Ester Import Plugin (`/ester`)
Search and import data from the Ester library system.

### Template Import Plugin (`/template`)
Import entity templates and their properties.

## Parameters

All plugins use the same parameter structure:

### Required Parameters
- **`account`** - The Entu account where entities will be created
- **`type`** - The entity type/class for new entities
- **`token`** - Bearer token for API authentication

### Optional Parameters
- **`parent`** - Reference ID of parent entity for hierarchical relationships
- **`locale`** - Interface language (supported: 'en', 'et', etc.)

## Usage Examples

```
/csv?account=myaccount&type=book&token=abc123&parent=library1&locale=et
/discogs?account=musicdb&type=album&token=xyz789&parent=collection1
/ester?account=library&type=book&token=def456&locale=en
/template?account=myaccount&type=entity&token=abc123&parent=templates&locale=et
```

## Usage Notes

- All plugins require authentication via the `token` parameter
- All plugins require `account` and `type` parameters to specify where and what to create
- Missing required parameters will display error messages in the interface
- Imported entities can be organized hierarchically using the `parent` parameter
