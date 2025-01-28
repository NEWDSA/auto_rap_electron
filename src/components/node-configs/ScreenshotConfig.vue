<template>
  <div class="space-y-4">
    <el-form-item label="截图类型">
      <el-select v-model="node.properties.screenshotType" @change="handleChange">
        <el-option label="整页截图" value="fullPage" />
        <el-option label="可视区域" value="viewport" />
        <el-option label="元素截图" value="element" />
      </el-select>
    </el-form-item>

    <el-form-item 
      v-if="node.properties.screenshotType === 'element'" 
      label="元素选择器"
    >
      <el-input 
        v-model="node.properties.selector"
        placeholder="请输入元素选择器，例如: #app"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item label="保存路径">
      <div class="flex space-x-2">
        <el-input 
          v-model="node.properties.path"
          placeholder="请选择保存路径"
          readonly
        />
        <el-button @click="handleSelectPath">选择</el-button>
      </div>
    </el-form-item>

    <el-form-item label="图片质量">
      <el-input-number
        v-model="node.properties.quality"
        :min="1"
        :max="100"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item>
      <el-checkbox
        v-model="node.properties.omitBackground"
        @change="handleChange"
      >
        透明背景
      </el-checkbox>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { FlowNode } from '@/types/node-config'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  node: FlowNode
}>()

const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const handleChange = () => {
  emit('update', 'properties')
}

const handleSelectPath = async () => {
  try {
    const result = await window.electronAPI.invoke('dialog:showSaveDialog', {
      title: '选择截图保存路径',
      defaultPath: props.node.properties.path || 'screenshot.png',
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg'] }
      ]
    })
    
    if (!result.canceled && result.filePath) {
      props.node.properties.path = result.filePath
      handleChange()
    }
  } catch (error) {
    ElMessage.error('选择保存路径失败')
  }
}

onMounted(() => {
  // 初始化默认值
  if (!props.node.properties.screenshotType) {
    props.node.properties.screenshotType = 'viewport'
  }
  if (!props.node.properties.quality) {
    props.node.properties.quality = 90
  }
  if (props.node.properties.omitBackground === undefined) {
    props.node.properties.omitBackground = false
  }
})
</script> 