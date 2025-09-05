<template>
  <el-dialog
    v-model="visible"
    title="自定义 AI 模型管理"
    width="70%"
    @close="handleClose"
  >
    <div class="custom-models-manager">
      <!-- 模型列表 -->
      <div class="models-list">
        <div class="list-header">
          <h3>已添加的模型</h3>
          <el-button type="primary" size="small" @click="showAddModel = true">
            <el-icon><Plus /></el-icon>
            添加模型
          </el-button>
        </div>
        
        <el-table :data="customModels" style="width: 100%">
          <el-table-column prop="name" label="模型名称" width="150" />
          <el-table-column prop="provider" label="提供商" width="120" />
          <el-table-column prop="apiUrl" label="API 地址" />
          <el-table-column prop="model" label="模型标识" width="150" />
          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button type="text" @click="editModel(row)">编辑</el-button>
              <el-button type="text" @click="testModel(row)">测试</el-button>
              <el-button type="text" danger @click="deleteModel(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 添加/编辑模型对话框 -->
      <el-dialog
        v-model="showAddModel"
        :title="editingModel ? '编辑模型' : '添加自定义模型'"
        width="500px"
        append-to-body
      >
        <el-form :model="modelForm" label-width="100px">
          <el-form-item label="模型名称" required>
            <el-input v-model="modelForm.name" placeholder="如：ChatGLM-4" />
          </el-form-item>
          
          <el-form-item label="提供商类型" required>
            <el-select v-model="modelForm.provider" placeholder="选择类型">
              <el-option label="OpenAI 兼容" value="openai-compatible" />
              <el-option label="Ollama" value="ollama" />
              <el-option label="LM Studio" value="lmstudio" />
              <el-option label="自定义 API" value="custom" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="API 地址" required>
            <el-input 
              v-model="modelForm.apiUrl" 
              placeholder="如：http://localhost:11434/v1/chat/completions"
            />
            <div class="text-xs text-gray-500 mt-1">
              {{ getApiUrlHint() }}
            </div>
          </el-form-item>
          
          <el-form-item label="模型标识" required>
            <el-input 
              v-model="modelForm.model" 
              placeholder="如：llama3, qwen2.5, glm-4"
            />
          </el-form-item>
          
          <el-form-item label="API Key">
            <el-input 
              v-model="modelForm.apiKey" 
              type="password"
              show-password
              placeholder="如果需要认证，请输入 API Key"
            />
          </el-form-item>
          
          <el-form-item label="请求格式">
            <el-select v-model="modelForm.requestFormat" placeholder="选择请求格式">
              <el-option label="OpenAI 格式" value="openai" />
              <el-option label="Claude 格式" value="claude" />
              <el-option label="自定义格式" value="custom" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="温度" v-if="modelForm.provider !== 'custom'">
            <el-slider 
              v-model="modelForm.temperature" 
              :min="0" 
              :max="2" 
              :step="0.1"
              show-input
            />
          </el-form-item>
          
          <el-form-item label="最大令牌">
            <el-input-number 
              v-model="modelForm.maxTokens" 
              :min="100" 
              :max="32000"
              :step="100"
            />
          </el-form-item>
          
          <el-form-item label="自定义头部" v-if="modelForm.provider === 'custom'">
            <el-input
              v-model="modelForm.customHeaders"
              type="textarea"
              :rows="3"
              placeholder="JSON 格式，如：{&quot;Authorization&quot;: &quot;Bearer YOUR_KEY&quot;}"
            />
          </el-form-item>
          
          <el-form-item label="请求模板" v-if="modelForm.requestFormat === 'custom'">
            <el-input
              v-model="modelForm.requestTemplate"
              type="textarea"
              :rows="5"
              placeholder="自定义请求体模板，使用 {{prompt}} 作为占位符"
            />
          </el-form-item>
          
          <el-form-item label="响应路径" v-if="modelForm.requestFormat === 'custom'">
            <el-input
              v-model="modelForm.responsePath"
              placeholder="如：data.response.text 或 choices[0].message.content"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <el-button @click="showAddModel = false">取消</el-button>
          <el-button type="primary" @click="saveModel">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export interface CustomAIModel {
  id: string
  name: string
  provider: string
  apiUrl: string
  model: string
  apiKey?: string
  requestFormat: string
  temperature?: number
  maxTokens?: number
  customHeaders?: string
  requestTemplate?: string
  responsePath?: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'models-updated': [models: CustomAIModel[]]
}>()

const visible = ref(props.modelValue)
const showAddModel = ref(false)
const customModels = ref<CustomAIModel[]>([])
const editingModel = ref<CustomAIModel | null>(null)

const modelForm = ref<Partial<CustomAIModel>>({
  name: '',
  provider: 'openai-compatible',
  apiUrl: '',
  model: '',
  apiKey: '',
  requestFormat: 'openai',
  temperature: 0.7,
  maxTokens: 2000,
  customHeaders: '',
  requestTemplate: '',
  responsePath: ''
})

// 获取 API URL 提示
const getApiUrlHint = () => {
  switch (modelForm.value.provider) {
    case 'ollama':
      return '默认: http://localhost:11434/v1/chat/completions'
    case 'lmstudio':
      return '默认: http://localhost:1234/v1/chat/completions'
    case 'openai-compatible':
      return '输入兼容 OpenAI API 的地址'
    case 'custom':
      return '输入完整的 API 端点地址'
    default:
      return ''
  }
}

// 加载自定义模型
const loadCustomModels = async () => {
  try {
    const models = await window.electronAPI.invoke('get-custom-models')
    if (models) {
      customModels.value = models
    }
  } catch (error) {
    console.error('加载自定义模型失败:', error)
  }
}

// 保存模型
const saveModel = async () => {
  if (!modelForm.value.name || !modelForm.value.apiUrl || !modelForm.value.model) {
    ElMessage.warning('请填写必要信息')
    return
  }
  
  try {
    const model: CustomAIModel = {
      id: editingModel.value?.id || `model_${Date.now()}`,
      name: modelForm.value.name!,
      provider: modelForm.value.provider!,
      apiUrl: modelForm.value.apiUrl!,
      model: modelForm.value.model!,
      apiKey: modelForm.value.apiKey,
      requestFormat: modelForm.value.requestFormat!,
      temperature: modelForm.value.temperature,
      maxTokens: modelForm.value.maxTokens,
      customHeaders: modelForm.value.customHeaders,
      requestTemplate: modelForm.value.requestTemplate,
      responsePath: modelForm.value.responsePath
    }
    
    if (editingModel.value) {
      // 更新现有模型
      const index = customModels.value.findIndex(m => m.id === editingModel.value!.id)
      if (index !== -1) {
        customModels.value[index] = model
      }
    } else {
      // 添加新模型
      customModels.value.push(model)
    }
    
    // 保存到存储
    await window.electronAPI.invoke('save-custom-models', customModels.value)
    
    ElMessage.success('模型保存成功')
    showAddModel.value = false
    resetForm()
    
    // 通知父组件
    emit('models-updated', customModels.value)
  } catch (error) {
    ElMessage.error('保存模型失败')
  }
}

// 编辑模型
const editModel = (model: CustomAIModel) => {
  editingModel.value = model
  modelForm.value = { ...model }
  showAddModel.value = true
}

// 测试模型
const testModel = async (model: CustomAIModel) => {
  ElMessage.info('正在测试模型连接...')
  
  try {
    const result = await window.electronAPI.invoke('test-custom-model', model)
    if (result.success) {
      ElMessage.success('模型连接成功！')
    } else {
      ElMessage.error(`连接失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`测试失败: ${error.message}`)
  }
}

// 删除模型
const deleteModel = async (model: CustomAIModel) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模型 "${model.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    customModels.value = customModels.value.filter(m => m.id !== model.id)
    await window.electronAPI.invoke('save-custom-models', customModels.value)
    
    ElMessage.success('模型已删除')
    emit('models-updated', customModels.value)
  } catch {
    // 用户取消
  }
}

// 重置表单
const resetForm = () => {
  editingModel.value = null
  modelForm.value = {
    name: '',
    provider: 'openai-compatible',
    apiUrl: '',
    model: '',
    apiKey: '',
    requestFormat: 'openai',
    temperature: 0.7,
    maxTokens: 2000,
    customHeaders: '',
    requestTemplate: '',
    responsePath: ''
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  emit('update:modelValue', false)
}

// 初始化
onMounted(() => {
  loadCustomModels()
})

// 监听 props 变化
watch(() => props.modelValue, (val) => {
  visible.value = val
})
</script>

<style scoped lang="postcss">
.custom-models-manager {
  @apply h-full;
  
  .models-list {
    .list-header {
      @apply flex items-center justify-between mb-4;
      
      h3 {
        @apply text-lg font-medium m-0;
      }
    }
  }
  
  .text-xs {
    @apply text-xs;
  }
  
  .text-gray-500 {
    @apply text-gray-500;
  }
  
  .mt-1 {
    @apply mt-1;
  }
}
</style>