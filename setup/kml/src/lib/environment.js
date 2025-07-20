/**
 * Environment Configuration Handler
 * Clean separation of config loading and validation
 * Discovery data stored in separate JSON file
 */

import fs from 'fs/promises'
import { Logger } from './logger.js'

export class Environment {
  constructor () {
    this.config = {}
    this.entities = {}
    this.properties = {} // Store discovered properties
    this.relationships = {} // Store discovered relationships
    this.discoveryFilePath = 'discovery.json'
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

  async loadDiscoveryData () {
    try {
      const content = await fs.readFile(this.discoveryFilePath, 'utf8')
      const data = JSON.parse(content)

      if (data.discovery) {
        // Load entities
        this.entities = data.discovery.entities || {}

        this.properties = this.flattenProperties(data.discovery.properties || {})

        // Convert simplified relationships (ID strings) back to objects with _id property
        this.relationships = {}
        const relationshipsData = data.discovery.relationships || {}
        for (const [key, value] of Object.entries(relationshipsData)) {
          this.relationships[key] = typeof value === 'string' ? { _id: value } : value
        }

        Logger.success('Discovery data loaded from JSON file')
      }
    }
    catch {
      // File doesn't exist or is invalid - start with empty discovery data
      this.properties = {}
      this.relationships = {}
      Logger.info('No discovery data found - starting fresh')
    }
  }

  flattenProperties (propertiesData) {
    const flattened = {}
    for (const [entityType, properties] of Object.entries(propertiesData)) {
      for (const [propName, propId] of Object.entries(properties)) {
        const key = `${propName}_${entityType}`
        flattened[key] = { _id: propId }
      }
    }
    return flattened
  }

  unflattenProperties () {
    const unflattened = {}
    for (const [key, property] of Object.entries(this.properties)) {
      const parts = key.split('_')
      const propName = parts.slice(0, -1).join('_')
      const entityType = parts[parts.length - 1]

      if (!unflattened[entityType]) {
        unflattened[entityType] = {}
      }
      unflattened[entityType][propName] = property._id
    }
    return unflattened
  }

  async saveDiscoveryData () {
    // Simplify relationships to just store IDs like properties
    const simplifiedRelationships = {}
    for (const [key, relationship] of Object.entries(this.relationships)) {
      simplifiedRelationships[key] = relationship._id
    }

    const discoveryData = {
      discovery: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        entities: this.entities,
        properties: this.unflattenProperties(),
        relationships: simplifiedRelationships
      }
    }

    try {
      await fs.writeFile(this.discoveryFilePath, JSON.stringify(discoveryData, null, 2))
      Logger.success('Discovery data saved to JSON file')
    }
    catch (error) {
      Logger.warning(`Failed to save discovery data: ${error.message}`)
    }
  }

  loadBasicConfig () {
    this.config = {
      host: process.env.ENTU_HOST || 'entu.app',
      account: process.env.ENTU_ACCOUNT,
      token: process.env.ENTU_TOKEN
    }
  }

  initializeEmpty () {
    this.entities = {
      databaseEntityId: null,
      entityEntityDefinitionId: null,
      propertyEntityDefinitionId: null,
      menuEntityDefinitionId: null,
      kaartEntityDefinitionId: null,
      asukohtEntityDefinitionId: null,
      kaartMenuEntityId: null,
      asukohtMenuEntityId: null
    }

    this.properties = {}
    this.relationships = {}
  }

  validateRequired (requiredKeys = ['host', 'account', 'token']) {
    const missing = requiredKeys.filter((key) => !this.config[key])

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`)
    }
  }

  logConfiguration () {
    Logger.section('Configuration')
    Logger.log(`   Host: ${this.config.host}`, 'blue')
    Logger.log(`   Account: ${this.config.account}`, 'blue')
    Logger.log(`   Token: ${this.config.token ? this.config.token.substring(0, 20) + '...' : 'Not set'}`, 'blue')
  }
}
