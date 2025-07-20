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

### Auto-Discovery and Caching

All entity IDs, properties, and relationships are **automatically discovered** from your Entu database and cached in `discovery.json`. This temporary cache file:

- 🔄 **Regenerated on each discovery run** - Always reflects current database state
- 🚫 **Git-ignored** - Not committed to version control
- 🗑️ **Deletable** - Can be safely removed anytime
- ⚡ **Performance** - Enables duplicate prevention without repeated API calls

The discovery system performs **fresh database scans** to ensure accuracy, then caches the results for the setup phase.

> 💡 **Note**: Only basic configuration (host, account, token) is stored in `.env`. All discovery data is in the temporary `discovery.json` file.

### Discovery Cache Structure

The `discovery.json` file contains:

```json
{
  "discovery": {
    "timestamp": "2025-07-20T...",
    "version": "1.0.0",
    "properties": {
      "kaart": { "name": "id", "kirjeldus": "id", "url": "id" },
      "asukoht": { "name": "id", "kirjeldus": "id", "long": "id", ... }
    },
    "relationships": {
      "asukoht_add_from_kaart": "relationship_id",
      "kaart_add_from_menu": "relationship_id"
    }
  }
}
```

This structure enables fast duplicate checking during setup while maintaining a clean separation between configuration and discovery data.

## Available Scripts

- `npm run discover` - Discover and cache existing Entu environment (read-only, fresh database scan)
- `npm run setup` - Create missing entities based on discovery results (interactive)
- `npm start` - **Complete workflow**: Fresh discovery + interactive setup

> 💡 **Recommended workflow**: Use `npm start` for the complete setup process. Individual scripts are available for debugging and step-by-step execution.## Files

### Scripts

- `bin/discover.js` - Environment discovery CLI (read-only database scanning)
- `bin/setup.js` - Setup CLI (creates missing entities, properties, and relationships)

### Configuration Files

- `.env.template` - Environment template file
- `.env` - Your environment configuration (create from template)
- `discovery.json` - **Temporary cache** of discovered entities and relationships (auto-generated, git-ignored)
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

- ✅ **Fresh Discovery** - Always scans live database for current state
- ✅ **Duplicate Prevention** - Safely run multiple times without creating duplicates
- ✅ **JSON-based Caching** - Clean separation of config vs discovery data
- ✅ **Restoration Support** - Restore missing components if manually deleted
- ✅ **Interactive CLI** - User-friendly prompts and colored output
- ✅ **Comprehensive Validation** - Check all components before creation
- ✅ **Minimal Configuration** - Only host/account/token needed in .env

## Troubleshooting

1. **Authentication Issues**: Ensure your JWT token is valid and has proper permissions
2. **Duplicate Detection**: If duplicates are created, the script will detect and skip them on next run
3. **Missing Components**: Run the setup again to restore any manually deleted components

## Next Steps

After setup completion, you can:

1. Use the KML import plugin to create maps from KML files
2. Manually create maps and locations through the Entu interface
3. Use the map application structure for your custom applications
