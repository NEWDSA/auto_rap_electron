<template>
  <div class="voice-config">
    <el-form :model="config" label-width="120px" size="small">
      <!-- 文本内容 -->
      <el-form-item label="朗读文本">
        <div class="space-y-2">
          <el-input
            v-model="config.voiceText"
            type="textarea"
            :rows="4"
            placeholder="请输入要朗读的文本内容，支持变量引用如：{{变量名}}"
            @input="handleChange('voiceText')"
          >
            <template #append>
              <el-button size="small" type="danger" plain @click="clearText"> 清空 </el-button>
            </template>
          </el-input>

          <!-- 快速插入变量按钮 -->
          <div class="flex flex-wrap gap-2">
            <el-button size="small" @click="insertVariable('fileContent')">
              插入文件内容
            </el-button>
            <el-button size="small" @click="insertVariable('filePath')"> 插入文件路径 </el-button>
            <el-button size="small" @click="insertVariable('fileType')"> 插入文件类型 </el-button>
            <el-button size="small" @click="insertVariable('size')"> 插入文件大小 </el-button>
          </div>

          <div class="text-xs text-gray-500">
            支持变量引用，如：&#123;&#123;变量名&#125;&#125; 或 {{ 变量名 }}
          </div>
          <div class="text-xs text-blue-500">
            💡 如果花括号被自动删除，请使用：&#123;&#123;变量名&#125;&#125;
          </div>
        </div>
      </el-form-item>

      <!-- 语音类型 -->
      <el-form-item label="语音类型">
        <el-radio-group v-model="config.voiceType" @change="handleChange('voiceType')">
          <el-radio label="system">系统语音</el-radio>
          <el-radio label="online">在线语音</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 语言选择 -->
      <el-form-item label="语言">
        <el-select
          v-model="config.language"
          placeholder="选择语言"
          @change="handleChange('language')"
        >
          <el-option label="中文（简体）" value="zh-CN" />
          <el-option label="中文（繁体）" value="zh-TW" />
          <el-option label="英语（美国）" value="en-US" />
          <el-option label="英语（英国）" value="en-GB" />
          <el-option label="日语" value="ja-JP" />
          <el-option label="韩语" value="ko-KR" />
        </el-select>
      </el-form-item>

      <!-- 语音选择 -->
      <el-form-item v-if="config.voiceType === 'system'" label="语音">
        <el-select
          v-model="config.voice"
          placeholder="选择语音"
          filterable
          @change="handleChange('voice')"
        >
          <el-option label="默认语音（推荐）" value="default" />
          <el-option
            v-for="voice in chineseVoices"
            :key="voice.name"
            :label="`${voice.name} (${voice.lang})`"
            :value="voice.name"
          />
        </el-select>
        <div class="text-xs text-gray-500 mt-1">
          <span v-if="config.language === 'zh-CN'">
            💡 找到 {{ chineseVoices.length }} 个中文语音，建议使用"默认语音"获得最佳兼容性
          </span>
          <span v-else> 💡 找到 {{ availableVoices.length }} 个可用语音 </span>
        </div>
      </el-form-item>

      <!-- 语速设置 -->
      <el-form-item label="语速">
        <div class="flex items-center space-x-4">
          <el-slider
            v-model="config.speed"
            :min="0.5"
            :max="2.0"
            :step="0.1"
            style="flex: 1"
            @change="handleChange('speed')"
          />
          <span class="text-sm text-gray-500 w-16">{{ config.speed }}x</span>
        </div>
      </el-form-item>

      <!-- 音调设置 -->
      <el-form-item label="音调">
        <div class="flex items-center space-x-4">
          <el-slider
            v-model="config.pitch"
            :min="0.5"
            :max="2.0"
            :step="0.1"
            style="flex: 1"
            @change="handleChange('pitch')"
          />
          <span class="text-sm text-gray-500 w-16">{{ config.pitch }}x</span>
        </div>
      </el-form-item>

      <!-- 音量设置 -->
      <el-form-item label="音量">
        <div class="flex items-center space-x-4">
          <el-slider
            v-model="config.volume"
            :min="0.1"
            :max="1.0"
            :step="0.1"
            style="flex: 1"
            @change="handleChange('volume')"
          />
          <span class="text-sm text-gray-500 w-16">{{ Math.round(config.volume * 100) }}%</span>
        </div>
      </el-form-item>

      <!-- 输出选项 -->
      <el-form-item label="输出选项">
        <div class="space-y-2">
          <el-checkbox v-model="config.playImmediately" @change="handleChange('playImmediately')">
            立即播放
          </el-checkbox>

          <div v-if="!config.playImmediately" class="mt-2">
            <el-input
              v-model="config.outputFile"
              placeholder="输出文件路径（可选）"
              @input="handleChange('outputFile')"
            />
            <div class="text-xs text-gray-500 mt-1">留空则只播放不保存文件</div>
          </div>
        </div>
      </el-form-item>

      <!-- 测试按钮 -->
      <el-form-item>
        <el-button
          type="primary"
          size="small"
          :disabled="!config.voiceText || isSpeaking"
          :loading="isSpeaking"
          @click="testVoice"
        >
          {{ isSpeaking ? '播放中...' : '测试语音' }}
        </el-button>
        <el-button type="danger" size="small" :disabled="!isSpeaking" @click="stopVoice">
          停止播放
        </el-button>
        <el-button type="warning" size="small" @click="diagnoseChineseVoice">
          诊断中文语音
        </el-button>
        <el-button type="info" size="small" @click="loadVoices"> 刷新语音列表 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { speechManager, type VoiceOptions } from '@/utils/speech'
  import type { NodeConfigProps } from '@/types/node-config'

  const props = defineProps<NodeConfigProps>()

  // 默认配置
  const defaultConfig = {
    voiceText: '',
    voiceType: 'system' as const,
    language: 'zh-CN',
    voice: 'default',
    speed: 1.0,
    pitch: 1.0,
    volume: 0.8,
    outputFile: '',
    playImmediately: true,
  }

  // 使用 computed 来避免响应式冲突和默认值覆盖问题
  const config = computed({
    get: () => {
      const nodeProps = props.node.properties || {}
      return {
        ...defaultConfig,
        ...nodeProps,
      }
    },
    set: newConfig => {
      // 直接更新节点属性，避免中间状态
      Object.assign(props.node.properties, newConfig)
    },
  })

  // 语音相关状态
  const availableVoices = ref<SpeechSynthesisVoice[]>([])
  const chineseVoices = ref<SpeechSynthesisVoice[]>([])
  const isSpeaking = ref(false)

  // 组件挂载时初始化语音
  onMounted(async () => {
    await loadVoices()
  })

  const handleChange = (key: string) => {
    props.onUpdate?.(key)
  }

  // 加载可用语音
  const loadVoices = async () => {
    try {
      // 等待语音加载完成
      if (speechSynthesis.getVoices().length === 0) {
        await new Promise(resolve => {
          speechSynthesis.onvoiceschanged = resolve
          // 如果 1 秒后还没有加载完成，直接继续
          setTimeout(resolve, 1000)
        })
      }

      const voices = speechManager.getVoices()
      const chineseVoicesList = speechManager.getChineseVoices()

      availableVoices.value = voices
      chineseVoices.value = chineseVoicesList

      console.log('可用语音数量:', voices.length)
      console.log('中文语音数量:', chineseVoicesList.length)
      console.log(
        '中文语音列表:',
        chineseVoicesList.map(v => v.name)
      )
    } catch (error) {
      console.error('加载语音失败:', error)
    }
  }

  // 清空文本
  const clearText = () => {
    props.node.properties.voiceText = ''
    handleChange('voiceText')
    ElMessage.success('文本已清空')
  }

  // 插入变量
  const insertVariable = (varName: string) => {
    const variableText = `{{${varName}}}`
    const currentText = props.node.properties.voiceText || ''
    const cursorPos = currentText.length
    const newText = currentText.slice(0, cursorPos) + variableText + currentText.slice(cursorPos)

    // 直接更新节点属性
    props.node.properties.voiceText = newText
    handleChange('voiceText')
  }

  // 测试语音
  const testVoice = async () => {
    if (!config.value.voiceText) {
      ElMessage.warning('请输入要朗读的文本')
      return
    }

    try {
      // 检查语音支持
      if (!speechManager.isSupported()) {
        ElMessage.error('浏览器不支持语音合成功能')
        return
      }

      // 检测是否为中文文本
      const isChinese = /[\u4e00-\u9fff]/.test(config.value.voiceText)

      // 显示加载状态
      const loadingMessage = ElMessage({
        message: '正在播放语音...',
        type: 'info',
        duration: 0,
        showClose: true,
      })

      isSpeaking.value = true

      // 准备语音选项
      const voiceOptions: VoiceOptions = {
        rate: config.value.speed,
        pitch: config.value.pitch,
        volume: config.value.volume,
        lang: config.value.language,
      }

      // 如果指定了特定语音
      if (config.value.voice !== 'default') {
        const selectedVoice = availableVoices.value.find(voice => voice.name === config.value.voice)
        if (selectedVoice) {
          voiceOptions.voice = selectedVoice.name
        }
      }

      // 使用 Web Speech API 播放
      const result = await speechManager.speak(config.value.voiceText, voiceOptions)

      // 关闭加载消息
      loadingMessage.close()
      isSpeaking.value = false

      if (result.success) {
        ElMessage.success('语音播放成功')
      } else {
        ElMessage.error({
          message: `语音播放失败: ${result.error}`,
          duration: 5000,
          showClose: true,
        })

        // 针对中文语音的特殊建议
        if (isChinese && result.error) {
          ElMessage.info({
            message:
              '中文语音建议：1. 确保系统已安装中文语音包 2. 尝试使用"默认语音"选项 3. 检查浏览器语音设置',
            duration: 8000,
            showClose: true,
          })
        }
      }
    } catch (error) {
      console.error('测试语音失败:', error)
      isSpeaking.value = false
      ElMessage.error({
        message: '测试语音失败，请检查语音设置',
        duration: 5000,
        showClose: true,
      })
    }
  }

  // 停止语音
  const stopVoice = () => {
    try {
      speechManager.stop()
      isSpeaking.value = false
      ElMessage.info('已停止语音播放')
    } catch (error) {
      console.error('停止语音失败:', error)
      ElMessage.error('停止语音失败')
    }
  }

  // 诊断中文语音
  const diagnoseChineseVoice = async () => {
    try {
      const loadingMessage = ElMessage({
        message: '正在诊断中文语音...',
        type: 'info',
        duration: 0,
        showClose: true,
      })

      // 检查语音支持
      if (!speechManager.isSupported()) {
        loadingMessage.close()
        ElMessage.error('浏览器不支持语音合成功能')
        return
      }

      // 获取语音信息
      const speechInfo = speechManager.getSpeechInfo()
      const chineseVoicesList = speechManager.getChineseVoices()

      loadingMessage.close()

      // 显示诊断结果
      if (chineseVoicesList.length > 0) {
        ElMessage.success({
          message: `中文语音引擎正常，找到 ${chineseVoicesList.length} 个中文语音`,
          duration: 5000,
          showClose: true,
        })

        // 显示中文语音列表
        console.log(
          '中文语音列表:',
          chineseVoicesList.map(v => ({
            name: v.name,
            lang: v.lang,
            localService: v.localService,
          }))
        )

        // 测试中文语音播放
        const testResult = await speechManager.speak('你好，这是中文语音测试', {
          lang: 'zh-CN',
          rate: 1.0,
        })

        if (testResult.success) {
          ElMessage.success('中文语音测试成功')
        } else {
          ElMessage.warning({
            message: `中文语音测试失败: ${testResult.error}`,
            duration: 5000,
            showClose: true,
          })
        }
      } else {
        ElMessage.error({
          message: '未找到中文语音，请检查系统语音设置',
          duration: 5000,
          showClose: true,
        })

        ElMessage.warning({
          message:
            '解决建议：1. 在系统设置中安装中文语音包 2. 检查浏览器语音权限 3. 尝试重启应用程序',
          duration: 8000,
          showClose: true,
        })
      }

      // 显示详细语音信息
      console.log('语音诊断信息:', speechInfo)
    } catch (error) {
      console.error('语音诊断失败:', error)
      ElMessage.error('语音诊断失败')
    }
  }
</script>

<style scoped>
  .voice-config {
    padding: 16px;
  }

  .space-y-2 > * + * {
    margin-top: 8px;
  }
</style>
