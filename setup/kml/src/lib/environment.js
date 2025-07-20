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
`
  }

  logConfiguration () {
    Logger.section('Configuration')
    Logger.log(`   Host: ${this.config.host}`, 'blue')
    Logger.log(`   Account: ${this.config.account}`, 'blue')
    Logger.log(`   Token: ${this.config.token ? this.config.token.substring(0, 20) + '...' : 'Not set'}`, 'blue')
  }
}
