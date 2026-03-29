<template>
  <div class="space-y-4" @click.stop>
    <el-form-item label="操作类型">
      <el-select v-model="localActionType" @change="handleActionTypeChange">
        <el-option label="打开网页" value="goto" />
        <el-option label="点击元素" value="click" />
        <el-option label="刷新页面" value="refresh" />
        <el-option label="后退" value="back" />
        <el-option label="前进" value="forward" />
        <el-option label="关闭页面" value="close" />
        <el-option label="最大化" value="maximize" />
        <el-option label="最小化" value="minimize" />
      </el-select>
    </el-form-item>

    <el-form-item v-if="localActionType === 'goto'" label="网页地址">
      <el-input v-model="localUrl" placeholder="请输入网页地址" clearable @change="handleUrlChange">
        <template #prefix>
          <el-icon><Link /></el-icon>
        </template>
        <template #append>
          <el-button title="在浏览器中测试打开" @click="testUrl">
            <el-icon><Position /></el-icon>
          </el-button>
        </template>
      </el-input>
      <div class="text-xs text-gray-400 mt-1">支持自动补全 https:// 前缀</div>
    </el-form-item>

    <el-form-item v-if="localActionType === 'click'" label="点击设置">
      <div class="space-y-2">
        <el-input
          v-model="node.properties.clickSelector"
          placeholder="请选择要点击的元素"
          @input="handleChange('clickSelector')"
        >
          <template #append>
            <el-button @click="openBrowserForClick">选择元素</el-button>
          </template>
        </el-input>

        <div class="flex space-x-2">
          <el-checkbox
            v-model="node.properties.waitAfterClick"
            @change="handleChange('waitAfterClick')"
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
            @change="handleChange('clickTimeout')"
          />
        </div>
      </div>
    </el-form-item>

    <el-form-item label="等待页面加载">
      <el-switch v-model="localWaitForLoad" @change="handleWaitForLoadChange" />
    </el-form-item>

    <el-form-item v-if="localWaitForLoad" label="超时时间(秒)">
      <el-input-number
        v-model="node.properties.timeout"
        :min="1"
        :max="60"
        @change="handleChange('timeout')"
      />
    </el-form-item>

    <el-form-item label="浏览器设置">
      <div class="space-y-4">
        <div class="flex items-center space-x-4">
          <el-button type="primary" @click="openBrowser">打开浏览器</el-button>
          <span class="text-gray-500 text-sm">使用 Electron 内置浏览器</span>
        </div>
      </div>
    </el-form-item>

    <el-form-item label="窗口大小">
      <div class="flex space-x-2">
        <el-input-number
          v-model="node.properties.width"
          :min="800"
          :max="1920"
          placeholder="宽度"
          @change="handleChange('width')"
        />
        <span class="text-gray-500">x</span>
        <el-input-number
          v-model="node.properties.height"
          :min="600"
          :max="1080"
          placeholder="高度"
          @change="handleChange('height')"
        />
      </div>
    </el-form-item>

    <el-form-item label="用户代理">
      <el-input
        v-model="node.properties.userAgent"
        placeholder="自定义User-Agent"
        @change="handleChange('userAgent')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import type { FlowNode } from '@/types/node-config'
  import { Link, Position } from '@element-plus/icons-vue'
  import { ipcRenderer } from '@/utils/electron'

  const props = defineProps<{
    node: FlowNode
  }>()

  const emit = defineEmits<{
    (e: 'update', key: string): void
  }>()

  // 添加本地状态
  const localWaitForLoad = ref(props.node.properties.waitForLoad)
  const localUrl = ref(props.node.properties.url || '')
  const localActionType = ref(props.node.properties.actionType || 'goto')

  // 监听属性变化
  watch(
    () => props.node.properties.waitForLoad,
    newVal => {
      localWaitForLoad.value = newVal
    }
  )

  watch(
    () => props.node.properties.url,
    newVal => {
      localUrl.value = newVal || ''
    }
  )

  watch(
    () => props.node.properties.actionType,
    newVal => {
      localActionType.value = newVal || 'goto'
    }
  )

  const handleChange = (propertyName?: string) => {
    if (propertyName) {
      // 只更新特定属性
      emit('update', propertyName)
    } else {
      // 更新所有属性
      emit('update', 'properties')
    }
  }

  // 添加类型安全的事件处理函数
  const handleActionTypeChange = (val: string) => {
    props.node.properties.actionType = val
    handleChange('actionType')
  }

  const handleUrlChange = (val: string) => {
    // 自动补全协议
    let finalUrl = val.trim()
    if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !/^file:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
      localUrl.value = finalUrl // 更新显示
    }

    props.node.properties.url = finalUrl
    handleChange('url')
  }

  const testUrl = () => {
    if (localUrl.value) {
      // 使用 electron shell 打开外部链接，或者直接 window.open
      // 这里优先尝试通过 electron API 打开，如果失败则 fallback
      try {
        ipcRenderer.invoke('open-external', localUrl.value).catch(() => {
          window.open(localUrl.value, '_blank')
        })
      } catch {
        window.open(localUrl.value, '_blank')
      }
    }
  }

  const handleWaitForLoadChange = (val: boolean) => {
    props.node.properties.waitForLoad = val
    handleChange('waitForLoad')
  }

  const openBrowserForClick = async () => {
    try {
      await ipcRenderer.invoke('open-browser', {
        url: props.node.properties.url || 'about:blank',
        width: props.node.properties.width,
        height: props.node.properties.height,
        userAgent: props.node.properties.userAgent,
      })

      // 等待元素选择
      const selector = await ipcRenderer.invoke('element:startPicker')
      if (selector) {
        props.node.properties.clickSelector = selector
        handleChange('clickSelector')
      }
    } catch (error) {
      console.error('打开浏览器失败:', error)
    }
  }

  const openBrowser = async () => {
    try {
      await ipcRenderer.invoke('open-browser', {
        url: props.node.properties.url || 'about:blank',
        width: props.node.properties.width,
        height: props.node.properties.height,
        userAgent: props.node.properties.userAgent,
      })
    } catch (error) {
      console.error('打开浏览器失败:', error)
    }
  }

  onMounted(() => {
    // 初始化默认值
    if (!props.node.properties.actionType) {
      props.node.properties.actionType = 'goto'
      localActionType.value = 'goto'
    }
    if (!props.node.properties.waitForLoad) {
      props.node.properties.waitForLoad = true
      localWaitForLoad.value = true
    }
    if (!props.node.properties.timeout) {
      props.node.properties.timeout = 30
    }

    if (!props.node.properties.width) {
      props.node.properties.width = 1280
    }
    if (!props.node.properties.height) {
      props.node.properties.height = 800
    }
    if (!props.node.properties.waitAfterClick) {
      props.node.properties.waitAfterClick = true
    }
    if (!props.node.properties.clickTimeout) {
      props.node.properties.clickTimeout = 5
    }
  })
</script>
