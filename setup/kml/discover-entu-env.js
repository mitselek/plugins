#!/usr/bin/env node

/**
 * Entu Environment Discovery Script
 *
 * This script discovers your Entu environment and existing entities:
 * - Verifies account access and discovers core entity IDs
 * - Checks for existing Kaart (Map) and Asukoht (Location) entities
 * - Detects existing menu items for map application
 * - Saves all discovered information to .env file
 */

import readline from 'readline';
import fs from 'fs/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for better console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class EntuEnvironmentDiscovery {
  constructor() {
    this.config = {};
    this.environment = {};
    this.existingEntities = {
      kaart: null,
      asukoht: null,
      menus: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  async apiRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.config.token}`
      }
    };

    if (options.method === 'POST' && options.body) {
      defaultOptions.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.log(`API Error: ${error.message}`, 'red');
      throw error;
    }
  }

  async loadConfig() {
    this.log('\n🔍 Entu Environment Discovery', 'bold');
    this.log('=====================================', 'cyan');

    // Try to load from .env file first
    try {
      const envContent = await fs.readFile('.env', 'utf8');
      const envLines = envContent.split('\n');

      for (const line of envLines) {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=', 2);
          process.env[key.trim()] = value.trim();
        }
      }
      this.log('✅ Loaded configuration from .env file', 'green');
    } catch {
      this.log('ℹ️  No .env file found, will prompt for configuration', 'yellow');
    }

    // Get configuration from environment or prompts
    const hostInput = process.env.ENTU_HOST || await this.prompt('🌐 Entu host [entu.app]: ');
    this.config.host = hostInput || 'entu.app';
    this.config.account = process.env.ENTU_ACCOUNT || await this.prompt('🏢 Account name: ');
    this.config.token = process.env.ENTU_TOKEN || await this.prompt('🔑 Bearer token: ');

    this.log(`\n📋 Configuration:`, 'cyan');
    this.log(`   Host: ${this.config.host}`, 'blue');
    this.log(`   Account: ${this.config.account}`, 'blue');
    this.log(`   Token: ${this.config.token.substring(0, 20)}...`, 'blue');
  }

  async discoverEnvironment() {
    this.log('\n🔍 Discovering environment...', 'yellow');

    try {
      // Verify account access
      const accountInfo = await this.apiRequest(`https://${this.config.host}/api/${this.config.account}`);
      this.log('✅ Account access verified', 'green');

      // Find database entity
      const databaseResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?_type.string=database&props=_id,name&limit=1`
      );

      if (databaseResult.entities && databaseResult.entities.length > 0) {
        this.environment.databaseEntityId = databaseResult.entities[0]._id;
        this.log(`✅ Database entity found: ${this.environment.databaseEntityId}`, 'green');
      } else {
        throw new Error('Database entity not found');
      }

      // Find entity definition
      const entityResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?name.string=entity&_type.string=entity&props=_id,name&limit=1`
      );

      if (entityResult.entities && entityResult.entities.length > 0) {
        this.environment.entityEntityDefinitionId = entityResult.entities[0]._id;
        this.log(`✅ Entity definition found: ${this.environment.entityEntityDefinitionId}`, 'green');
      } else {
        throw new Error('Entity definition not found');
      }

      // Find property definition
      const propertyResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?name.string=property&_type.string=entity&props=_id,name&limit=1`
      );

      if (propertyResult.entities && propertyResult.entities.length > 0) {
        this.environment.propertyEntityDefinitionId = propertyResult.entities[0]._id;
        this.log(`✅ Property definition found: ${this.environment.propertyEntityDefinitionId}`, 'green');
      } else {
        throw new Error('Property definition not found');
      }

      // Find menu definition
      const menuResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?name.string=menu&_type.string=entity&props=_id,name&limit=1`
      );

      if (menuResult.entities && menuResult.entities.length > 0) {
        this.environment.menuEntityDefinitionId = menuResult.entities[0]._id;
        this.log(`✅ Menu definition found: ${this.environment.menuEntityDefinitionId}`, 'green');
      } else {
        throw new Error('Menu definition not found');
      }

    } catch (error) {
      this.log(`❌ Environment discovery failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async checkExistingEntities() {
    this.log('\n🔎 Checking existing entities...', 'yellow');

    try {
      // Check for existing Kaart entity
      const kaartResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?name.string=kaart&_type.reference=${this.environment.entityEntityDefinitionId}&props=_id,name,label&limit=1`
      );

      this.existingEntities.kaart = kaartResult.entities && kaartResult.entities.length > 0 ? kaartResult.entities[0] : null;

      if (this.existingEntities.kaart) {
        this.log(`⚠️  Kaart entity already exists: ${this.existingEntities.kaart._id}`, 'yellow');
      } else {
        this.log('✅ Kaart entity does not exist (will be created during setup)', 'green');
      }

      // Check for existing Asukoht entity
      const asukohtResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?name.string=asukoht&_type.reference=${this.environment.entityEntityDefinitionId}&props=_id,name,label&limit=1`
      );

      this.existingEntities.asukoht = asukohtResult.entities && asukohtResult.entities.length > 0 ? asukohtResult.entities[0] : null;

      if (this.existingEntities.asukoht) {
        this.log(`⚠️  Asukoht entity already exists: ${this.existingEntities.asukoht._id}`, 'yellow');
      } else {
        this.log('✅ Asukoht entity does not exist (will be created during setup)', 'green');
      }

      // Check for existing map app menus
      const menuResult = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity?group.string=Kaardirakendus&_type.reference=${this.environment.menuEntityDefinitionId}&props=_id,name,group&limit=10`
      );

      this.existingEntities.menus = menuResult.entities || [];

      if (this.existingEntities.menus.length > 0) {
        this.log(`⚠️  Found ${this.existingEntities.menus.length} existing map app menu items:`, 'yellow');
        this.existingEntities.menus.forEach(menu => {
          const nameEt = menu.name?.find(n => n.language === 'et')?.string || 'N/A';
          const nameEn = menu.name?.find(n => n.language === 'en')?.string || 'N/A';
          this.log(`   📋 ${menu._id} - ${nameEt} (${nameEn})`, 'yellow');
        });
      } else {
        this.log('✅ No existing map app menus (will be created during setup)', 'green');
      }

    } catch (error) {
      this.log(`❌ Failed to check existing entities: ${error.message}`, 'red');
      throw error;
    }
  }

  async saveEnvironmentFile() {
    // Build the existing entity IDs section
    let existingEntitiesSection = '';
    if (this.existingEntities.kaart || this.existingEntities.asukoht || this.existingEntities.menus.length > 0) {
      existingEntitiesSection = '\n# Existing Entity IDs (discovered during environment scan)';

      if (this.existingEntities.kaart) {
        existingEntitiesSection += `\nKAART_ENTITY_DEFINITION_ID=${this.existingEntities.kaart._id}`;
      }

      if (this.existingEntities.asukoht) {
        existingEntitiesSection += `\nASUKOHT_ENTITY_DEFINITION_ID=${this.existingEntities.asukoht._id}`;
      }

      if (this.existingEntities.menus.length > 0) {
        existingEntitiesSection += '\n\n# Existing Menu Entity IDs (discovered during environment scan)';
        this.existingEntities.menus.forEach(menu => {
          // Try to identify menu type by name
          const nameEt = menu.name?.find(n => n.language === 'et')?.string || '';
          const nameEn = menu.name?.find(n => n.language === 'en')?.string || '';

          if (nameEt.toLowerCase().includes('kaart') || nameEn.toLowerCase().includes('map')) {
            existingEntitiesSection += `\nKAART_MENU_ENTITY_ID=${menu._id}`;
          } else if (nameEt.toLowerCase().includes('asukoht') || nameEn.toLowerCase().includes('location')) {
            existingEntitiesSection += `\nASUKOHT_MENU_ENTITY_ID=${menu._id}`;
          }
        });
      }
    }

    const envData = `# Entu Map App Environment (Auto-discovered)
ENTU_HOST=${this.config.host}
ENTU_ACCOUNT=${this.config.account}
ENTU_TOKEN=${this.config.token}

# Discovered Entity IDs
DATABASE_ENTITY_ID=${this.environment.databaseEntityId}
ENTITY_DEFINITION_ID=${this.environment.entityEntityDefinitionId}
PROPERTY_DEFINITION_ID=${this.environment.propertyEntityDefinitionId}
MENU_DEFINITION_ID=${this.environment.menuEntityDefinitionId}${existingEntitiesSection}
`;

    try {
      await fs.writeFile('.env', envData);
      this.log('\n💾 Complete environment configuration saved to .env file', 'green');
    } catch (error) {
      this.log(`⚠️  Failed to save .env file: ${error.message}`, 'yellow');
    }
  }

  async run() {
    try {
      await this.loadConfig();
      await this.discoverEnvironment();
      await this.checkExistingEntities();
      await this.saveEnvironmentFile();

      this.log('\n🎉 Environment discovery completed successfully!', 'green');
      this.log('\n📋 Summary:', 'cyan');
      this.log(`   Database: ${this.environment.databaseEntityId}`, 'blue');
      this.log(`   Entity Definition: ${this.environment.entityEntityDefinitionId}`, 'blue');
      this.log(`   Property Definition: ${this.environment.propertyEntityDefinitionId}`, 'blue');
      this.log(`   Menu Definition: ${this.environment.menuEntityDefinitionId}`, 'blue');

      if (this.existingEntities.kaart) {
        this.log(`   Existing Kaart Entity: ${this.existingEntities.kaart._id}`, 'blue');
      }

      if (this.existingEntities.asukoht) {
        this.log(`   Existing Asukoht Entity: ${this.existingEntities.asukoht._id}`, 'blue');
      }

      if (this.existingEntities.menus.length > 0) {
        this.log(`   Existing Menu Items: ${this.existingEntities.menus.length}`, 'blue');
      }

      this.log('\n📝 Next step: Run the setup script to create missing entities/properties', 'cyan');
      this.log('   npm run setup', 'yellow');

    } catch (error) {
      this.log(`\n💥 Discovery failed: ${error.message}`, 'red');
      process.exit(1);
    } finally {
      rl.close();
    }
  }
}

// Run the discovery
const discovery = new EntuEnvironmentDiscovery();
discovery.run();
