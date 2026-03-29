<template>
  <el-dialog
    v-model="visible"
    title="AI 流程助手"
    width="60%"
    :before-close="handleClose"
    class="ai-assistant-dialog"
  >
    <div class="ai-assistant-container">
      <!-- AI 配置区域 -->
      <div v-if="showConfig" class="ai-config-section">
        <el-form :model="config" label-width="100px">
          <el-form-item label="AI 提供商">
            <el-select
              v-model="config.provider"
              placeholder="选择 AI 提供商"
              @change="onProviderChange"
            >
              <el-option label="OpenAI" value="openai" />
              <el-option label="Claude" value="claude" />
              <el-option label="通义千问" value="qwen" />
              <el-option label="文心一言" value="wenxin" />
              <el-option label="DeepSeek" value="deepseek" />
              <el-option label="智谱AI" value="zhipu" />
              <el-option label="自定义AI" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="config.provider === 'custom'" label="API URL">
            <el-input
              v-model="config.apiUrl"
              placeholder="请输入自定义API地址，如：https://api.deepseek.com/v1/chat/completions"
            />
          </el-form-item>
          <el-form-item v-if="config.provider" label="API Key">
            <el-input
              v-model="config.apiKey"
              type="password"
              placeholder="请输入 API Key"
              show-password
            />
          </el-form-item>
          <el-form-item v-if="config.provider === 'openai'" label="模型">
            <el-select v-model="config.model" placeholder="选择模型">
              <el-option label="GPT-4" value="gpt-4" />
              <el-option label="GPT-4 Turbo" value="gpt-4-turbo-preview" />
              <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="config.provider === 'deepseek'" label="模型">
            <el-select v-model="config.model" placeholder="选择模型">
              <el-option label="DeepSeek Chat" value="deepseek-chat" />
              <el-option label="DeepSeek Coder" value="deepseek-coder" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="config.provider === 'zhipu'" label="模型">
            <el-select v-model="config.model" placeholder="选择模型">
              <el-option label="GLM-4" value="glm-4" />
              <el-option label="GLM-4V" value="glm-4v" />
              <el-option label="GLM-3 Turbo" value="glm-3-turbo" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
            <el-button @click="showConfig = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 对话区域 -->
      <div v-else class="chat-section">
        <!-- 预设模板 -->
        <div class="templates-section">
          <h4>快速开始</h4>
          <div class="template-chips">
            <el-tag
              v-for="template in templates"
              :key="template.id"
              class="template-chip"
              effect="plain"
              @click="useTemplate(template)"
            >
              {{ template.name }}
            </el-tag>
          </div>
        </div>

        <!-- 聊天历史 -->
        <div ref="chatHistory" class="chat-history">
          <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
            <div class="message-content">
              <el-icon v-if="message.role === 'user'"><User /></el-icon>
              <el-icon v-else><ChatDotRound /></el-icon>
              <div class="message-text">{{ message.content }}</div>
            </div>
          </div>
          <div v-if="isGenerating" class="message assistant">
            <div class="message-content">
              <el-icon><ChatDotRound /></el-icon>
              <div class="message-text">
                <el-icon class="is-loading"><Loading /></el-icon>
                正在生成流程...
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-section">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="3"
            placeholder="描述你想要自动化的任务，例如：每天早上9点自动打开浏览器，访问新闻网站，提取今日头条新闻并保存到Excel文件中"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="input-actions">
            <el-button
              type="primary"
              :disabled="!userInput.trim() || isGenerating"
              @click="sendMessage"
            >
              <el-icon><Promotion /></el-icon>
              生成流程
            </el-button>
            <el-button @click="showConfig = true">
              <el-icon><Setting /></el-icon>
              配置
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
  import { ref, computed, nextTick, watch } from 'vue'
  import { User, ChatDotRound, Loading, Promotion, Setting } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { AIService } from '@/services/ai-service.js'
  import { FlowGenerator } from '@/utils/flow-generator.js'

  interface AIConfig {
    provider: string
    apiKey: string
    model?: string
    apiUrl?: string
  }

  interface Message {
    role: 'user' | 'assistant'
    content: string
  }

  interface Template {
    id: string
    name: string
    description: string
  }

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'generate-flow': [nodes: any[]]
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const showConfig = ref(false)
  const config = ref<AIConfig>({
    provider: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
  })

  const messages = ref<Message[]>([])
  const userInput = ref('')
  const isGenerating = ref(false)
  const chatHistory = ref<HTMLElement>()

  const templates: Template[] = [
    {
      id: '1',
      name: '📰 每日新闻收集',
      description: '自动收集新闻并保存',
    },
    {
      id: '2',
      name: '📊 数据监控',
      description: '定时监控网站数据变化',
    },
    {
      id: '3',
      name: '📧 邮件自动化',
      description: '自动发送邮件报告',
    },
    {
      id: '4',
      name: '🛒 价格追踪',
      description: '监控商品价格变化',
    },
    {
      id: '5',
      name: '📝 表单填写',
      description: '自动填写在线表单',
    },
    {
      id: '6',
      name: '💾 数据备份',
      description: '定时备份网站数据',
    },
  ]

  // 检查是否在Electron环境中
  const isElectron = () => {
    return (
      typeof window !== 'undefined' &&
      window.electronAPI &&
      typeof window.electronAPI.invoke === 'function'
    )
  }

  // 处理提供商变化
  const onProviderChange = (provider: string) => {
    // 预设常用AI服务的API URL和默认模型
    const presetConfigs: Record<string, { url: string; model: string }> = {
      deepseek: {
        url: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
      },
      zhipu: {
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4',
      },
      openai: {
        url: '',
        model: 'gpt-3.5-turbo',
      },
      claude: {
        url: '',
        model: 'claude-3-haiku-20240307',
      },
    }

    if (presetConfigs[provider]) {
      config.value.apiUrl = presetConfigs[provider].url
      config.value.model = presetConfigs[provider].model
    } else if (provider !== 'custom') {
      // 其他内置提供商清除自定义URL
      config.value.apiUrl = ''
      config.value.model = ''
    }
  }

  // 加载配置
  const loadConfig = async () => {
    try {
      let savedConfig
      if (isElectron()) {
        savedConfig = await window.electronAPI.invoke('get-ai-config')
      } else {
        // 浏览器环境使用localStorage
        const configStr = localStorage.getItem('ai-config')
        savedConfig = configStr ? JSON.parse(configStr) : null
      }

      if (savedConfig) {
        config.value = savedConfig
      }
    } catch (error) {
      console.error('加载 AI 配置失败:', error)
    }
  }

  // 保存配置
  const saveConfig = async () => {
    try {
      if (!config.value.provider || !config.value.apiKey) {
        ElMessage.warning('请填写完整的配置信息')
        return
      }

      // 创建一个干净的配置对象，只包含可序列化的属性
      const cleanConfig = {
        provider: config.value.provider,
        apiKey: config.value.apiKey,
        model: config.value.model,
        apiUrl: config.value.apiUrl,
        customName: config.value.customName,
        customHeaders: config.value.customHeaders,
        requestFormat: config.value.requestFormat,
        responseFormat: config.value.responseFormat,
        customRequestTemplate: config.value.customRequestTemplate,
        customResponsePath: config.value.customResponsePath,
      }

      if (isElectron()) {
        await window.electronAPI.invoke('save-ai-config', cleanConfig)
      } else {
        // 浏览器环境使用localStorage
        localStorage.setItem('ai-config', JSON.stringify(cleanConfig))
      }

      ElMessage.success('配置保存成功')
      showConfig.value = false
    } catch (error) {
      console.error('保存配置详细错误:', error)
      ElMessage.error(`保存配置失败: ${error.message || '未知错误'}`)
    }
  }

  // 使用模板
  const useTemplate = (template: Template) => {
    const templatePrompts: Record<string, string> = {
      '1': '创建一个自动化流程：每天早上9点打开浏览器，访问新浪新闻网站，提取今日头条新闻标题和链接，保存到Excel文件中',
      '2': '创建一个数据监控流程：每小时打开指定网站，检查特定数据是否变化，如有变化则截图并发送通知',
      '3': '创建一个邮件自动化流程：每天下午5点，收集今日工作数据，生成报告并自动发送邮件给指定收件人',
      '4': '创建一个价格追踪流程：每6小时访问京东商品页面，提取商品价格，如果低于设定价格则发送提醒',
      '5': '创建一个表单自动填写流程：打开网站登录页面，自动输入用户名密码，登录后填写指定表单并提交',
      '6': '创建一个数据备份流程：每天凌晨2点，访问网站后台，导出数据并保存到本地指定文件夹',
    }

    userInput.value = templatePrompts[template.id] || template.description
  }

  // 发送消息
  const sendMessage = async () => {
    if (!userInput.value.trim() || isGenerating.value) return

    // 检查配置
    if (!config.value.provider || !config.value.apiKey) {
      ElMessage.warning('请先配置 AI 服务')
      showConfig.value = true
      return
    }

    const userMessage = userInput.value.trim()
    userInput.value = ''

    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: userMessage,
    })

    isGenerating.value = true
    scrollToBottom()

    try {
      // 调用 AI 服务生成流程
      const aiService = new AIService(config.value)
      const flowDescription = await aiService.generateFlowDescription(userMessage)

      // 添加 AI 回复
      messages.value.push({
        role: 'assistant',
        content: `已理解您的需求，正在生成以下流程：\n${flowDescription}`,
      })

      // 生成流程节点
      const flowGenerator = new FlowGenerator()
      const nodes = await flowGenerator.generateFromDescription(flowDescription)

      // 触发流程生成事件
      emit('generate-flow', nodes)

      ElMessage.success('流程生成成功！')

      // 延迟关闭对话框
      setTimeout(() => {
        visible.value = false
      }, 1500)
    } catch (error: any) {
      messages.value.push({
        role: 'assistant',
        content: `生成流程时出错：${error.message || '请检查网络连接和API配置'}`,
      })
      ElMessage.error('生成失败，请重试')
    } finally {
      isGenerating.value = false
      scrollToBottom()
    }
  }

  // 滚动到底部
  const scrollToBottom = () => {
    nextTick(() => {
      if (chatHistory.value) {
        chatHistory.value.scrollTop = chatHistory.value.scrollHeight
      }
    })
  }

  // 关闭对话框
  const handleClose = () => {
    visible.value = false
    // 清空聊天记录
    messages.value = []
    userInput.value = ''
  }

  // 初始化
  watch(visible, newVal => {
    if (newVal) {
      loadConfig()
    }
  })
</script>

<style scoped lang="postcss">
  .ai-assistant-dialog {
    :deep(.el-dialog__body) {
      padding: 0;
      height: 600px;
    }
  }

  .ai-assistant-container {
    @apply h-full flex flex-col;
  }

  .ai-config-section {
    @apply p-6;
  }

  .chat-section {
    @apply flex flex-col h-full;
  }

  .templates-section {
    @apply p-4 border-b;

    h4 {
      @apply text-sm text-gray-600 mb-2;
    }

    .template-chips {
      @apply flex flex-wrap gap-2;

      .template-chip {
        @apply cursor-pointer;

        &:hover {
          @apply bg-blue-50;
        }
      }
    }
  }

  .chat-history {
    @apply flex-1 overflow-y-auto p-4 space-y-4;
    background: linear-gradient(to bottom, #f9fafb, #ffffff);

    .message {
      @apply flex;

      &.user {
        @apply justify-end;

        .message-content {
          @apply bg-blue-500 text-white;
        }
      }

      &.assistant {
        @apply justify-start;

        .message-content {
          @apply bg-gray-100 text-gray-800;
        }
      }

      .message-content {
        @apply flex items-start gap-2 max-w-[80%] rounded-lg p-3;

        .message-text {
          @apply flex-1 whitespace-pre-wrap;
        }
      }
    }
  }

  .input-section {
    @apply border-t p-4 space-y-3;

    .input-actions {
      @apply flex justify-between;
    }
  }
</style>
