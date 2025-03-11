<script setup>
defineProps({
  error: { type: Object, required: true }
})
</script>

<template>
  <div class="size-full flex items-center justify-center text-xl">
    {{ error.message }}
  </div>
</template>
