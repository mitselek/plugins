<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
defineProps({
  icon: { type: String, required: true }
})
</script>

<template>
  <nuxt-icon
    class="text-base"
    filled
    :name="icon"
  />
</template>

<style>
.nuxt-icon svg {
  margin: 0;
}
</style>
