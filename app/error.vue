<script setup>
defineProps({
  error: { type: Object, required: true }
})
</script>

<template>
  <div class="flex size-full items-center justify-center text-xl">
    {{ error.message }}
  </div>
</template>
