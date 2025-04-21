<script setup>
const { query } = useRoute()
const runtimeConfig = useRuntimeConfig()

const error = ref(null)

// Fetch the new entity type from the client's database
const { data: newTypeData } = await useFetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity/${query.type}`, {
  headers: computed(() => ({ Authorization: `Bearer ${query.token}` })),
  query: { props: 'name' }
}, { lazy: true })
const { data: newParentData } = await useFetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity/${query.type}`, {
  headers: computed(() => ({ Authorization: `Bearer ${query.token}` })),
  query: { props: 'name' }
}, { lazy: true })
const newType = computed(() => ({
  _id: newTypeData.value?.entity?._id,
  name: getValue(newTypeData.value?.entity?.name)
}))

// Fetch the template from the template's database
const selectedEntity = ref()

const { data: templateAuthData } = await useFetch(`${runtimeConfig.public.entuUrl}/api/auth`, {
  headers: { Authorization: `Bearer ${runtimeConfig.public.entuKey}` },
  query: { account: 'template' }
}, { lazy: true })
const { data: templateEntitiesData } = await useFetch(`${runtimeConfig.public.entuUrl}/api/template/entity`, {
  headers: computed(() => ({ Authorization: `Bearer ${templateAuthData.value?.token}` })),
  query: computed(() => ({
    '_viewer.reference': templateAuthData.value?.accounts?.at(0)?.user?._id,
    '_type.string': 'entity',
    'system._id.exists': 'false',
    props: 'name,label'
  }))
}, { lazy: true })

const { data: templatePropertiesData } = await useFetch(`${runtimeConfig.public.entuUrl}/api/template/entity`, {
  headers: computed(() => ({ Authorization: `Bearer ${templateAuthData.value?.token}` })),
  query: computed(() => ({
    '_parent.reference': selectedEntity.value?._id,
    '_type.string': 'property',
    limit: selectedEntity.value?._id ? undefined : 1
  }))
}, { lazy: true })
const templateProperties = computed(() => templatePropertiesData.value?.entities?.map((x) => ({
  _id: x._id,
  _type: getValue(x.name),
  label: getValue(x.label)
})))

const templateEntities = computed(() => templateEntitiesData.value?.entities?.map((x) => ({
  _id: x._id,
  _type: getValue(x.name),
  label: getValue(x.label)
})))

const parentType = ref()

onMounted(async () => {
  if (!query.account) {
    error.value = 'No account parameter!'
    return
  }

  if (!query.type) {
    error.value = 'No type parameter!'
  }

  if (!query.token) {
    error.value = 'No token parameter!'
  }

  if (query.parent) {
    const parentData = await $fetch(`${runtimeConfig.public.entuUrl}/api/${query.account}/entity/${query.parent}`, {
      headers: { Authorization: `Bearer ${query.token}` },
      query: { props: 'name' }
    })

    if (parentData) {
      parentType.value = getValue(parentData.entity.name)
    }
  }
})
</script>

<template>
  <div class="size-full overflow-auto">
    <div
      v-if="error"
      class="flex h-full max-h-full items-center justify-center font-bold text-red-700"
    >
      {{ error }}
    </div>

    <pre class="overflow-auto text-xs">{{ query }}</pre>
    <pre class="overflow-auto text-xs">{{ newType }}</pre>
    <pre class="overflow-auto text-xs">{{ newParentData }}</pre>
    <pre class="overflow-auto text-xs">{{ templateEntities }}</pre>
    <pre class="overflow-auto text-xs">{{ templateProperties }}</pre>
  </div>
</template>

<i18n lang="yaml">
en:
  title: 'Add entity'
et:
  title: 'Lisa objekt'
</i18n>
