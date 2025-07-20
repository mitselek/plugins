/**
 * Environment Configuration Handler
 * Clean separation of config loading and validation
 */

import fs from 'fs/promises'
import { Logger } from './logger.js'

export class Environment {
  constructor () {
    this.config = {}
    this.entities = {}
    this.properties = {} // Store discovered properties
    this.relationships = {} // Store discovered relationships
  }

  async loadFromFile (filePath = '.env') {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const lines = content.split('\n')

      for (const line of lines) {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=', 2)
          const cleanKey = key.trim()
          const cleanValue = value.trim()

          if (cleanValue) {
            process.env[cleanKey] = cleanValue
          }
        }
      }

      Logger.success('Environment loaded from .env file')
      return true
    }
    catch (error) {
      Logger.error(`Failed to load .env file: ${error.message}`)
      return false
    }
  }

  loadConfig () {
    this.config = {
      host: process.env.ENTU_HOST || 'entu.app',
      account: process.env.ENTU_ACCOUNT,
      token: process.env.ENTU_TOKEN
    }

    this.entities = {
      databaseEntityId: process.env.DATABASE_ENTITY_ID,
      entityEntityDefinitionId: process.env.ENTITY_DEFINITION_ID,
      propertyEntityDefinitionId: process.env.PROPERTY_DEFINITION_ID,
      menuEntityDefinitionId: process.env.MENU_DEFINITION_ID,
      kaartEntityDefinitionId: process.env.KAART_ENTITY_DEFINITION_ID,
      asukohtEntityDefinitionId: process.env.ASUKOHT_ENTITY_DEFINITION_ID,
      kaartMenuEntityId: process.env.KAART_MENU_ENTITY_ID,
      asukohtMenuEntityId: process.env.ASUKOHT_MENU_ENTITY_ID
    }

    // Load discovered properties from environment
    this.loadDiscoveredProperties()
    this.loadDiscoveredRelationships()
  }

  loadDiscoveredRelationships () {
    this.relationships = {}

    // Parse discovered relationships from environment variables
    const relationshipKeys = [
      'asukoht_add_from_kaart',
      'kaart_add_from_menu'
    ]

    for (const key of relationshipKeys) {
      const envKey = `DISCOVERED_RELATIONSHIP_${key.toUpperCase()}`
      const relationshipId = process.env[envKey]
      if (relationshipId) {
        this.relationships[key] = { _id: relationshipId }
      }
    }
  }

  loadDiscoveredProperties () {
    this.properties = {}

    // Parse discovered properties from environment variables
    const propertyKeys = [
      'name_kaart', 'kirjeldus_kaart', 'url_kaart',
      'name_asukoht', 'kirjeldus_asukoht', 'long_asukoht',
      'lat_asukoht', 'photo_asukoht', 'link_asukoht'
    ]

    for (const key of propertyKeys) {
      const envKey = `DISCOVERED_PROPERTY_${key.toUpperCase()}`
      const propertyId = process.env[envKey]
      if (propertyId) {
        this.properties[key] = { _id: propertyId }
      }
    }
  }

  validateRequired (requiredKeys = ['host', 'account', 'token']) {
    const missing = requiredKeys.filter((key) => !this.config[key])

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`)
    }
  }

  async saveToFile (filePath = '.env') {
    const content = this.generateEnvContent()

    try {
      await fs.writeFile(filePath, content)
      Logger.success('Environment configuration saved')
    }
    catch (error) {
      Logger.warning(`Failed to save .env file: ${error.message}`)
    }
  }

  generateEnvContent () {
    return `# Entu Map App Environment Configuration
ENTU_HOST=${this.config.host}
ENTU_ACCOUNT=${this.config.account}
ENTU_TOKEN=${this.config.token}

# Core Entity Definitions
DATABASE_ENTITY_ID=${this.entities.databaseEntityId || ''}
ENTITY_DEFINITION_ID=${this.entities.entityEntityDefinitionId || ''}
PROPERTY_DEFINITION_ID=${this.entities.propertyEntityDefinitionId || ''}
MENU_DEFINITION_ID=${this.entities.menuEntityDefinitionId || ''}

# KML App Entities
KAART_ENTITY_DEFINITION_ID=${this.entities.kaartEntityDefinitionId || ''}
ASUKOHT_ENTITY_DEFINITION_ID=${this.entities.asukohtEntityDefinitionId || ''}

# Menu Entities
KAART_MENU_ENTITY_ID=${this.entities.kaartMenuEntityId || ''}
ASUKOHT_MENU_ENTITY_ID=${this.entities.asukohtMenuEntityId || ''}

# Discovered Properties (for duplicate prevention)
${this.generateDiscoveredPropertiesSection()}

# Discovered Relationships (for duplicate prevention)
${this.generateDiscoveredRelationshipsSection()}
`
  }

  generateDiscoveredPropertiesSection () {
    if (!this.properties || Object.keys(this.properties).length === 0) {
      return ''
    }

    let section = ''
    for (const [key, property] of Object.entries(this.properties)) {
      const envKey = `DISCOVERED_PROPERTY_${key.toUpperCase()}`
      section += `${envKey}=${property._id}\n`
    }
    return section.trim()
  }

  generateDiscoveredRelationshipsSection () {
    if (!this.relationships || Object.keys(this.relationships).length === 0) {
      return ''
    }

    let section = ''
    for (const [key, relationship] of Object.entries(this.relationships)) {
      const envKey = `DISCOVERED_RELATIONSHIP_${key.toUpperCase()}`
      section += `${envKey}=${relationship._id}\n`
    }
    return section.trim()
  }

  logConfiguration () {
    Logger.section('Configuration')
    Logger.log(`   Host: ${this.config.host}`, 'blue')
    Logger.log(`   Account: ${this.config.account}`, 'blue')
    Logger.log(`   Token: ${this.config.token ? this.config.token.substring(0, 20) + '...' : 'Not set'}`, 'blue')
  }
}
