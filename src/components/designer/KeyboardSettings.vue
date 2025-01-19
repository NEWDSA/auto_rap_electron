<template>
  <div class="space-y-4">
    <!-- 操作类型 -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">操作类型</label>
      <el-select v-model="config.action" class="w-full">
        <el-option label="输入文本" value="type" />
        <el-option label="按键组合" value="press" />
        <el-option label="清空输入" value="clear" />
      </el-select>
    </div>
    
    <!-- 目标元素 -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">目标元素</label>
      <div class="flex items-center space-x-2">
        <el-input 
          v-model="config.target"
          placeholder="点击选择目标元素"
          readonly
          class="flex-1"
        />
        <el-button @click="startPicker">
          <el-icon><Aim /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- 输入内容（仅在输入文本时显示） -->
    <div v-if="config.action === 'type'" class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">输入内容</label>
      <el-input 
        v-model="config.text"
        type="textarea"
        :rows="3"
        placeholder="请输入要输入的文本"
      />
    </div>
    
    <!-- 按键组合（仅在按键组合时显示） -->
    <div v-if="config.action === 'press'" class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">按键组合</label>
      <div class="flex items-center space-x-2">
        <el-input 
          v-model="config.keys"
          placeholder="点击设置按键组合"
          readonly
          class="flex-1"
          @keydown="setKeys"
        />
        <el-button @click="clearKeys">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        例如：Control+C、Control+V、Alt+Tab 等
      </p>
    </div>
    
    <!-- 等待时间 -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">等待时间（毫秒）</label>
      <el-input-number 
        v-model="config.delay" 
        :min="0" 
        :max="10000"
        :step="100"
        class="w-full"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Aim, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      action: 'type',
      target: '',
      text: '',
      keys: '',
      delay: 500
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 代理配置对象
const config = ref({...props.modelValue})

// 监听配置变化
watch(config, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

// 开始选择目标元素
const startPicker = async () => {
  try {
    const result = await window.electronAPI.startElementPicker()
    if (result) {
      config.value.target = result
    }
  } catch (error) {
    console.error('选择元素失败:', error)
  }
}

// 设置按键组合
const setKeys = (e) => {
  e.preventDefault()
  const keys = []
  if (e.ctrlKey) keys.push('Control')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')
  if (e.key.toUpperCase() !== 'CONTROL' && 
      e.key.toUpperCase() !== 'SHIFT' && 
      e.key.toUpperCase() !== 'ALT') {
    keys.push(e.key.toUpperCase())
  }
  if (keys.length > 0) {
    config.value.keys = keys.join('+')
  }
}

// 清除按键组合
const clearKeys = () => {
  config.value.keys = ''
}
</script> 