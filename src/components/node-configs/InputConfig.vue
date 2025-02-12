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
        placeholder="请选择输入元素"
        readonly
        @click="openBrowserForSelect"
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

    <el-form-item label="输入内容">
      <el-input
        v-model="node.properties.text"
        type="textarea"
        :rows="3"
        placeholder="请输入要填写的内容"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item label="输入设置">
      <div class="space-y-2">
        <el-checkbox
          v-model="node.properties.clearFirst"
          @change="handleChange"
        >
          清除原有内容
        </el-checkbox>

        <el-checkbox
          v-model="node.properties.simulateTyping"
          @change="handleChange"
        >
          模拟真实输入
        </el-checkbox>

        <div v-if="node.properties.simulateTyping" class="flex items-center space-x-2">
          <span>输入延迟(ms)：</span>
          <el-input-number
            v-model="node.properties.typingDelay"
            :min="50"
            :max="1000"
            :step="50"
            @change="handleChange"
          />
        </div>
      </div>
    </el-form-item>

    <el-form-item label="等待设置">
      <div class="space-y-2">
        <el-checkbox
          v-model="node.properties.waitAfterInput"
          @change="handleChange"
        >
          输入后等待
        </el-checkbox>

        <div v-if="node.properties.waitAfterInput" class="flex items-center space-x-2">
          <span>等待时间(秒)：</span>
          <el-input-number
            v-model="node.properties.waitTimeout"
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
    ElMessage.info('请在浏览器中选择要输入的元素')
    
    const selector = await ipcRenderer.invoke('element:startPicker')
    if (selector) {
      props.node.properties.selector = selector
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
  if (!props.node.properties.clearFirst) {
    props.node.properties.clearFirst = true
  }
  if (!props.node.properties.simulateTyping) {
    props.node.properties.simulateTyping = true
  }
  if (!props.node.properties.typingDelay) {
    props.node.properties.typingDelay = 100
  }
  if (!props.node.properties.waitAfterInput) {
    props.node.properties.waitAfterInput = false
  }
  if (!props.node.properties.waitTimeout) {
    props.node.properties.waitTimeout = 5
  }
})
</script> 