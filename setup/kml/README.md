# Entu Map Application Setup

This folder contains the automated setup scripts and documentation for creating the Entu map application structure.

## Quick Start

1. **Copy environment template:**

   ```bash
   cp .env.template .env
   ```

2. **Edit the `.env` file** with your Entu credentials:

   ```bash
   # Minimal configuration (host defaults to entu.app)
   ENTU_ACCOUNT=your_account
   ENTU_TOKEN=your_jwt_token

   # Optional: Override host for custom instances
   # ENTU_HOST=custom.entu.instance.com
   ```

3. **Run the complete setup:**

   ```bash
   npm start
   ```

## Configuration

### Environment Variables

The `.env` file supports the following configuration:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENTU_ACCOUNT` | ✅ Yes | - | Your Entu account name |
| `ENTU_TOKEN` | ✅ Yes | - | Your JWT authentication token |
| `ENTU_HOST` | ❌ Optional | `entu.app` | Entu server hostname (for custom instances) |

### Minimal Configuration

For most users, only account and token are needed:

```bash
ENTU_ACCOUNT=your_account
ENTU_TOKEN=your_jwt_token
```

### Custom Host Configuration

For enterprise or self-hosted Entu instances:

```bash
ENTU_HOST=custom.entu.instance.com
ENTU_ACCOUNT=your_account
ENTU_TOKEN=your_jwt_token
```

### Auto-Discovery

All entity IDs and relationships are **automatically discovered** and saved to `.env`. You don't need to manually configure:

- Database entity IDs
- Entity definition IDs
- Property definition IDs
- Menu entity IDs

## Available Scripts

- `npm run discover` - Discover and inspect existing Entu environment (read-only)
- `npm start` - **Main workflow**: Complete setup with fresh discovery + entity creation

> 💡 **Recommended workflow**: Use `npm start` for the complete setup process. The `discover` script is available for debugging and inspection without making changes.## Files

### Scripts

- `bin/discover.js` - Environment discovery CLI (read-only database scanning)
- `bin/setup.js` - Setup CLI (creates missing entities, properties, and relationships)

### Configuration Files

- `.env.template` - Environment template file
- `.env` - Your environment configuration (create from template)
- `package.json` - NPM configuration with setup scripts

### HTTP Files (for manual setup)

- `archive/entity-types-creation.http` - Manual HTTP requests for entity type creation
- `archive/map-app-creation.http` - Manual HTTP requests for map app setup
- `archive/map-app-init.http` - Manual HTTP requests for initialization
- `archive/setup-map-app.js` - Legacy setup script (archived)

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
