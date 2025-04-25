<script setup>
import { NButton, NCheckbox, NForm, NFormItem, NSelect, NSpin, NUpload, NUploadDragger } from 'naive-ui'

const { locale, t } = useI18n()
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)
const importing = ref(false)
const templateUser = ref()
const templateEntities = ref([])
const templateProperties = ref([])
const selectedTemplateEntityId = ref()
const newType = ref()
const parentType = ref()

const templateEntitiesOptions = computed(() => templateEntities.value?.map((x) => ({
  label: x.label,
  value: x._id
})))

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

watch(selectedTemplateEntityId, async (value) => {
  if (!value) return

  templateProperties.value = await getTemplateProperties(value)
})

async function getTemplateUser () {
  if (templateUser.value) return

  const templateAuthData = await $fetch(`${runtimeConfig.public.entuUrl}/api/auth`, {
    headers: { Authorization: `Bearer ${runtimeConfig.public.entuKey}` },
    query: { account: 'template' }
  })

  templateUser.value = {
    _id: templateAuthData?.accounts?.at(0)?.user?._id,
    token: templateAuthData?.token
  }
}

async function getTemplateEntities () {
  await getTemplateUser()

  const templateEntitiesData = await $fetch(`${runtimeConfig.public.entuUrl}/api/template/entity`, {
    headers: { Authorization: `Bearer ${templateUser.value.token}` },
    query: {
      // '_viewer.reference': templateUser.value._id,
      '_type.string': 'entity',
      'system._id.exists': 'false',
      props: 'name,label,description'
    }
  })

  return templateEntitiesData?.entities?.map((x) => ({
    _id: x._id,
    _type: getValue(x.name, locale.value),
    label: getValue(x.label, locale.value),
    description: getValue(x.description, locale.value)
  }))
}

async function getTemplateProperties (entityId) {
  await getTemplateUser()

  const templateEntitiesData = await $fetch(`${runtimeConfig.public.entuUrl}/api/template/entity`, {
    headers: { Authorization: `Bearer ${templateUser.value.token}` },
    query: {
      // '_viewer.reference': templateUser.value._id,
      '_parent.reference': entityId,
      '_type.string': 'property',
      props: 'name,label,description,type,ordinal'
    }
  })

  const properties = templateEntitiesData?.entities?.map((x) => ({
    _id: x._id,
    _type: getValue(x.name, locale.value),
    label: getValue(x.label, locale.value),
    description: getValue(x.description, locale.value),
    type: getValue(x.type, locale.value),
    ordinal: getValue(x.ordinal, locale.value, 'number'),
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

  const newTypeData = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
    query: { props: 'name' }
  })

  return {
    _id: newTypeData?.entity?._id,
    name: getValue(newTypeData?.entity?.name, locale.value)
  }
}

async function getParentType () {
  const { account, token, parent } = query

  if (!account || !token || !parent) return

  const parentData = await $fetch(`${runtimeConfig.public.entuUrl}/api/${account}/entity/${parent}`, {
    headers: { Authorization: `Bearer ${token}` },
    query: { props: 'name' }
  })

  return {
    _id: parentData?.entity?._id,
    name: getValue(parentData?.entity?.name, locale.value)
  }
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
  parentType.value = await getParentType()
})
</script>

<template>
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

    <!-- <pre class="mt-8 overflow-auto text-xs">query: {{ query }}</pre> -->
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
