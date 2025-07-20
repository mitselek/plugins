/**
 * Discovery Service - Pure Read-Only Database Scanning
 * NO entity creation, NO caching - always queries database fresh
 * Caching is handled separately by Environment class
 */

import { Logger } from './lib/logger.js'

// Constants
const MENU_SEARCH_LIMIT = 50 // Allow finding multiple menus with same group

export class DiscoveryService {
  constructor (apiClient) {
    this.api = apiClient
  }

  async verifyAccess () {
    Logger.section('Verifying account access...')
    await this.api.verifyAccess()
    Logger.success('Account access verified')
  }

  async discoverCoreEntities () {
    Logger.section('Discovering core entity definitions...')

    const coreEntities = {}

    // Database entity - search by type only, name varies by account
    const databases = await this.api.findEntity('_type.string=database&props=_id,name')
    if (databases.length === 0) throw new Error('Database entity not found')
    coreEntities.databaseEntityId = databases[0]._id
    Logger.success(`Database entity: ${coreEntities.databaseEntityId}`)

    // Entity definition
    const entityDefs = await this.api.findEntityByNameAndType('entity', 'entity')
    if (entityDefs.length === 0) throw new Error('Entity definition not found')
    coreEntities.entityEntityDefinitionId = entityDefs[0]._id
    Logger.success(`Entity definition: ${coreEntities.entityEntityDefinitionId}`)

    // Property definition
    const propertyDefs = await this.api.findEntityByNameAndType('property', 'entity')
    if (propertyDefs.length === 0) throw new Error('Property definition not found')
    coreEntities.propertyEntityDefinitionId = propertyDefs[0]._id
    Logger.success(`Property definition: ${coreEntities.propertyEntityDefinitionId}`)

    // Menu definition
    const menuDefs = await this.api.findEntityByNameAndType('menu', 'entity')
    if (menuDefs.length === 0) throw new Error('Menu definition not found')
    coreEntities.menuEntityDefinitionId = menuDefs[0]._id
    Logger.success(`Menu definition: ${coreEntities.menuEntityDefinitionId}`)

    return coreEntities
  }

  async discoverKmlEntities () {
    Logger.section('Discovering KML-specific entity definitions...')

    const kmlEntities = {}

    // Search for Kaart entity
    const kaartEntities = await this.api.findEntityByNameAndType('kaart', 'entity')
    if (kaartEntities.length > 0) {
      kmlEntities.kaartEntityDefinitionId = kaartEntities[0]._id
      Logger.warning(`Kaart entity exists: ${kmlEntities.kaartEntityDefinitionId}`)
    }
    else {
      Logger.info('Kaart entity not found (will be created)')
    }

    // Search for Asukoht entity
    const asukohtEntities = await this.api.findEntityByNameAndType('asukoht', 'entity')
    if (asukohtEntities.length > 0) {
      kmlEntities.asukohtEntityDefinitionId = asukohtEntities[0]._id
      Logger.warning(`Asukoht entity exists: ${kmlEntities.asukohtEntityDefinitionId}`)
    }
    else {
      Logger.info('Asukoht entity not found (will be created)')
    }

    return kmlEntities
  }

  async discoverMenus (menuDefinitionId) {
    Logger.section('Discovering existing menus...')

    const menuEntities = {}

    // Search for KML menus by group
    const kmlMenus = await this.api.findEntity(
      `group.string.et=Kaardirakendus&_type.reference=${menuDefinitionId}&props=_id,name,entity,group`,
      MENU_SEARCH_LIMIT
    )

    if (kmlMenus.length > 0) {
      Logger.warning(`Found ${kmlMenus.length} KML app menu items:`)

      for (const menu of kmlMenus) {
        const nameEt = menu.name?.find((n) => n.language === 'et')?.string || 'N/A'
        const nameEn = menu.name?.find((n) => n.language === 'en')?.string || 'N/A'

        Logger.log(`   📋 ${menu._id} - ${nameEt} (${nameEn})`, 'yellow')

        // Try to categorize menus
        if (!menuEntities.kaartMenuEntityId && (nameEt.toLowerCase().includes('kaart') || nameEn.toLowerCase().includes('map'))) {
          menuEntities.kaartMenuEntityId = menu._id
          Logger.success(`Identified Kaart menu: ${menu._id}`)
        }
        else if (!menuEntities.asukohtMenuEntityId && (nameEt.toLowerCase().includes('asukoht') || nameEn.toLowerCase().includes('location'))) {
          menuEntities.asukohtMenuEntityId = menu._id
          Logger.success(`Identified Asukoht menu: ${menu._id}`)
        }
      }
    }
    else {
      Logger.info('No KML app menus found')
    }

    return menuEntities
  }

  async discoverProperties (kaartEntityId, asukohtEntityId, propertyDefinitionId) {
    Logger.section('Discovering existing properties...')

    const properties = {}
    const expectedProperties = [
      // Kaart properties
      { name: 'name', entity: 'kaart', parent: kaartEntityId },
      { name: 'kirjeldus', entity: 'kaart', parent: kaartEntityId },
      { name: 'url', entity: 'kaart', parent: kaartEntityId },
      // Asukoht properties
      { name: 'name', entity: 'asukoht', parent: asukohtEntityId },
      { name: 'kirjeldus', entity: 'asukoht', parent: asukohtEntityId },
      { name: 'long', entity: 'asukoht', parent: asukohtEntityId },
      { name: 'lat', entity: 'asukoht', parent: asukohtEntityId },
      { name: 'photo', entity: 'asukoht', parent: asukohtEntityId },
      { name: 'link', entity: 'asukoht', parent: asukohtEntityId }
    ]

    for (const prop of expectedProperties) {
      if (!prop.parent) continue // Skip if entity doesn't exist

      const existing = await this.api.findEntity(
        `name.string=${prop.name}&_parent.reference=${prop.parent}&_type.reference=${propertyDefinitionId}&props=_id,name`
      )

      const key = `${prop.name}_${prop.entity}`
      if (existing.length > 0) {
        properties[key] = existing[0]
        Logger.success(`Property '${prop.name}' exists for ${prop.entity}`)
      }
      else {
        Logger.info(`Property '${prop.name}' missing for ${prop.entity}`)
      }
    }

    return properties
  }

  async discoverRelationships (kaartEntityId, asukohtEntityId, kaartMenuEntityId) {
    Logger.section('Discovering existing relationships...')

    const relationships = {}

    // Check if Asukoht entity definition has add_from relationship to Kaart
    if (asukohtEntityId && kaartEntityId) {
      const asukohtEntity = await this.api.findEntity(
        `_id=${asukohtEntityId}&add_from.reference=${kaartEntityId}&props=_id,add_from`
      )
      if (asukohtEntity.length > 0 && asukohtEntity[0].add_from) {
        const addFromRel = asukohtEntity[0].add_from.find((rel) => rel.reference === kaartEntityId)
        if (addFromRel) {
          relationships.asukoht_add_from_kaart = { _id: addFromRel._id }
          Logger.success('Asukoht -> Kaart add_from relationship exists')
        }
        else {
          Logger.info('Asukoht -> Kaart add_from relationship missing')
        }
      }
      else {
        Logger.info('Asukoht -> Kaart add_from relationship missing')
      }
    }

    // Check if Kaart entity definition has add_from relationship to Kaart menu
    if (kaartEntityId && kaartMenuEntityId) {
      const kaartEntity = await this.api.findEntity(
        `_id=${kaartEntityId}&add_from.reference=${kaartMenuEntityId}&props=_id,add_from`
      )
      if (kaartEntity.length > 0 && kaartEntity[0].add_from) {
        const addFromRel = kaartEntity[0].add_from.find((rel) => rel.reference === kaartMenuEntityId)
        if (addFromRel) {
          relationships.kaart_add_from_menu = { _id: addFromRel._id }
          Logger.success('Kaart -> Menu add_from relationship exists')
        }
        else {
          Logger.info('Kaart -> Menu add_from relationship missing')
        }
      }
      else {
        Logger.info('Kaart -> Menu add_from relationship missing')
      }
    }

    return relationships
  }

  async discoverAll () {
    const result = {}

    await this.verifyAccess()

    const coreEntities = await this.discoverCoreEntities()
    Object.assign(result, coreEntities)

    const kmlEntities = await this.discoverKmlEntities()
    Object.assign(result, kmlEntities)

    const menuEntities = await this.discoverMenus(coreEntities.menuEntityDefinitionId, coreEntities.databaseEntityId)
    Object.assign(result, menuEntities)

    const properties = await this.discoverProperties(
      kmlEntities.kaartEntityDefinitionId,
      kmlEntities.asukohtEntityDefinitionId,
      coreEntities.propertyEntityDefinitionId
    )
    result.properties = properties

    const relationships = await this.discoverRelationships(
      kmlEntities.kaartEntityDefinitionId,
      kmlEntities.asukohtEntityDefinitionId,
      menuEntities.kaartMenuEntityId
    )
    result.relationships = relationships

    return result
  }
}
