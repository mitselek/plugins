#!/usr/bin/env node

/**
 * Discovery CLI - Clean database scanning and .env generation
 * Pure read-only operations, no entity creation
 */

import { EntuApiClient } from '../src/lib/api-client.js'
import { Environment } from '../src/lib/environment.js'
import { DiscoveryService } from '../src/discovery.js'
import { Logger } from '../src/lib/logger.js'

async function main () {
  try {
    Logger.header('🔍 Entu Environment Discovery')
    Logger.log('=====================================', 'cyan')

    const env = new Environment()

    // Load basic config (host, account, token) but NOT discovery data
    await env.loadFromFile()
    env.loadBasicConfig()
    env.initializeEmpty() // Initialize empty entities for fresh discovery

    // Validate basic requirements
    env.validateRequired(['host', 'account', 'token'])
    env.logConfiguration()

    // Initialize API client
    const apiClient = new EntuApiClient(env.config.host, env.config.account, env.config.token)
    const discovery = new DiscoveryService(apiClient)

    // Discover all entities
    const discoveredEntities = await discovery.discoverAll()

    // Update environment with discoveries
    const { properties, relationships, ...entities } = discoveredEntities
    Object.assign(env.entities, entities)
    env.properties = properties || {}
    env.relationships = relationships || {}

    // Save only discovery data (don't overwrite .env file)
    await env.saveDiscoveryData()

    Logger.header('🎉 Environment discovery completed successfully!')
    Logger.section('Summary')
    Logger.log(`   Database: ${env.entities.databaseEntityId}`, 'blue')
    Logger.log(`   Entity Definition: ${env.entities.entityEntityDefinitionId}`, 'blue')
    Logger.log(`   Property Definition: ${env.entities.propertyEntityDefinitionId}`, 'blue')
    Logger.log(`   Menu Definition: ${env.entities.menuEntityDefinitionId}`, 'blue')

    if (env.entities.kaartEntityDefinitionId) {
      Logger.log(`   Existing Kaart Entity: ${env.entities.kaartEntityDefinitionId}`, 'yellow')
    }
    if (env.entities.asukohtEntityDefinitionId) {
      Logger.log(`   Existing Asukoht Entity: ${env.entities.asukohtEntityDefinitionId}`, 'yellow')
    }

    const menuCount = [env.entities.kaartMenuEntityId, env.entities.asukohtMenuEntityId].filter(Boolean).length
    if (menuCount > 0) {
      Logger.log(`   Existing Menu Items: ${menuCount}`, 'yellow')
    }

    Logger.info('Next step: Run the setup script to create missing entities/properties')
    Logger.log('   npm run setup', 'cyan')
  }
  catch (error) {
    Logger.error(`Discovery failed: ${error.message}`)
    process.exit(1)
  }
}

main()
