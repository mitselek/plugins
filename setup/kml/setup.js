#!/usr/bin/env node

/**
 * Entu Map App Setup Script
 *
 * This script sets up the map application structure in Entu:
 * - Reads environment configuration from .env file
 * - Creates missing Kaart (Map) and Asukoht (Location) en    this.existingProperties = [];

    // Define all properties that should exist based on the database structurey types
 * - Sets up properties and menu items
 * - Establishes proper relationships
 *
 * Prerequisites: Run discover-entu-env.js first to populate .env file
 */

import readline from 'readline'
import fs from 'fs/promises'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Colors for better console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

class EntuMapAppSetup {
  constructor () {
    this.config = {}
    this.environment = {}
    this.createdEntities = {}
    this.existingProperties = {}
    this.existingRelationships = {}
  }

  log (message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  async prompt (question) {
    return new Promise((resolve) => {
      rl.question(question, resolve)
    })
  }

  async apiRequest (url, options = {}) {
    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${this.config.token}`
      }
    }

    if (options.method === 'POST' && options.body) {
      defaultOptions.headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(url, { ...defaultOptions, ...options })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    }
    catch (error) {
      this.log(`API Error: ${error.message}`, 'red')
      throw error
    }
  }

  async loadEnvironment () {
    this.log('\n🚀 Entu Map App Setup', 'bold')
    this.log('=====================================', 'cyan')

    // Load from .env file
    try {
      const envContent = await fs.readFile('.env', 'utf8')
      const envLines = envContent.split('\n')

      for (const line of envLines) {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=', 2)
          const cleanKey = key.trim()
          const cleanValue = value.trim()

          if (cleanValue) { // Only set non-empty values
            process.env[cleanKey] = cleanValue
          }
        }
      }
      this.log('✅ Loaded environment from .env file', 'green')
    }
    catch (error) {
      this.log('❌ Failed to load .env file. The discovery script should have created it.', 'red')
      this.log(`💡 Error details: ${error.message}`, 'yellow')
      this.log('💡 If running manually, ensure discover-entu-env.js ran successfully first.', 'yellow')
      throw new Error('No .env file found')
    }

    // Validate required environment variables
    const required = [
      'ENTU_HOST', 'ENTU_ACCOUNT', 'ENTU_TOKEN',
      'DATABASE_ENTITY_ID', 'ENTITY_DEFINITION_ID',
      'PROPERTY_DEFINITION_ID', 'MENU_DEFINITION_ID'
    ]

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }

    // Set configuration
    this.config.host = process.env.ENTU_HOST
    this.config.account = process.env.ENTU_ACCOUNT
    this.config.token = process.env.ENTU_TOKEN

    // Set environment IDs
    this.environment.databaseEntityId = process.env.DATABASE_ENTITY_ID
    this.environment.entityEntityDefinitionId = process.env.ENTITY_DEFINITION_ID
    this.environment.propertyEntityDefinitionId = process.env.PROPERTY_DEFINITION_ID
    this.environment.menuEntityDefinitionId = process.env.MENU_DEFINITION_ID

    // Check for existing entities
    this.environment.kaartEntityDefinitionId = process.env.KAART_ENTITY_DEFINITION_ID
    this.environment.asukohtEntityDefinitionId = process.env.ASUKOHT_ENTITY_DEFINITION_ID
    this.environment.kaartMenuEntityId = process.env.KAART_MENU_ENTITY_ID
    this.environment.asukohtMenuEntityId = process.env.ASUKOHT_MENU_ENTITY_ID

    this.log(`\n📋 Configuration:`, 'cyan')
    this.log(`   Host: ${this.config.host}`, 'blue')
    this.log(`   Account: ${this.config.account}`, 'blue')
    this.log(`   Database: ${this.environment.databaseEntityId}`, 'blue')

    if (this.environment.kaartEntityDefinitionId) {
      this.log(`   Existing Kaart Entity: ${this.environment.kaartEntityDefinitionId}`, 'yellow')
    }

    if (this.environment.asukohtEntityDefinitionId) {
      this.log(`   Existing Asukoht Entity: ${this.environment.asukohtEntityDefinitionId}`, 'yellow')
    }
  }

  async createKaartEntity () {
    if (this.environment.kaartEntityDefinitionId) {
      this.log('⏭️  Skipping Kaart entity creation (already exists)', 'yellow')
      return this.environment.kaartEntityDefinitionId
    }

    this.log('\n📝 Creating Kaart (Map) entity type...', 'cyan')

    const kaartData = [
      { type: '_type', reference: this.environment.entityEntityDefinitionId },
      { type: 'name', string: 'kaart' },
      { type: 'label', string: 'Kaart', language: 'et' },
      { type: 'label', string: 'Map', language: 'en' },
      { type: 'label_plural', string: 'Kaardid', language: 'et' },
      { type: 'label_plural', string: 'Maps', language: 'en' },
      { type: '_parent', reference: this.environment.databaseEntityId }
    ]

    try {
      const result = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity`,
        {
          method: 'POST',
          body: JSON.stringify(kaartData)
        }
      )

      this.environment.kaartEntityDefinitionId = result._id
      this.createdEntities.kaart = result._id
      this.log(`✅ Kaart entity created: ${result._id}`, 'green')
      return result._id
    }
    catch (error) {
      this.log(`❌ Failed to create Kaart entity: ${error.message}`, 'red')
      throw error
    }
  }

  async createAsukohtEntity () {
    if (this.environment.asukohtEntityDefinitionId) {
      this.log('⏭️  Skipping Asukoht entity creation (already exists)', 'yellow')
      return this.environment.asukohtEntityDefinitionId
    }

    this.log('\n📝 Creating Asukoht (Location) entity type...', 'cyan')

    const asukohtData = [
      { type: '_type', reference: this.environment.entityEntityDefinitionId },
      { type: 'name', string: 'asukoht' },
      { type: 'label', string: 'Asukoht', language: 'et' },
      { type: 'label', string: 'Location', language: 'en' },
      { type: 'label_plural', string: 'Asukohad', language: 'et' },
      { type: 'label_plural', string: 'Locations', language: 'en' },
      { type: '_parent', reference: this.environment.databaseEntityId },
      { type: 'add_from', reference: this.environment.kaartEntityDefinitionId }
    ]

    try {
      const result = await this.apiRequest(
        `https://${this.config.host}/api/${this.config.account}/entity`,
        {
          method: 'POST',
          body: JSON.stringify(asukohtData)
        }
      )

      this.environment.asukohtEntityDefinitionId = result._id
      this.createdEntities.asukoht = result._id
      this.log(`✅ Asukoht entity created: ${result._id}`, 'green')
      return result._id
    }
    catch (error) {
      this.log(`❌ Failed to create Asukoht entity: ${error.message}`, 'red')
      throw error
    }
  }

  async checkExistingProperties () {
    this.log('\n🔎 Checking existing properties...', 'yellow')

    this.existingProperties = {}

    // Skip property checking if entities don't exist yet
    if (!this.environment.kaartEntityDefinitionId || !this.environment.asukohtEntityDefinitionId) {
      this.log('⏭️  Skipping property check (entities not created yet)', 'yellow')
      return
    }

    // Define all properties that should exist based on the database structure
    const expectedProperties = [
      // Kaart properties
      { name: 'name', entity: 'kaart', parent: this.environment.kaartEntityDefinitionId },
      { name: 'kirjeldus', entity: 'kaart', parent: this.environment.kaartEntityDefinitionId },
      { name: 'url', entity: 'kaart', parent: this.environment.kaartEntityDefinitionId },

      // Asukoht properties
      { name: 'name', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId },
      { name: 'kirjeldus', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId },
      { name: 'long', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId },
      { name: 'lat', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId },
      { name: 'photo', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId },
      { name: 'link', entity: 'asukoht', parent: this.environment.asukohtEntityDefinitionId }
    ]

    for (const prop of expectedProperties) {
      try {
        const result = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity?name.string=${prop.name}&_parent.reference=${prop.parent}&_type.reference=${this.environment.propertyEntityDefinitionId}&props=_id,name&limit=1`
        )

        if (result.entities && result.entities.length > 0) {
          this.existingProperties[`${prop.name}_${prop.entity}`] = result.entities[0]
          this.log(`✅ Property '${prop.name}' exists for ${prop.entity}: ${result.entities[0]._id}`, 'green')
        }
        else {
          this.log(`❌ Property '${prop.name}' missing for ${prop.entity} (will be created)`, 'red')
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check property ${prop.name} for ${prop.entity}: ${error.message}`, 'yellow')
      }
    }
  }

  async createProperties () {
    this.log('\n📝 Creating properties...', 'cyan')

    // Define all properties that match the actual database structure
    const properties = [
      // Kaart properties
      {
        name: 'name',
        label_et: 'Nimi',
        label_en: 'Name',
        datatype: 'string',
        entity: this.environment.kaartEntityDefinitionId,
        public: true,
        search: true,
        ordinal: 1
      },
      {
        name: 'kirjeldus',
        label_et: 'Kirjeldus',
        label_en: 'Description',
        datatype: 'text',
        entity: this.environment.kaartEntityDefinitionId,
        markdown: true,
        public: true,
        search: true,
        ordinal: 2
      },
      {
        name: 'url',
        label_et: 'URL',
        label_en: 'URL',
        datatype: 'string',
        entity: this.environment.kaartEntityDefinitionId,
        public: true,
        multilingual: false,
        ordinal: 3
      },

      // Asukoht properties
      {
        name: 'name',
        label_et: 'Nimi',
        label_en: 'Name',
        datatype: 'string',
        entity: this.environment.asukohtEntityDefinitionId,
        public: true,
        search: true,
        ordinal: 1
      },
      {
        name: 'kirjeldus',
        label_et: 'Kirjeldus',
        label_en: 'Description',
        datatype: 'text',
        entity: this.environment.asukohtEntityDefinitionId,
        markdown: true,
        public: true,
        search: true,
        ordinal: 2
      },
      {
        name: 'long',
        label_et: 'Pikkuskraad',
        label_en: 'Longitude',
        datatype: 'number',
        entity: this.environment.asukohtEntityDefinitionId,
        public: true,
        ordinal: 3
      },
      {
        name: 'lat',
        label_et: 'Laiuskraad',
        label_en: 'Latitude',
        datatype: 'number',
        entity: this.environment.asukohtEntityDefinitionId,
        public: true,
        ordinal: 4
      },
      {
        name: 'photo',
        label_et: 'Pilt',
        label_en: 'Picture',
        datatype: 'file',
        entity: this.environment.asukohtEntityDefinitionId,
        public: true,
        ordinal: 5
      },
      {
        name: 'link',
        label_et: 'Link',
        label_en: 'Link',
        datatype: 'string',
        entity: this.environment.asukohtEntityDefinitionId,
        public: true,
        multilingual: false,
        ordinal: 6
      }
    ]

    for (const prop of properties) {
      // Check if property already exists
      const entityType = prop.entity === this.environment.kaartEntityDefinitionId ? 'kaart' : 'asukoht'
      const propKey = `${prop.name}_${entityType}`
      if (this.existingProperties[propKey]) {
        this.log(`⏭️  Skipping property '${prop.name}' for ${entityType} (already exists)`, 'yellow')
        continue
      }

      try {
        const propertyData = [
          { type: '_type', reference: this.environment.propertyEntityDefinitionId },
          { type: '_parent', reference: prop.entity },
          { type: 'name', string: prop.name },
          { type: 'label', string: prop.label_et, language: 'et' },
          { type: 'label', string: prop.label_en, language: 'en' },
          { type: 'type', string: prop.datatype },
          { type: 'public', boolean: prop.public || false },
          { type: 'ordinal', number: prop.ordinal }
        ]

        // Add optional properties
        if (prop.search) propertyData.push({ type: 'search', boolean: true })
        if (prop.markdown) propertyData.push({ type: 'markdown', boolean: true })
        if (prop.multilingual === false) propertyData.push({ type: 'multilingual', boolean: false })

        const result = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity`,
          {
            method: 'POST',
            body: JSON.stringify(propertyData)
          }
        )

        const entityType = prop.entity === this.environment.kaartEntityDefinitionId ? 'kaart' : 'asukoht'
        this.log(`✅ Property created: ${prop.name} for ${entityType} (${result._id})`, 'green')
      }
      catch (error) {
        const entityType = prop.entity === this.environment.kaartEntityDefinitionId ? 'kaart' : 'asukoht'
        this.log(`⚠️  Failed to create property ${prop.name} for ${entityType}: ${error.message}`, 'yellow')
      }
    }
  }

  async createMenus () {
    this.log('\n📝 Creating menu items...', 'cyan')

    // Check if menus already exist
    if (this.environment.kaartMenuEntityId && this.environment.asukohtMenuEntityId) {
      this.log('⏭️  Skipping menu creation (already exist)', 'yellow')
      return
    }

    const menus = [
      {
        name_et: 'Kaardid',
        name_en: 'Maps',
        group_et: 'Kaardirakendus',
        group_en: 'Map App',
        entity: this.environment.kaartEntityDefinitionId,
        sort: 100
      },
      {
        name_et: 'Asukohad',
        name_en: 'Locations',
        group_et: 'Kaardirakendus',
        group_en: 'Map App',
        entity: this.environment.asukohtEntityDefinitionId,
        sort: 200
      }
    ]

    for (const menu of menus) {
      const isKaartMenu = menu.name_et === 'Kaardid'
      const existingMenuId = isKaartMenu ? this.environment.kaartMenuEntityId : this.environment.asukohtMenuEntityId

      if (existingMenuId) {
        this.log(`⏭️  Skipping ${menu.name_et} menu (already exists)`, 'yellow')
        continue
      }

      // Check if menu exists in database (even if not in .env)
      try {
        const existingResult = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity?entity.reference=${menu.entity}&_parent.reference=${this.environment.databaseEntityId}&_type.reference=${this.environment.menuEntityDefinitionId}&props=_id,name&limit=1`
        )

        if (existingResult.entities && existingResult.entities.length > 0) {
          const existingMenu = existingResult.entities[0]
          if (isKaartMenu) {
            this.environment.kaartMenuEntityId = existingMenu._id
          }
          else {
            this.environment.asukohtMenuEntityId = existingMenu._id
          }
          this.log(`✅ Found existing ${menu.name_et} menu: ${existingMenu._id}`, 'green')
          continue
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check for existing ${menu.name_et} menu: ${error.message}`, 'yellow')
      }

      try {
        const menuData = [
          { type: '_type', reference: this.environment.menuEntityDefinitionId },
          { type: 'name', string: menu.name_et, language: 'et' },
          { type: 'name', string: menu.name_en, language: 'en' },
          { type: 'group', string: menu.group_et, language: 'et' },
          { type: 'group', string: menu.group_en, language: 'en' },
          { type: 'entity', reference: menu.entity },
          { type: 'sort', integer: menu.sort },
          { type: '_parent', reference: this.environment.databaseEntityId }
        ]

        const result = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity`,
          {
            method: 'POST',
            body: JSON.stringify(menuData)
          }
        )

        this.log(`✅ Menu created: ${menu.name_et} (${result._id})`, 'green')

        if (isKaartMenu) {
          this.environment.kaartMenuEntityId = result._id
          this.createdEntities.kaartMenu = result._id
        }
        else {
          this.environment.asukohtMenuEntityId = result._id
          this.createdEntities.asukohtMenu = result._id
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to create menu ${menu.name_et}: ${error.message}`, 'yellow')
      }
    }
  }

  async checkExistingRelationships () {
    this.log('\n🔎 Checking existing relationships...', 'yellow')

    this.existingRelationships = {
      asukohtFromKaart: false,
      kaartFromMenu: false
    }

    // Check if Asukoht entity already has add_from relationship to Kaart
    if (this.environment.asukohtEntityDefinitionId && this.environment.kaartEntityDefinitionId) {
      try {
        const result = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity/${this.environment.asukohtEntityDefinitionId}?props=add_from`
        )

        if (result.entity && result.entity.add_from) {
          const hasKaartRelation = result.entity.add_from.some((relation) =>
            relation.reference === this.environment.kaartEntityDefinitionId
          )

          if (hasKaartRelation) {
            this.existingRelationships.asukohtFromKaart = true
            this.log(`⚠️  Relationship 'add_from Kaart to Asukoht' already exists`, 'yellow')
          }
          else {
            this.log(`✅ Relationship 'add_from Kaart to Asukoht' does not exist (will be created)`, 'green')
          }
        }
        else {
          this.log(`✅ No add_from relationships on Asukoht entity (will be created)`, 'green')
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check Asukoht relationships: ${error.message}`, 'yellow')
      }
    }

    // Check if Kaart entity already has add_from relationship to Kaardid menu
    if (this.environment.kaartEntityDefinitionId && this.environment.kaartMenuEntityId) {
      try {
        const result = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity/${this.environment.kaartEntityDefinitionId}?props=add_from`
        )

        if (result.entity && result.entity.add_from) {
          const hasMenuRelation = result.entity.add_from.some((relation) =>
            relation.reference === this.environment.kaartMenuEntityId
          )

          if (hasMenuRelation) {
            this.existingRelationships.kaartFromMenu = true
            this.log(`⚠️  Relationship 'add_from Kaardid menu to Kaart' already exists`, 'yellow')
          }
          else {
            this.log(`✅ Relationship 'add_from Kaardid menu to Kaart' does not exist (will be created)`, 'green')
          }
        }
        else {
          this.log(`✅ No add_from relationships on Kaart entity (will be created)`, 'green')
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check Kaart relationships: ${error.message}`, 'yellow')
      }
    }
  }

  async setupRelationships () {
    this.log('\n📝 Setting up relationships...', 'cyan')

    let relationshipsCreated = 0

    // Handle Asukoht -> Kaart relationship
    if (this.existingRelationships && this.existingRelationships.asukohtFromKaart) {
      this.log('⏭️  Skipping add_from Kaart to Asukoht relationship (already exists)', 'yellow')
    }
    else {
      // If Asukoht entity was just created, the relationship should already be set during creation
      if (this.createdEntities.asukoht) {
        this.log('✅ Asukoht -> Kaart relationship created during entity creation', 'green')
      }
      else if (this.environment.asukohtEntityDefinitionId && this.environment.kaartEntityDefinitionId) {
        this.log('📝 Adding missing add_from Kaart to Asukoht relationship...', 'cyan')

        try {
          const relationshipData = [
            { type: 'add_from', reference: this.environment.kaartEntityDefinitionId }
          ]

          await this.apiRequest(
            `https://${this.config.host}/api/${this.config.account}/entity/${this.environment.asukohtEntityDefinitionId}`,
            {
              method: 'POST',
              body: JSON.stringify(relationshipData)
            }
          )

          this.log('✅ Asukoht -> Kaart relationship created successfully', 'green')
          relationshipsCreated++
        }
        catch (error) {
          this.log(`⚠️  Failed to create Asukoht -> Kaart relationship: ${error.message}`, 'yellow')
        }
      }
    }

    // Handle Kaart -> Menu relationship
    if (this.existingRelationships && this.existingRelationships.kaartFromMenu) {
      this.log('⏭️  Skipping add_from Kaardid menu to Kaart relationship (already exists)', 'yellow')
    }
    else {
      if (this.environment.kaartEntityDefinitionId && this.environment.kaartMenuEntityId) {
        this.log('📝 Adding add_from Kaardid menu to Kaart relationship...', 'cyan')

        try {
          const relationshipData = [
            { type: 'add_from', reference: this.environment.kaartMenuEntityId }
          ]

          await this.apiRequest(
            `https://${this.config.host}/api/${this.config.account}/entity/${this.environment.kaartEntityDefinitionId}`,
            {
              method: 'POST',
              body: JSON.stringify(relationshipData)
            }
          )

          this.log('✅ Kaart -> Menu relationship created successfully', 'green')
          relationshipsCreated++
        }
        catch (error) {
          this.log(`⚠️  Failed to create Kaart -> Menu relationship: ${error.message}`, 'yellow')
        }
      }
      else {
        this.log('⚠️  Cannot create Kaart -> Menu relationship (missing entities)', 'yellow')
      }
    }

    if (relationshipsCreated === 0) {
      this.log('✅ All relationships are properly configured', 'green')
    }
    else {
      this.log(`✅ ${relationshipsCreated} relationship(s) configured`, 'green')
    }
  }

  async updateEnvironmentFile () {
    this.log('\n💾 Updating .env file with created entities...', 'cyan')

    try {
      const envContent = await fs.readFile('.env', 'utf8')
      let updatedContent = envContent

      // Update created entity IDs if they were created (not existing)
      if (this.createdEntities.kaart) {
        if (!updatedContent.includes('KAART_ENTITY_DEFINITION_ID=')) {
          updatedContent += `\n# Created Entity IDs\nKAART_ENTITY_DEFINITION_ID=${this.createdEntities.kaart}`
        }
      }

      if (this.createdEntities.asukoht) {
        if (!updatedContent.includes('ASUKOHT_ENTITY_DEFINITION_ID=')) {
          updatedContent += `\nASUKOHT_ENTITY_DEFINITION_ID=${this.createdEntities.asukoht}`
        }
      }

      if (this.createdEntities.kaartMenu) {
        if (!updatedContent.includes('KAART_MENU_ENTITY_ID=')) {
          updatedContent += `\nKAART_MENU_ENTITY_ID=${this.createdEntities.kaartMenu}`
        }
      }

      if (this.createdEntities.asukohtMenu) {
        if (!updatedContent.includes('ASUKOHT_MENU_ENTITY_ID=')) {
          updatedContent += `\nASUKOHT_MENU_ENTITY_ID=${this.createdEntities.asukohtMenu}`
        }
      }

      await fs.writeFile('.env', updatedContent)
      this.log('✅ Environment file updated', 'green')
    }
    catch (error) {
      this.log(`⚠️  Failed to update .env file: ${error.message}`, 'yellow')
    }
  }

  async run () {
    try {
      await this.loadEnvironment()

      // First, ensure entities exist (detect existing or create new)
      await this.createKaartEntity()
      await this.createAsukohtEntity()

      // Now check all existing components (after entities are known)
      await this.checkExistingProperties()
      await this.checkExistingMenus()
      await this.checkExistingRelationships()

      this.log('\n📋 Setup Plan:', 'cyan')
      this.log(`   ${this.createdEntities.kaart ? '✅ Created' : '⏭️  Found existing'} Kaart entity`, 'blue')
      this.log(`   ${this.createdEntities.asukoht ? '✅ Created' : '⏭️  Found existing'} Asukoht entity`, 'blue')
      this.log(`   ${(this.environment.kaartMenuEntityId && this.environment.asukohtMenuEntityId) ? '⏭️  Skip' : '✅ Create'} menu items`, 'blue')

      // Show property status
      const existingPropsCount = Object.keys(this.existingProperties).length
      const totalExpectedProps = 9 // 3 kaart + 6 asukoht properties
      if (existingPropsCount === totalExpectedProps) {
        this.log('   ⏭️  Skip properties (all exist)', 'blue')
      }
      else if (existingPropsCount > 0) {
        this.log(`   ✅ Create missing properties (${totalExpectedProps - existingPropsCount} remaining)`, 'blue')
      }
      else {
        this.log('   ✅ Create properties', 'blue')
      }

      // Show relationship status
      const missingRelationships = []
      if (!this.existingRelationships.asukohtFromKaart) {
        missingRelationships.push('Asukoht->Kaart')
      }
      if (!this.existingRelationships.kaartFromMenu) {
        missingRelationships.push('Kaart->Menu')
      }

      if (missingRelationships.length === 0) {
        this.log('   ⏭️  Skip relationships (all configured)', 'blue')
      }
      else {
        this.log(`   ✅ Setup relationships (${missingRelationships.join(', ')})`, 'blue')
      }

      const proceed = await this.prompt('\n❓ Proceed with remaining setup? (y/N): ')

      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        this.log('❌ Setup cancelled', 'yellow')
        return
      }

      // Entities already handled above, now do the remaining setup
      await this.createProperties()
      await this.createMenus()
      await this.setupRelationships()
      await this.updateEnvironmentFile()

      this.log('\n🎉 Map app setup completed successfully!', 'green')
      this.log('\n📋 Summary:', 'cyan')
      this.log(`   Kaart entity: ${this.environment.kaartEntityDefinitionId}`, 'blue')
      this.log(`   Asukoht entity: ${this.environment.asukohtEntityDefinitionId}`, 'blue')
      this.log('   Properties and menus created', 'blue')

      this.log('\n📝 Your map application structure is now ready!', 'cyan')
      this.log('   You can now use the KML import plugin to create maps and locations.', 'green')
    }
    catch (error) {
      this.log(`\n💥 Setup failed: ${error.message}`, 'red')
      process.exit(1)
    }
    finally {
      rl.close()
    }
  }

  async checkExistingMenus () {
    this.log('\n🔎 Checking existing menus...', 'yellow')

    // Check for Kaart menu if not already known
    if (!this.environment.kaartMenuEntityId && this.environment.kaartEntityDefinitionId) {
      try {
        const kaartMenuResult = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity?entity.reference=${this.environment.kaartEntityDefinitionId}&_parent.reference=${this.environment.databaseEntityId}&_type.reference=${this.environment.menuEntityDefinitionId}&props=_id,name&limit=1`
        )

        if (kaartMenuResult.entities && kaartMenuResult.entities.length > 0) {
          this.environment.kaartMenuEntityId = kaartMenuResult.entities[0]._id
          this.log(`✅ Found existing Kaart menu: ${kaartMenuResult.entities[0]._id}`, 'green')
        }
        else {
          this.log(`❌ Kaart menu missing (will be created)`, 'red')
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check for existing Kaart menu: ${error.message}`, 'yellow')
      }
    }

    // Check for Asukoht menu if not already known
    if (!this.environment.asukohtMenuEntityId && this.environment.asukohtEntityDefinitionId) {
      try {
        const asukohtMenuResult = await this.apiRequest(
          `https://${this.config.host}/api/${this.config.account}/entity?entity.reference=${this.environment.asukohtEntityDefinitionId}&_parent.reference=${this.environment.databaseEntityId}&_type.reference=${this.environment.menuEntityDefinitionId}&props=_id,name&limit=1`
        )

        if (asukohtMenuResult.entities && asukohtMenuResult.entities.length > 0) {
          this.environment.asukohtMenuEntityId = asukohtMenuResult.entities[0]._id
          this.log(`✅ Found existing Asukoht menu: ${asukohtMenuResult.entities[0]._id}`, 'green')
        }
        else {
          this.log(`❌ Asukoht menu missing (will be created)`, 'red')
        }
      }
      catch (error) {
        this.log(`⚠️  Failed to check for existing Asukoht menu: ${error.message}`, 'yellow')
      }
    }
  }
}

// Run the setup
const setup = new EntuMapAppSetup()
setup.run()
