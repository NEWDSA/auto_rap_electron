<template>
  <div class="page-container bg-white dark:bg-gray-900">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
  // 无需额外逻辑
</script>

<style lang="postcss" scoped>
  .page-container {
    @apply h-full w-full p-6;
    overflow: auto;
  }
</style>
