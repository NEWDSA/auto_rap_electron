<template>
  <div class="space-y-4">
    <el-form-item label="操作类型">
      <el-select v-model="node.properties.actionType" @change="handleChange">
        <el-option label="打开网页" value="goto" />
        <el-option label="刷新页面" value="refresh" />
        <el-option label="后退" value="back" />
        <el-option label="前进" value="forward" />
        <el-option label="关闭页面" value="close" />
        <el-option label="最大化" value="maximize" />
        <el-option label="最小化" value="minimize" />
      </el-select>
    </el-form-item>

    <el-form-item 
      v-if="node.properties.actionType === 'goto'" 
      label="网页地址"
    >
      <el-input 
        v-model="node.properties.url"
        placeholder="请输入网页地址，例如: https://www.example.com"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item label="等待页面加载">
      <el-switch
        v-model="node.properties.waitForLoad"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item 
      v-if="node.properties.waitForLoad"
      label="超时时间(秒)"
    >
      <el-input-number
        v-model="node.properties.timeout"
        :min="1"
        :max="60"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item label="浏览器设置">
      <div class="space-y-2">
        <el-checkbox
          v-model="node.properties.headless"
          @change="handleChange"
        >
          无头模式
        </el-checkbox>

        <el-checkbox
          v-model="node.properties.incognito"
          @change="handleChange"
        >
          隐身模式
        </el-checkbox>
      </div>
    </el-form-item>

    <el-form-item label="窗口大小">
      <div class="flex space-x-2">
        <el-input-number
          v-model="node.properties.width"
          :min="800"
          :max="1920"
          placeholder="宽度"
          @change="handleChange"
        />
        <span class="text-gray-500">x</span>
        <el-input-number
          v-model="node.properties.height"
          :min="600"
          :max="1080"
          placeholder="高度"
          @change="handleChange"
        />
      </div>
    </el-form-item>

    <el-form-item label="用户代理">
      <el-input
        v-model="node.properties.userAgent"
        placeholder="自定义User-Agent"
        @change="handleChange"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="openBrowser">
        打开浏览器进行元素选择
      </el-button>
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

const openBrowser = async () => {
  try {
    await ipcRenderer.invoke('open-browser', {
      url: props.node.properties.url || 'about:blank',
      width: props.node.properties.width,
      height: props.node.properties.height,
      headless: false,
      incognito: props.node.properties.incognito,
      userAgent: props.node.properties.userAgent
    })
  } catch (error) {
    console.error('打开浏览器失败:', error)
  }
}

onMounted(() => {
  // 初始化默认值
  if (!props.node.properties.actionType) {
    props.node.properties.actionType = 'goto'
  }
  if (!props.node.properties.waitForLoad) {
    props.node.properties.waitForLoad = true
  }
  if (!props.node.properties.timeout) {
    props.node.properties.timeout = 30
  }
  if (props.node.properties.headless === undefined) {
    props.node.properties.headless = false
  }
  if (props.node.properties.incognito === undefined) {
    props.node.properties.incognito = false
  }
  if (!props.node.properties.width) {
    props.node.properties.width = 1280
  }
  if (!props.node.properties.height) {
    props.node.properties.height = 800
  }
})
</script> 