/**
 * Setup Service - Pure Entity Creation Operations
 * Creates missing entities, properties, and relationships based on discovery results
 */

import { Logger } from './lib/logger.js'

// Constants for property ordering
const PROPERTY_ORDINALS = {
  // Kaart properties
  KAART_NAME: 1,
  KAART_DESCRIPTION: 2,
  KAART_URL: 3,
  // Asukoht properties
  ASUKOHT_NAME: 1,
  ASUKOHT_DESCRIPTION: 2,
  ASUKOHT_LONGITUDE: 3,
  ASUKOHT_LATITUDE: 4,
  ASUKOHT_PHOTO: 5,
  ASUKOHT_LINK: 6
}

// Constants for menu sorting
const MENU_SORT_ORDER = {
  KAART_MENU: 100,
  ASUKOHT_MENU: 200
}

export class SetupService {
  constructor (apiClient, environment) {
    this.api = apiClient
    this.env = environment
    this.created = {}
  }

  async createKaartEntity () {
    if (this.env.entities.kaartEntityDefinitionId) {
      // Entity already exists - no message needed, it's shown in setup plan
      return this.env.entities.kaartEntityDefinitionId
    }

    Logger.progress('Creating Kaart (Map) entity type...')

    const kaartData = [
      { type: '_type', reference: this.env.entities.entityEntityDefinitionId },
      { type: 'name', string: 'kaart' },
      { type: 'label', string: 'Kaart', language: 'et' },
      { type: 'label', string: 'Map', language: 'en' },
      { type: 'label_plural', string: 'Kaardid', language: 'et' },
      { type: 'label_plural', string: 'Maps', language: 'en' },
      { type: '_parent', reference: this.env.entities.databaseEntityId }
    ]

    const result = await this.api.createEntity(kaartData)
    this.env.entities.kaartEntityDefinitionId = result._id
    this.created.kaart = result._id
    Logger.success(`Kaart entity created: ${result._id}`)
    return result._id
  }

  async createAsukohtEntity () {
    if (this.env.entities.asukohtEntityDefinitionId) {
      // Entity already exists - no message needed, it's shown in setup plan
      return this.env.entities.asukohtEntityDefinitionId
    }

    Logger.progress('Creating Asukoht (Location) entity type...')

    const asukohtData = [
      { type: '_type', reference: this.env.entities.entityEntityDefinitionId },
      { type: 'name', string: 'asukoht' },
      { type: 'label', string: 'Asukoht', language: 'et' },
      { type: 'label', string: 'Location', language: 'en' },
      { type: 'label_plural', string: 'Asukohad', language: 'et' },
      { type: 'label_plural', string: 'Locations', language: 'en' },
      { type: '_parent', reference: this.env.entities.databaseEntityId },
      { type: 'add_from', reference: this.env.entities.kaartEntityDefinitionId }
    ]

    const result = await this.api.createEntity(asukohtData)
    this.env.entities.asukohtEntityDefinitionId = result._id
    this.created.asukoht = result._id
    Logger.success(`Asukoht entity created: ${result._id}`)
    return result._id
  }

  async createProperties (existingProperties = {}) {
    // Debug: log discovered properties
    if (Object.keys(existingProperties).length > 0) {
      Logger.info(`Found ${Object.keys(existingProperties).length} existing properties`)
      for (const [key, prop] of Object.entries(existingProperties)) {
        Logger.info(`  ${key}: ${prop._id}`)
      }
    }
    else {
      Logger.warning('No existing properties found - will create all')
    }

    const properties = [
      // Kaart properties
      {
        name: 'name',
        label_et: 'Nimi',
        label_en: 'Name',
        datatype: 'string',
        entity: this.env.entities.kaartEntityDefinitionId,
        entityType: 'kaart',
        public: true,
        search: true,
        ordinal: PROPERTY_ORDINALS.KAART_NAME
      },
      {
        name: 'kirjeldus',
        label_et: 'Kirjeldus',
        label_en: 'Description',
        datatype: 'text',
        entity: this.env.entities.kaartEntityDefinitionId,
        entityType: 'kaart',
        markdown: true,
        public: true,
        search: true,
        ordinal: PROPERTY_ORDINALS.KAART_DESCRIPTION
      },
      {
        name: 'url',
        label_et: 'URL',
        label_en: 'URL',
        datatype: 'string',
        entity: this.env.entities.kaartEntityDefinitionId,
        entityType: 'kaart',
        public: true,
        multilingual: false,
        ordinal: PROPERTY_ORDINALS.KAART_URL
      },
      // Asukoht properties
      {
        name: 'name',
        label_et: 'Nimi',
        label_en: 'Name',
        datatype: 'string',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        public: true,
        search: true,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_NAME
      },
      {
        name: 'kirjeldus',
        label_et: 'Kirjeldus',
        label_en: 'Description',
        datatype: 'text',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        markdown: true,
        public: true,
        search: true,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_DESCRIPTION
      },
      {
        name: 'long',
        label_et: 'Pikkuskraad',
        label_en: 'Longitude',
        datatype: 'number',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        public: true,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_LONGITUDE
      },
      {
        name: 'lat',
        label_et: 'Laiuskraad',
        label_en: 'Latitude',
        datatype: 'number',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        public: true,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_LATITUDE
      },
      {
        name: 'photo',
        label_et: 'Pilt',
        label_en: 'Picture',
        datatype: 'file',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        public: true,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_PHOTO
      },
      {
        name: 'link',
        label_et: 'Link',
        label_en: 'Link',
        datatype: 'string',
        entity: this.env.entities.asukohtEntityDefinitionId,
        entityType: 'asukoht',
        public: true,
        multilingual: false,
        ordinal: PROPERTY_ORDINALS.ASUKOHT_LINK
      }
    ]

    // Check if there are any missing properties
    const missingProperties = properties.filter((prop) => {
      const propKey = `${prop.name}_${prop.entityType}`
      return !existingProperties[propKey] && prop.entity
    })

    if (missingProperties.length === 0) {
      Logger.success('All properties already exist')
      return
    }

    Logger.progress(`Creating ${missingProperties.length} missing properties...`)

    for (const prop of properties) {
      const propKey = `${prop.name}_${prop.entityType}`
      if (existingProperties[propKey]) {
        Logger.skip(`Property '${prop.name}' for ${prop.entityType} (already exists)`)
        continue
      }

      if (!prop.entity) {
        Logger.warning(`Skipping property '${prop.name}' - ${prop.entityType} entity doesn't exist`)
        continue
      }

      const propertyData = [
        { type: '_type', reference: this.env.entities.propertyEntityDefinitionId },
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

      try {
        const result = await this.api.createEntity(propertyData)
        Logger.success(`Property created: ${prop.name} for ${prop.entityType} (${result._id})`)
      }
      catch (error) {
        Logger.warning(`Failed to create property ${prop.name} for ${prop.entityType}: ${error.message}`)
      }
    }
  }

  async createMenus () {
    Logger.progress('Creating menu items...')

    if (this.env.entities.kaartMenuEntityId && this.env.entities.asukohtMenuEntityId) {
      Logger.skip('Menu creation (already exist)')
      return
    }

    const menus = [
      {
        name_et: 'Kaardid',
        name_en: 'Maps',
        group_et: 'Kaardirakendus',
        group_en: 'Map App',
        entity: this.env.entities.kaartEntityDefinitionId,
        sort: MENU_SORT_ORDER.KAART_MENU,
        type: 'kaart'
      },
      {
        name_et: 'Asukohad',
        name_en: 'Locations',
        group_et: 'Kaardirakendus',
        group_en: 'Map App',
        entity: this.env.entities.asukohtEntityDefinitionId,
        sort: MENU_SORT_ORDER.ASUKOHT_MENU,
        type: 'asukoht'
      }
    ]

    for (const menu of menus) {
      const isKaartMenu = menu.type === 'kaart'
      const existingMenuId = isKaartMenu ? this.env.entities.kaartMenuEntityId : this.env.entities.asukohtMenuEntityId

      if (existingMenuId) {
        Logger.skip(`${menu.name_et} menu (already exists)`)
        continue
      }

      const menuData = [
        { type: '_type', reference: this.env.entities.menuEntityDefinitionId },
        { type: 'name', string: menu.name_et, language: 'et' },
        { type: 'name', string: menu.name_en, language: 'en' },
        { type: 'group', string: menu.group_et, language: 'et' },
        { type: 'group', string: menu.group_en, language: 'en' },
        { type: 'query', string: `_type.string=${menu.type}&sort=name.string` }
      ]

      try {
        const result = await this.api.createEntity(menuData)
        Logger.success(`Menu created: ${menu.name_et} (${result._id})`)

        if (isKaartMenu) {
          this.env.entities.kaartMenuEntityId = result._id
          this.created.kaartMenu = result._id
        }
        else {
          this.env.entities.asukohtMenuEntityId = result._id
          this.created.asukohtMenu = result._id
        }
      }
      catch (error) {
        Logger.warning(`Failed to create menu ${menu.name_et}: ${error.message}`)
      }
    }
  }

  async setupRelationships (existingRelationships = {}) {
    Logger.progress('Setting up relationships...')

    // Add Kaart relationship to Asukoht entity (allows creating Asukoht under Kaart)
    if (this.env.entities.asukohtEntityDefinitionId && this.env.entities.kaartEntityDefinitionId) {
      if (existingRelationships.asukoht_add_from_kaart) {
        Logger.skip('Asukoht -> Kaart relationship (already exists)')
      }
      else {
        try {
          const relationshipData = [
            { type: 'add_from', reference: this.env.entities.kaartEntityDefinitionId }
          ]

          await this.api.updateEntity(this.env.entities.asukohtEntityDefinitionId, relationshipData)
          Logger.success('Asukoht -> Kaart relationship created')
        }
        catch (error) {
          Logger.warning(`Failed to create Asukoht -> Kaart relationship: ${error.message}`)
        }
      }
    }

    // Add menu relationship to Kaart entity (allows creating Kaart from menu)
    if (this.env.entities.kaartEntityDefinitionId && this.env.entities.kaartMenuEntityId) {
      if (existingRelationships.kaart_add_from_menu) {
        Logger.skip('Kaart -> Menu relationship (already exists)')
      }
      else {
        try {
          const relationshipData = [
            { type: 'add_from', reference: this.env.entities.kaartMenuEntityId }
          ]

          await this.api.updateEntity(this.env.entities.kaartEntityDefinitionId, relationshipData)
          Logger.success('Kaart -> Menu relationship created')
        }
        catch (error) {
          Logger.warning(`Failed to create Kaart -> Menu relationship: ${error.message}`)
        }
      }
    }
  }
}
