<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
defineProps({
  icon: { type: String, required: true }
})
</script>

<template>
  <nuxt-icon
    class="text-md"
    filled
    :name="icon"
  />
</template>

<style>
.nuxt-icon svg {
  @apply m-0;
}
</style>
