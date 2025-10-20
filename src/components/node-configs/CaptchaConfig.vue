<template>
  <div class="captcha-config">
    <el-form :model="config" label-width="120px" @submit.prevent>
      <!-- 基础配置 -->
      <el-form-item label="节点名称">
        <el-input v-model="config.name" placeholder="验证码识别" />
      </el-form-item>

      <!-- 验证码识别配置 -->
      <el-divider content-position="left">验证码识别配置</el-divider>
      
      <el-form-item label="识别服务商">
        <el-select v-model="config.provider" placeholder="选择识别服务商" @change="onProviderChange">
          <el-option label="百度OCR" value="baidu" />
          <el-option label="腾讯OCR" value="tencent" />
          <el-option label="阿里云OCR" value="aliyun" />
          <el-option label="有道智云" value="youdao" />
          <el-option label="京峰验证码" value="jfbym" />
          <el-option label="图图识别" value="ttshitu" />
          <el-option label="自定义API" value="custom" />
        </el-select>
      </el-form-item>

      <el-form-item label="API Key">
        <el-input 
          v-model="config.apiKey" 
          type="password" 
          placeholder="请输入API Key" 
          show-password 
        />
      </el-form-item>

      <el-form-item label="Secret Key" v-if="needSecretKey">
        <el-input 
          v-model="config.secretKey" 
          type="password" 
          placeholder="请输入Secret Key" 
          show-password 
        />
      </el-form-item>

      <el-form-item label="API地址" v-if="config.provider === 'custom'">
        <el-input 
          v-model="config.apiUrl" 
          placeholder="请输入自定义API地址" 
        />
      </el-form-item>

      <!-- 验证码获取方式 -->
      <el-divider content-position="left">验证码获取</el-divider>
      
      <el-form-item label="获取方式">
        <el-radio-group v-model="config.captchaSource">
          <el-radio value="screenshot">截图获取</el-radio>
          <el-radio value="element">元素截图</el-radio>
          <el-radio value="upload">上传图片</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="验证码选择器" v-if="config.captchaSource === 'element'">
        <div class="selector-input">
          <el-input 
            v-model="config.captchaSelector" 
            placeholder="请输入验证码图片的CSS选择器"
          />
          <el-button 
            type="primary" 
            @click="startElementPicker" 
            :loading="isPickingElement"
            size="small"
          >
            {{ isPickingElement ? '选择中...' : '选择元素' }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="截图区域" v-if="config.captchaSource === 'screenshot'">
        <el-radio-group v-model="config.screenshotType">
          <el-radio value="fullpage">全页面</el-radio>
          <el-radio value="viewport">可视区域</el-radio>
          <el-radio value="custom">自定义区域</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="截图坐标" v-if="config.captchaSource === 'screenshot' && config.screenshotType === 'custom'">
        <div class="coordinate-inputs">
          <el-input-number v-model="config.x" placeholder="X" size="small" />
          <el-input-number v-model="config.y" placeholder="Y" size="small" />
          <el-input-number v-model="config.width" placeholder="宽度" size="small" />
          <el-input-number v-model="config.height" placeholder="高度" size="small" />
        </div>
      </el-form-item>

      <!-- 验证码类型 -->
      <el-divider content-position="left">验证码类型</el-divider>
      
      <el-form-item label="验证码类型">
        <el-select v-model="config.captchaType" placeholder="选择验证码类型">
          <el-option label="普通验证码" value="normal" />
          <el-option label="点击验证码" value="click" />
          <el-option label="滑块验证码" value="slide" />
          <el-option label="选择验证码" value="select" />
          <el-option label="旋转验证码" value="rotate" />
          <el-option label="拼图验证码" value="puzzle" />
          <el-option label="数学运算" value="math" />
          <el-option label="中文验证码" value="chinese" />
        </el-select>
      </el-form-item>

      <!-- 结果处理 -->
      <el-divider content-position="left">结果处理</el-divider>
      
      <el-form-item label="结果变量名">
        <el-input 
          v-model="config.resultVariable" 
          placeholder="captcha_result" 
        />
      </el-form-item>

      <el-form-item label="输入目标" v-if="config.captchaType === 'normal'">
        <div class="selector-input">
          <el-input 
            v-model="config.inputSelector" 
            placeholder="验证码输入框的CSS选择器"
          />
          <el-button 
            type="primary" 
            @click="startInputPicker" 
            :loading="isPickingInput"
            size="small"
          >
            {{ isPickingInput ? '选择中...' : '选择输入框' }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="自动输入">
        <el-switch v-model="config.autoInput" />
        <span class="help-text">识别成功后自动输入到指定输入框</span>
      </el-form-item>

      <!-- 高级选项 -->
      <el-divider content-position="left">高级选项</el-divider>
      
      <el-form-item label="识别超时">
        <el-input-number 
          v-model="config.timeout" 
          :min="5" 
          :max="120" 
          placeholder="30"
        />
        <span class="help-text">秒</span>
      </el-form-item>

      <el-form-item label="重试次数">
        <el-input-number 
          v-model="config.retryCount" 
          :min="0" 
          :max="5" 
          placeholder="2"
        />
      </el-form-item>

      <el-form-item label="识别失败处理">
        <el-radio-group v-model="config.onFailure">
          <el-radio value="stop">停止流程</el-radio>
          <el-radio value="continue">继续执行</el-radio>
          <el-radio value="manual">人工处理</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="保存图片">
        <el-switch v-model="config.saveImage" />
        <span class="help-text">保存验证码图片到本地</span>
      </el-form-item>

      <el-form-item label="图片路径" v-if="config.saveImage">
        <el-input 
          v-model="config.imagePath" 
          placeholder="./captcha_images/"
        />
      </el-form-item>

      <!-- 测试功能 -->
      <el-divider content-position="left">测试功能</el-divider>
      
      <el-form-item>
        <el-button type="primary" @click="testRecognition" :loading="isTesting">
          {{ isTesting ? '测试中...' : '测试识别' }}
        </el-button>
        <el-button @click="openServiceDoc">查看服务文档</el-button>
      </el-form-item>

      <el-form-item v-if="testResult">
        <el-alert 
          :title="testResult.success ? '测试成功' : '测试失败'" 
          :type="testResult.success ? 'success' : 'error'"
          :description="testResult.message"
          show-icon
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CaptchaService, type CaptchaConfig as CaptchaServiceConfig, defaultCaptchaConfigs } from '@/services/captcha-service'

interface CaptchaNodeConfig {
  name: string
  nodeType: string
  // 服务配置
  provider: string
  apiKey: string
  secretKey?: string
  apiUrl?: string
  // 验证码获取
  captchaSource: 'screenshot' | 'element' | 'upload'
  captchaSelector?: string
  screenshotType?: 'fullpage' | 'viewport' | 'custom'
  x?: number
  y?: number
  width?: number
  height?: number
  // 验证码类型
  captchaType: string
  // 结果处理
  resultVariable: string
  inputSelector?: string
  autoInput: boolean
  // 高级选项
  timeout: number
  retryCount: number
  onFailure: 'stop' | 'continue' | 'manual'
  saveImage: boolean
  imagePath?: string
}

const props = defineProps<{
  modelValue: CaptchaNodeConfig
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CaptchaNodeConfig]
}>()

// 配置数据
const config = ref<CaptchaNodeConfig>({
  name: '验证码识别',
  nodeType: 'captcha',
  provider: 'baidu',
  apiKey: '',
  captchaSource: 'element',
  captchaType: 'normal',
  resultVariable: 'captcha_result',
  autoInput: true,
  timeout: 30,
  retryCount: 2,
  onFailure: 'manual',
  saveImage: false,
  ...props.modelValue
})

// 状态
const isPickingElement = ref(false)
const isPickingInput = ref(false)
const isTesting = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 计算属性
const needSecretKey = computed(() => {
  return ['baidu', 'tencent', 'ttshitu'].includes(config.value.provider)
})

// 监听配置变化
watch(config, (newConfig) => {
  emit('update:modelValue', newConfig)
}, { deep: true })

// 服务商变化处理
const onProviderChange = () => {
  // 清空相关配置
  config.value.apiKey = ''
  config.value.secretKey = ''
  config.value.apiUrl = ''
  testResult.value = null
}

// 开始选择验证码元素
const startElementPicker = async () => {
  try {
    isPickingElement.value = true
    
    // 调用元素选择器
    const result = await window.electronAPI?.invoke('element:startPicker')
    if (result?.selector) {
      config.value.captchaSelector = result.selector
      ElMessage.success('验证码元素选择成功')
    }
  } catch (error: any) {
    ElMessage.error(`选择元素失败: ${error.message}`)
  } finally {
    isPickingElement.value = false
  }
}

// 开始选择输入框元素
const startInputPicker = async () => {
  try {
    isPickingInput.value = true
    
    const result = await window.electronAPI?.invoke('element:startPicker')
    if (result?.selector) {
      config.value.inputSelector = result.selector
      ElMessage.success('输入框元素选择成功')
    }
  } catch (error: any) {
    ElMessage.error(`选择元素失败: ${error.message}`)
  } finally {
    isPickingInput.value = false
  }
}

// 测试识别功能
const testRecognition = async () => {
  if (!config.value.apiKey) {
    ElMessage.warning('请先配置API Key')
    return
  }

  try {
    isTesting.value = true
    testResult.value = null

    // 创建验证码服务实例
    const captchaService = new CaptchaService({
      provider: config.value.provider as any,
      apiKey: config.value.apiKey,
      secretKey: config.value.secretKey,
      apiUrl: config.value.apiUrl,
      timeout: config.value.timeout * 1000
    })

    // 这里应该获取一个测试图片进行识别
    // 暂时使用模拟数据
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    
    const result = await captchaService.recognize(testImageBase64, config.value.captchaType)
    
    if (result.success) {
      testResult.value = {
        success: true,
        message: `识别成功: ${result.text || '无文本结果'}`
      }
    } else {
      testResult.value = {
        success: false,
        message: result.error || '识别失败'
      }
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: `测试失败: ${error.message}`
    }
  } finally {
    isTesting.value = false
  }
}

// 打开服务文档
const openServiceDoc = () => {
  const serviceInfo = defaultCaptchaConfigs[config.value.provider as keyof typeof defaultCaptchaConfigs]
  if (serviceInfo?.website) {
    window.open(serviceInfo.website, '_blank')
  } else {
    ElMessage.info('暂无服务文档链接')
  }
}
</script>

<style scoped lang="postcss">
.captcha-config {
  @apply p-4;
}

.selector-input {
  @apply flex gap-2;
  
  .el-input {
    @apply flex-1;
  }
}

.coordinate-inputs {
  @apply flex gap-2;
  
  .el-input-number {
    @apply flex-1;
  }
}

.help-text {
  @apply text-sm text-gray-500 ml-2;
}

.el-divider {
  @apply my-4;
}

.el-alert {
  @apply mt-2;
}
</style>