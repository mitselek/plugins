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

    await env.loadConfig()
    env.validateRequired(['host', 'account', 'token'])
    env.logConfiguration()

    // Initialize services
    const apiClient = new EntuApiClient(env.config.host, env.config.account, env.config.token)
    const setup = new SetupService(apiClient, env)

    // Create entities
    await setup.createKaartEntity()
    await setup.createAsukohtEntity()

    // Show setup plan
    Logger.section('Setup Plan')
    const kaartExists = !!env.entities.kaartEntityDefinitionId
    const asukohtExists = !!env.entities.asukohtEntityDefinitionId
    const menusExist = !!(env.entities.kaartMenuEntityId && env.entities.asukohtMenuEntityId)

    Logger.log(`   ${kaartExists ? '⏭️  Found existing' : '✅ Created'} Kaart entity`, 'blue')
    Logger.log(`   ${asukohtExists ? '⏭️  Found existing' : '✅ Created'} Asukoht entity`, 'blue')
    Logger.log(`   ${menusExist ? '⏭️  Skip' : '✅ Create'} menu items`, 'blue')
    Logger.log('   ✅ Create missing properties', 'blue')
    Logger.log('   ✅ Setup relationships', 'blue')

    const proceed = await prompt('\n❓ Proceed with remaining setup? (y/N): ')

    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      Logger.warning('Setup cancelled')
      return
    }

    // Continue with setup
    await setup.createProperties(env.properties)
    await setup.createMenus()
    await setup.setupRelationships(env.relationships)

    // Update environment file
    await env.saveToFile()

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
