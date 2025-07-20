# Entu Map Application Setup

This folder contains the automated setup scripts and documentation for creating the Entu map application structure.

## Quick Start

1. **Copy environment template:**

   ```bash
   cp .env.template .env
   ```

2. **Edit the `.env` file** with your Entu credentials:

   ```bash
   ENTU_HOST=entu.app
   ENTU_ACCOUNT=your_account
   ENTU_TOKEN=your_jwt_token
   ```

3. **Run the complete setup:**

   ```bash
   npm run full-setup
   ```

## Available Scripts

- `npm run discover` - Discover existing Entu environment and save to .env
- `npm run setup` - Set up map application structure
- `npm run full-setup` - Run discovery + setup in sequence

## Files

### Scripts

- `discover-entu-env.js` - Environment discovery script
- `setup-map-app-new.js` - Enhanced setup script with duplicate prevention
- `setup-map-app.js` - Original setup script (legacy)

### Configuration

- `.env.template` - Environment template file
- `.env` - Your environment configuration (create from template)
- `package.json` - NPM configuration with setup scripts

### HTTP Files (for manual setup)

- `entity-types-creation.http` - Manual HTTP requests for entity type creation
- `map-app-creation.http` - Manual HTTP requests for map app setup
- `map-app-init.http` - Manual HTTP requests for initialization

## What Gets Created

The setup creates the following structure in your Entu account:

### Entity Types

- **Kaart** (Map) - Container for map applications
- **Asukoht** (Location) - Individual locations on maps

### Properties

- **Kaart properties**: name, kirjeldus (description), url
- **Asukoht properties**: name, kirjeldus, lat (latitude), long (longitude), photo, link

### Relationships

- Asukoht entities can be added from Kaart entities
- Kaart entities can be added from the Kaardid menu

### Menu Items

- **Kaardid** - Menu for listing all maps
- **Asukohad** - Menu for listing all locations

## Features

- ✅ **Duplicate Prevention** - Safely run multiple times without creating duplicates
- ✅ **Environment Discovery** - Automatically detect existing entities
- ✅ **Restoration Support** - Restore missing components if manually deleted
- ✅ **Interactive CLI** - User-friendly prompts and colored output
- ✅ **Comprehensive Validation** - Check all components before creation

## Troubleshooting

1. **Authentication Issues**: Ensure your JWT token is valid and has proper permissions
2. **Duplicate Detection**: If duplicates are created, the script will detect and skip them on next run
3. **Missing Components**: Run the setup again to restore any manually deleted components

## Next Steps

After setup completion, you can:

1. Use the KML import plugin to create maps from KML files
2. Manually create maps and locations through the Entu interface
3. Use the map application structure for your custom applications
