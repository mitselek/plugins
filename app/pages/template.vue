<script setup>
import { NButton, NCheckbox, NSelect, NSpin } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const importing = ref(false)
const templateEntities = ref([])
const templateProperties = ref([])
const newType = ref()
const parentType = ref()
const existingTypes = ref()
const selectedTemplateEntityId = ref()

const templateEntitiesOptions = computed(() => {
  const result = templateEntities.value?.map((x) => ({
    label: x.label,
    value: x._id,
    disabled: existingTypes.value?.includes(x._type)
  }))

  result.sort((a, b) => a.label.localeCompare(b.label))

  return result
})

const allChecked = computed({
  get: () => {
    return templateProperties.value?.every((x) => x.selected)
  },
  set: (value) => {
    templateProperties.value
      ?.filter((x) => !x.newId)
      ?.forEach((x) => { x.selected = value })
  }
})

const someChecked = computed(() => templateProperties.value?.filter((x) => !x.newId)?.some((x) => x.selected) && !allChecked.value)

const checkedCount = computed(() => templateProperties.value?.filter((x) => !x.newId).filter((x) => x.selected)?.length || 0)

const selectedPropertyIds = computed(() => templateProperties.value?.filter((x) => x.selected)?.map((x) => x._id))

watch(selectedTemplateEntityId, async (value) => {
  if (!value) return

  templateProperties.value = await getTemplateProperties(value)
})

async function getTemplateEntities () {
  const data = await $fetch('/api/template', {
    query: {
      '_type.string': 'entity',
      'system._id.exists': 'false',
      props: 'name,label,description'
    }
  })

  return data?.entities?.map((x) => ({
    _id: x._id,
    _type: getValue(x.name, locale.value),
    label: getValue(x.label, locale.value),
    description: getValue(x.description, locale.value)
  }))
}

async function getTemplateProperties (entityId) {
  const data = await $fetch('/api/template', {
    query: {
      '_parent.reference': entityId,
      '_type.string': 'property',
      props: 'name,label,description,type,ordinal,_sharing'
    }
  })

  const properties = data?.entities?.map((x) => ({
    _id: x._id,
    _type: getValue(x.name, locale.value),
    label: getValue(x.label, locale.value),
    description: getValue(x.description, locale.value),
    type: getValue(x.type, locale.value),
    ordinal: getValue(x.ordinal, locale.value, 'number'),
    _sharing: getValue(x._sharing, locale.value),
    selected: true
  }))

  properties.sort((a, b) => {
    if (a.ordinal === b.ordinal) return 0
    if (a.ordinal > b.ordinal) return 1
    return -1
  })

  return properties
}

async function getNewType () {
  const { account, token, type } = query

  if (!account || !token || !parent) return

  const data = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
    query: { props: 'name' }
  })

  return {
    _id: data?.entity?._id,
    name: getValue(data?.entity?.name, locale.value)
  }
}

async function getExistingTypes () {
  const { account, token } = query

  if (!account || !token || !parent) return

  const data = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity`, {
    headers: { Authorization: `Bearer ${token}` },
    query: {
      '_type.string': 'entity',
      props: 'name'
    }
  })

  return data?.entities?.map((x) => getValue(x.name, locale.value))
}

async function getParentType () {
  const { account, token, parent } = query

  if (!account || !token || !parent) return

  const data = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity/${parent}`, {
    headers: { Authorization: `Bearer ${token}` },
    query: { props: 'name' }
  })

  return {
    _id: data?.entity?._id,
    name: getValue(data?.entity?.name, locale.value)
  }
}

async function getEntityAndPropertyId () {
  const { account, token } = query

  if (!account || !token) return

  const entityData = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity`, {
    headers: { Authorization: `Bearer ${token}` },
    query: {
      '_type.string': 'entity',
      'name.string': 'entity',
      props: '_id',
      limit: 1
    }
  })

  const propertyData = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity`, {
    headers: { Authorization: `Bearer ${token}` },
    query: {
      '_type.string': 'entity',
      'name.string': 'property',
      props: '_id',
      limit: 1
    }
  })

  return {
    entity: entityData?.entities?.at(0)?._id,
    property: propertyData?.entities?.at(0)?._id
  }
}

async function doImport () {
  if (!selectedTemplateEntityId.value) return

  importing.value = true

  const { account, token } = query

  const entityData = await $fetch('/api/template', {
    query: {
      _id: selectedTemplateEntityId.value,
      props: 'name,label,label_plural,description,type,ordinal,_sharing,_inheritrights'
    }
  })

  const entity = entityData?.entity

  if (!entity) {
    error.value = 'No entity found!'
    return
  }

  const propertiesData = await $fetch('/api/template', {
    query: {
      '_type.string': 'property',
      '_parent.reference': entity._id,
      props: 'name,type,label,label_plural,description,group,ordinal,list,markdown,multilingual,readonly,mandatory,search,table,decimals,formula,reference_query,set,_sharing,_inheritrights'
    }
  })

  const properties = propertiesData?.entities?.filter((x) => selectedPropertyIds.value?.includes(x._id))

  if (properties.length === 0) {
    error.value = 'No properties found!'
    return
  }

  const typeReferences = await getEntityAndPropertyId()

  const entityInsert = [
    { type: '_type', reference: typeReferences.entity }
  ]

  for (const [key, value] of Object.entries(entity)) {
    if (key === '_id' || !Array.isArray(value)) continue

    entityInsert.push(
      ...value.map(({ _id, type, ...rest }) => ({ type: key, ...rest }))
    )
  }

  const newEntity = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: entityInsert
  })

  if (!newEntity._id) {
    error.value = 'Failed to import entity!'
    return
  }

  for (const property of properties) {
    const propertyInsert = [
      { type: '_type', reference: typeReferences.property },
      { type: '_parent', reference: newEntity._id }
    ]

    for (const [key, value] of Object.entries(property)) {
      if (key === '_id' || !Array.isArray(value)) continue

      propertyInsert.push(
        ...value.map(({ _id, type, ...rest }) => ({ type: key, ...rest }))
      )
    }

    const newProperty = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: propertyInsert
    })

    if (!newProperty._id) {
      error.value = `Failed to import property ${getValue(property.name)}!`
      continue
    }

    templateProperties.value.find((x) => x._id === property._id).newId = newProperty._id
  }

  importing.value = false
}

onMounted(async () => {
  const { account, type, token } = query

  locale.value = query.locale || 'en'

  if (!account) {
    error.value = 'No account parameter!'
    return
  }

  if (!type) {
    error.value = 'No type parameter!'
    return
  }

  if (!token) {
    error.value = 'No token parameter!'
    return
  }

  newType.value = await getNewType()
  templateEntities.value = await getTemplateEntities()
  existingTypes.value = await getExistingTypes()
  parentType.value = await getParentType()
})
</script>

<template>
  <!-- <pre class="mt-8 overflow-auto text-xs">{{ selectedPropertyIds }}</pre> -->

  <div
    v-if="error"
    class="flex h-full max-h-full items-center justify-center font-bold text-red-700"
  >
    {{ error }}
  </div>

  <div
    v-else
    class="flex h-full max-h-full flex-col gap-6 overflow-auto p-6"
  >
    <div
      class="mx-auto flex w-60 flex-col items-center justify-center"
      :class="{ 'h-96': !selectedTemplateEntityId }"
    >
      <div class="mb-1 w-full text-center">
        {{ t('entitiesInfo') }}
      </div>
      <n-select
        v-model:value="selectedTemplateEntityId"
        class="w-full"
        clearable
        :options="templateEntitiesOptions"
      />
    </div>

    <table
      v-if="selectedTemplateEntityId"
      class="w-full"
    >
      <thead v-if="!importing">
        <tr>
          <th
            class="p-3 pb-1 text-center font-normal"
            colspan="4"
          >
            {{ t('propertiesInfo') }}
          </th>
        </tr>

        <tr>
          <th class="bg-gray-100 p-3 text-left">
            <n-checkbox
              v-model:checked="allChecked"
              :indeterminate="someChecked"
            />
          </th>
          <th class="bg-gray-100 p-3 text-left">
            {{ t('name') }}
          </th>
          <th class="w-full bg-gray-100 p-3 text-left">
            {{ t('label') }}
          </th>
          <th class="bg-gray-100 p-3 text-left">
            {{ t('type') }}
          </th>
          <th class="w-32 bg-gray-100 p-3 text-left" />
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="templateProperty in templateProperties"
          :key="templateProperty._id"
          class="group border-t border-gray-200 hover:bg-gray-50"
        >
          <td class="p-3">
            <n-checkbox
              v-model:checked="templateProperty.selected"
              :disabled="!!templateProperty.newId"
            />
          </td>
          <td class="p-3 text-sm">
            {{ templateProperty._type }}
          </td>
          <td class="w-full p-3 text-sm">
            {{ templateProperty.label }}
          </td>
          <td class="p-3 text-sm">
            {{ templateProperty.type }}
          </td>
          <td class="w-32 p-3 text-sm">
            <my-icon
              v-if="templateProperty._sharing === 'public'"
              class="text-gray-500 group-hover:text-orange-600"
              icon="sharing/public"
            />
            <my-icon
              v-else-if="templateProperty._sharing === 'domain'"
              class="text-gray-500 group-hover:text-yellow-600"
              icon="sharing/domain"
            />
            <my-icon
              v-else
              class="text-gray-500 group-hover:text-green-600"
              icon="sharing/private"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex w-full justify-center">
      <n-button
        v-if="selectedTemplateEntityId && !importing"
        class="block"
        type="primary"
        :disabled="checkedCount === 0"
        @click="doImport()"
      >
        {{ t('import', checkedCount || 0) }}
      </n-button>

      <div
        v-else-if="importing"
        class="flex h-full max-h-full items-center justify-center"
      >
        <n-spin show />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  entitiesInfo: Select which entity to import
  propertiesInfo: Choose which properties to import
  name: Name
  label: Label
  type: Type
  import: Import entity | Import entity and 1 property | Import entity and {n} properties
et:
  entitiesInfo: Vali mis objekt importida
  propertiesInfo: Vali mis parameetrid importida
  name: Nimi
  label: Pealkiri
  type: Tüüp
  import: Impordi objekt | Impordi objekt ja 1 parameeter | Impordi objekt ja {n} parameetrit
</i18n>
