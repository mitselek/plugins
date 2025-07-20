#!/usr/bin/env node

/**
 * Setup CLI - Clean entity creation based on discovery results
 * Creates missing entities, properties, and relationships
 */

import readline from 'readline'
import { EntuApiClient } from '../src/lib/api-client.js'
import { Environment } from '../src/lib/environment.js'
import { SetupService } from '../src/setup.js'
import { Logger } from '../src/lib/logger.js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function prompt (question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function main () {
  try {
    Logger.header('🚀 Entu Map App Setup')
    Logger.log('=====================================', 'cyan')

    const env = new Environment()

    // Load environment configuration
    const loaded = await env.loadFromFile()
    if (!loaded) {
      Logger.error('Failed to load .env file. The discovery script should have created it.')
      Logger.info('Run discovery first: npm run discover')
      process.exit(1)
    }

    env.loadBasicConfig()
    await env.loadDiscoveryData()
    env.validateRequired(['host', 'account', 'token'])
    env.logConfiguration()

    // Initialize services
    const apiClient = new EntuApiClient(env.config.host, env.config.account, env.config.token)
    const setup = new SetupService(apiClient, env)

    // Show setup plan BEFORE creating anything
    Logger.section('Setup Plan')
    const kaartExists = !!env.entities.kaartEntityDefinitionId
    const asukohtExists = !!env.entities.asukohtEntityDefinitionId
    const menusExist = !!(env.entities.kaartMenuEntityId && env.entities.asukohtMenuEntityId)

    // Check if properties are missing
    const expectedPropertyCount = 9 // 3 kaart + 6 asukoht properties
    const existingPropertyCount = Object.keys(env.properties).length
    const propertiesMissing = existingPropertyCount < expectedPropertyCount

    // Check if relationships are missing
    const expectedRelationships = ['asukoht_add_from_kaart', 'kaart_add_from_menu']
    const existingRelationships = Object.keys(env.relationships)
    const relationshipsMissing = expectedRelationships.some((rel) => !existingRelationships.includes(rel))

    Logger.log(`   ${kaartExists ? '⏭️  Found existing' : '✅ Create'} Kaart entity`, 'blue')
    Logger.log(`   ${asukohtExists ? '⏭️  Found existing' : '✅ Create'} Asukoht entity`, 'blue')
    Logger.log(`   ${menusExist ? '⏭️  Skip' : '✅ Create'} menu items`, 'blue')
    Logger.log(`   ${propertiesMissing ? '✅ Create missing' : '⏭️  All'} properties${propertiesMissing ? '' : ' exist'}`, 'blue')
    Logger.log(`   ${relationshipsMissing ? '✅ Setup' : '⏭️  All'} relationships${relationshipsMissing ? '' : ' exist'}`, 'blue')

    // Check if everything is already set up
    const nothingToDo = kaartExists && asukohtExists && menusExist && !propertiesMissing && !relationshipsMissing

    if (nothingToDo) {
      Logger.header('🎉 Map app setup already complete!')
      Logger.section('Summary')
      Logger.log(`   Kaart entity: ${env.entities.kaartEntityDefinitionId}`, 'blue')
      Logger.log(`   Asukoht entity: ${env.entities.asukohtEntityDefinitionId}`, 'blue')
      Logger.log(`   Properties: ${Object.keys(env.properties).length} configured`, 'blue')
      Logger.log(`   Relationships: ${Object.keys(env.relationships).length} configured`, 'blue')
      Logger.info('Your map application structure is ready!')
      Logger.info('You can now use the KML import plugin to create maps and locations.')
      return
    }

    const proceed = await prompt('\n❓ Proceed with setup? (y/N): ')

    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      Logger.warning('Setup cancelled')
      return
    }

    // NOW create entities after user confirmation
    await setup.createKaartEntity()
    await setup.createAsukohtEntity()

    // Continue with setup
    await setup.createProperties(env.properties)
    await setup.createMenus()
    await setup.setupRelationships(env.relationships)

    // Save updated discovery data
    await env.saveDiscoveryData()

    Logger.header('🎉 Map app setup completed successfully!')
    Logger.section('Summary')
    Logger.log(`   Kaart entity: ${env.entities.kaartEntityDefinitionId}`, 'blue')
    Logger.log(`   Asukoht entity: ${env.entities.asukohtEntityDefinitionId}`, 'blue')
    Logger.log('   Properties and menus created', 'blue')

    Logger.info('Your map application structure is now ready!')
    Logger.log('   You can now use the KML import plugin to create maps and locations.', 'green')
  }
  catch (error) {
    Logger.error(`Setup failed: ${error.message}`)
    process.exit(1)
  }
  finally {
    rl.close()
  }
}

main()
