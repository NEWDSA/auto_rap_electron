<template>
  <el-config-provider :locale="zhCn">
    <LicenseGuard>
      <router-view />
    </LicenseGuard>
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import LicenseGuard from '@/components/LicenseGuard.vue'
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
</style> 