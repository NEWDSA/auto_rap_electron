<template>
  <div class="space-y-4">
    <el-form-item label="点击设置">
      <div class="space-y-2">
        <el-input
          v-model="node.properties.clickSelector"
          placeholder="请选择要点击的元素"
          readonly
          @click="openBrowserForClick"
        >
          <template #append>
            <el-button @click="openBrowserForClick">选择元素</el-button>
          </template>
        </el-input>

        <div class="flex space-x-2">
          <el-checkbox
            v-model="node.properties.waitAfterClick"
            @change="handleChange"
          >
            点击后等待加载
          </el-checkbox>
        </div>

        <div v-if="node.properties.waitAfterClick" class="flex space-x-2">
          <el-input-number
            v-model="node.properties.clickTimeout"
            :min="1"
            :max="60"
            placeholder="等待时间(秒)"
            @change="handleChange"
          />
        </div>
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { FlowNode } from '@/types/node-config'
import { ipcRenderer } from '@/utils/electron'

const props = defineProps<{
  node: FlowNode
}>()

const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const handleChange = () => {
  emit('update', 'properties')
}

const openBrowserForClick = async () => {
  try {
    await ipcRenderer.invoke('open-browser', {
      url: props.node.properties.url || 'about:blank',
      width: props.node.properties.width,
      height: props.node.properties.height,
      headless: false,
      incognito: props.node.properties.incognito,
      userAgent: props.node.properties.userAgent
    })
    
    // 等待元素选择
    const selector = await ipcRenderer.invoke('element:startPicker')
    if (selector) {
      props.node.properties.clickSelector = selector
      handleChange()
    }
  } catch (error) {
    console.error('打开浏览器失败:', error)
  }
}

onMounted(() => {
  // 初始化默认值
  if (!props.node.properties.waitAfterClick) {
    props.node.properties.waitAfterClick = true
  }
  if (!props.node.properties.clickTimeout) {
    props.node.properties.clickTimeout = 5
  }
})
</script> 