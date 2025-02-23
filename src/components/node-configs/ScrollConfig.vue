<template>
  <div class="scroll-config">
    <el-form-item label="操作类型">
      <el-select
        v-model="props.node.properties.actionType"
        @change="handleChange('actionType')"
      >
        <el-option label="滚动到元素" value="scrollToElement" />
        <el-option label="滚动到坐标" value="scrollToPosition" />
        <el-option label="滚动到顶部" value="scrollToTop" />
        <el-option label="滚动到底部" value="scrollToBottom" />
      </el-select>
    </el-form-item>

    <template v-if="['scrollToElement'].includes(props.node.properties.actionType || '')">
      <el-form-item label="选择器类型">
        <el-select
          v-model="props.node.properties.selectorType"
          @change="handleChange('selectorType')"
        >
          <el-option label="CSS 选择器" value="css" />
          <el-option label="XPath" value="xpath" />
          <el-option label="ID" value="id" />
          <el-option label="Class" value="class" />
          <el-option label="Name" value="name" />
        </el-select>
      </el-form-item>

      <el-form-item label="选择器">
        <el-input
          v-model="props.node.properties.selector"
          placeholder="请选择要滚动到的元素"
          @change="handleChange('selector')"
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
    </template>

    <template v-if="['scrollToPosition'].includes(props.node.properties.actionType || '')">
      <el-form-item label="X坐标">
        <el-input-number
          v-model="props.node.properties.x"
          @change="handleChange('x')"
        />
      </el-form-item>
      <el-form-item label="Y坐标">
        <el-input-number
          v-model="props.node.properties.y"
          @change="handleChange('y')"
        />
      </el-form-item>
    </template>

    <el-form-item label="平滑滚动">
      <el-switch
        v-model="props.node.properties.smooth"
        @change="handleChange('smooth')"
      />
    </el-form-item>

    <el-form-item label="等待滚动完成">
      <el-switch
        v-model="props.node.properties.waitForScroll"
        @change="handleChange('waitForScroll')"
      />
    </el-form-item>

    <el-form-item 
      label="超时时间(秒)" 
      v-if="props.node.properties.waitForScroll"
    >
      <el-input-number
        v-model="props.node.properties.timeout"
        :min="1"
        :max="60"
        @change="handleChange('timeout')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FlowNode } from '@/types/node-config'
import { ipcRenderer } from '@/utils/electron'
import { ElMessage } from 'element-plus'

interface Props {
  node: {
    properties: {
      actionType?: 'scrollToElement' | 'scrollToPosition' | 'scrollToTop' | 'scrollToBottom'
      selectorType?: 'css' | 'xpath' | 'id' | 'class' | 'name'
      selector?: string
      x?: number
      y?: number
      smooth?: boolean
      waitForScroll?: boolean
      timeout?: number
    }
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const isSelecting = ref(false)

const handleChange = (key: string) => {
  emit('update', key)
}

const openBrowserForSelect = async () => {
  try {
    isSelecting.value = true
    ElMessage.info('请在浏览器中选择要滚动到的元素')
    
    const result = await ipcRenderer.invoke('element:startPicker')
    if (result) {
      props.node.properties.selector = result.selector
      props.node.properties.selectorType = result.selectorType
      handleChange('selector')
      ElMessage.success('元素选择成功')
    }
  } catch (error) {
    console.error('选择元素失败:', error)
    ElMessage.error(error.message || '选择元素失败')
  } finally {
    isSelecting.value = false
  }
}
</script> 