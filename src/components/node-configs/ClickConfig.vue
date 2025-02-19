<template>
  <div class="space-y-4">
    <el-form-item label="选择器类型">
      <el-select v-model="node.properties.selectorType" @change="handleChange">
        <el-option label="CSS 选择器" value="css" />
        <el-option label="XPath" value="xpath" />
        <el-option label="ID" value="id" />
        <el-option label="Class" value="class" />
        <el-option label="Name" value="name" />
      </el-select>
    </el-form-item>

    <el-form-item label="选择器">
      <el-input
        v-model="node.properties.selector"
        placeholder="请选择要点击的元素"
        @input="handleChange"
      >
        <template #append>
          <el-button 
            :type="isSelecting ? 'primary' : 'default'"
            @click="openBrowserForSelect"
          >
            选择元素
          </el-button>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item label="点击设置">
      <div class="space-y-2">
        <el-checkbox
          v-model="node.properties.waitAfterClick"
          @change="handleChange"
        >
          点击后等待页面加载
        </el-checkbox>

        <div v-if="node.properties.waitAfterClick" class="flex items-center space-x-2">
          <span>超时时间(秒)：</span>
          <el-input-number
            v-model="node.properties.clickTimeout"
            :min="1"
            :max="60"
            @change="handleChange"
          />
        </div>
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { FlowNode } from '@/types/node-config'
import { ipcRenderer } from '@/utils/electron'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  node: FlowNode
}>()

const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const isSelecting = ref(false)

const handleChange = () => {
  emit('update', 'properties')
}

const openBrowserForSelect = async () => {
  try {
    isSelecting.value = true
    ElMessage.info('请在浏览器中选择要点击的元素')
    
    const result = await ipcRenderer.invoke('element:startPicker')
    if (result) {
      props.node.properties.selector = result.selector
      props.node.properties.selectorType = result.selectorType
      handleChange()
      ElMessage.success('元素选择成功')
    }
  } catch (error) {
    console.error('选择元素失败:', error)
    ElMessage.error(error.message || '选择元素失败')
  } finally {
    isSelecting.value = false
  }
}

onMounted(() => {
  // 初始化默认值
  if (!props.node.properties.selectorType) {
    props.node.properties.selectorType = 'css'
  }
  if (!props.node.properties.waitAfterClick) {
    props.node.properties.waitAfterClick = false
  }
  if (!props.node.properties.clickTimeout) {
    props.node.properties.clickTimeout = 30
  }
})
</script> 