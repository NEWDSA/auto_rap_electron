<template>
  <div class="intelligent-recorder">
    <el-dialog
      v-model="dialogVisible"
      title="智能录制"
      width="600px"
      :close-on-click-modal="false"
      @close="handleCancel"
    >
      <div class="recorder-content">
        <!-- 录制前设置 -->
        <div v-if="!isRecording && !recordingCompleted">
          <el-form label-position="top">
            <el-form-item label="目标URL">
              <el-input 
                v-model="targetUrl" 
                placeholder="请输入要录制的网页URL" 
                @keyup.enter="startRecording"
              />
            </el-form-item>
            
            <el-form-item label="录制选项">
              <el-checkbox v-model="options.includeScrollEvents">包含滚动事件</el-checkbox>
              <el-checkbox v-model="options.screenshotOnAction">每个动作截图</el-checkbox>
            </el-form-item>
            
            <el-form-item label="选择器优先级">
              <el-radio-group v-model="options.elementSelectorPreference">
                <el-radio label="css">CSS选择器</el-radio>
                <el-radio label="xpath">XPath</el-radio>
                <el-radio label="mixed">混合模式</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          
          <div class="text-sm text-gray-500 mb-4">
            <p>录制将在新窗口中打开目标网页，自动捕获您的操作。</p>
            <p>完成后点击"结束录制"按钮，系统将智能生成流程。</p>
          </div>
        </div>
        
        <!-- 录制中状态 -->
        <div v-if="isRecording && !recordingCompleted" class="recording-status">
          <div class="flex items-center justify-center my-4">
            <div class="recording-indicator"></div>
            <span class="ml-2 text-lg font-medium">正在录制中...</span>
          </div>
          
          <div class="text-center text-sm text-gray-500 mb-4">
            <p>请在打开的窗口中执行您需要自动化的操作</p>
            <p>系统正在智能捕获您的每一步操作</p>
          </div>
          
          <div v-if="capturedActions.length > 0" class="mt-4">
            <div class="text-sm font-medium mb-2">已捕获 {{ capturedActions.length }} 个操作：</div>
            <el-scrollbar height="200px">
              <div 
                v-for="(action, index) in capturedActions" 
                :key="action.id" 
                class="action-item p-2 border-b last:border-0"
              >
                <div class="flex items-center">
                  <span class="mr-2 text-xs bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center">{{ index + 1 }}</span>
                  <div>
                    <div class="font-medium">{{ formatActionType(action.type) }}</div>
                    <div class="text-xs text-gray-500">
                      {{ formatActionDetails(action) }}
                    </div>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </div>
        
        <!-- 录制完成状态 -->
        <div v-if="recordingCompleted" class="completed-status">
          <div class="text-center mb-4">
            <div class="success-icon mx-auto"></div>
            <div class="text-lg font-medium">录制完成！</div>
            <div class="text-sm text-gray-500">
              成功捕获 {{ capturedActions.length }} 个操作
            </div>
          </div>
          
          <el-divider>录制结果</el-divider>
          
          <div v-if="capturedActions.length > 0" class="mt-4">
            <el-scrollbar height="200px">
              <div 
                v-for="(action, index) in capturedActions" 
                :key="action.id" 
                class="action-item p-2 border-b last:border-0"
              >
                <div class="flex items-center">
                  <span class="mr-2 text-xs bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center">{{ index + 1 }}</span>
                  <div>
                    <div class="font-medium">{{ formatActionType(action.type) }}</div>
                    <div class="text-xs text-gray-500">
                      {{ formatActionDetails(action) }}
                    </div>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <!-- 录制前的按钮 -->
          <div v-if="!isRecording && !recordingCompleted">
            <el-button @click="handleCancel">取消</el-button>
            <el-button 
              type="primary" 
              @click="startRecording" 
              :disabled="!targetUrl"
            >
              开始录制
            </el-button>
          </div>
          
          <!-- 录制中的按钮 -->
          <div v-if="isRecording && !recordingCompleted">
            <el-button 
              type="danger" 
              @click="stopRecording"
            >
              结束录制
            </el-button>
          </div>
          
          <!-- 录制完成的按钮 -->
          <div v-if="recordingCompleted">
            <el-button @click="handleCancel">取消</el-button>
            <el-button 
              type="success" 
              @click="generateFlow"
            >
              生成流程
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { IntelligentRecorder, RecordActionType, RecordAction } from '@/core/recorder/IntelligentRecorder'

// 组件属性
const props = defineProps<{
  visible: boolean
}>()

// 事件
const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'generate-flow', nodes: any[]): void
}>()

// 响应式状态
const dialogVisible = ref(props.visible)
const targetUrl = ref('')
const isRecording = ref(false)
const recordingCompleted = ref(false)
const capturedActions = ref<RecordAction[]>([])
const options = reactive({
  includeScrollEvents: false,
  includeHoverEvents: false,
  elementSelectorPreference: 'mixed' as 'css' | 'xpath' | 'mixed',
  minTimeBetweenEvents: 50,
  recordMouseMove: false,
  screenshotOnAction: false
})

// 监听对话框可见性
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
  }
)

// 监听对话框关闭
watch(
  () => dialogVisible.value,
  (newVal) => {
    emit('update:visible', newVal)
  }
)

// 格式化动作类型
const formatActionType = (type: string) => {
  const typeMap: Record<string, string> = {
    [RecordActionType.CLICK]: '点击元素',
    [RecordActionType.INPUT]: '输入文本',
    [RecordActionType.NAVIGATE]: '页面导航',
    [RecordActionType.SCROLL]: '滚动页面',
    [RecordActionType.KEYBOARD]: '键盘操作',
    [RecordActionType.EXTRACT]: '提取数据'
  }
  
  return typeMap[type] || type
}

// 格式化动作详情
const formatActionDetails = (action: RecordAction) => {
  switch (action.type) {
    case RecordActionType.CLICK:
      return `目标: ${action.target?.innerText || action.target?.selector || '未知元素'}`
    case RecordActionType.INPUT:
      return `输入: ${action.data?.text || ''}`
    case RecordActionType.NAVIGATE:
      return `URL: ${action.data?.url || ''}`
    case RecordActionType.SCROLL:
      return `滚动到: (${action.data?.x || 0}, ${action.data?.y || 0})`
    case RecordActionType.KEYBOARD:
      const modifiers = action.data?.modifiers || []
      const key = action.data?.key || ''
      return `按键: ${modifiers.length > 0 ? modifiers.join('+') + '+' : ''}${key}`
    default:
      return '未知动作'
  }
}

// 开始录制
const startRecording = async () => {
  if (!targetUrl.value) {
    ElMessage.warning('请输入目标URL')
    return
  }
  
  try {
    isRecording.value = true
    capturedActions.value = []
    recordingCompleted.value = false
    
    // 验证URL格式
    let url = targetUrl.value
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
      targetUrl.value = url
    }
    
    console.log('开始录制URL:', url)
    
    // 测试electronAPI是否可用
    if (!window.electronAPI) {
      console.error('electronAPI 不可用！');
      throw new Error('electronAPI 不可用，请检查Electron配置');
    }
    
    // 测试IPC通道
    try {
      // 先尝试简单的IPC测试
      console.log('测试IPC通道前');
      const testResult = await window.electronAPI.invoke('test-ipc-channel', { message: 'test' });
      console.log('IPC测试结果:', testResult);
    } catch (testError) {
      console.error('IPC测试失败，详细错误:', testError);
      console.error('IPC测试错误类型:', typeof testError);
      console.error('IPC测试错误字符串:', String(testError));
      console.error('IPC测试错误JSON:', JSON.stringify(testError, Object.getOwnPropertyNames(testError)));
      // 继续执行，不影响主流程
    }
    
    // 注册IPC监听器
    const unsubscribe = window.electronAPI.on('recorder:action-captured', (action: RecordAction) => {
      console.log('捕获到操作:', action)
      capturedActions.value.push(action)
    })
    
    // 开始录制
    console.log('调用recorder:start前');
    const result = await window.electronAPI.invoke('recorder:start', url);
    console.log('调用recorder:start后, 结果:', result);
    
    if (result && result.success) {
      ElMessage.success('录制已开始')
    } else {
      throw new Error(result?.error || '启动录制失败')
    }
  } catch (error) {
    console.error('录制失败详情:', error);
    console.error('错误类型:', typeof error);
    console.error('错误字符串:', String(error));
    console.error('错误JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    isRecording.value = false
    ElMessage.error(`启动录制失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 停止录制
const stopRecording = async () => {
  try {
    console.log('尝试停止录制')
    const result = await window.electronAPI.invoke('recorder:stop')
    console.log('停止录制结果:', result)
    
    if (result && result.success) {
      if (result.data && result.data.actions) {
        capturedActions.value = result.data.actions
      }
      isRecording.value = false
      recordingCompleted.value = true
      ElMessage.success('录制已完成')
    } else {
      throw new Error(result.error || '停止录制失败')
    }
  } catch (error) {
    console.error('停止录制失败:', error)
    ElMessage.error(`停止录制失败: ${(error as Error).message || '未知错误'}`)
  }
}

// 取消录制
const handleCancel = async () => {
  // 如果正在录制，先停止录制
  if (isRecording.value) {
    try {
      console.log('取消时停止录制')
      await window.electronAPI.invoke('recorder:stop')
    } catch (error) {
      console.error('停止录制失败:', error)
    }
  }
  
  // 重置状态
  isRecording.value = false
  recordingCompleted.value = false
  capturedActions.value = []
  targetUrl.value = ''
  
  // 关闭对话框
  dialogVisible.value = false
  emit('update:visible', false)
}

// 生成流程
const generateFlow = () => {
  try {
    console.log('生成流程，操作数:', capturedActions.value.length)
    
    // 创建临时recorder实例来处理已捕获的操作
    const tempRecorder = new IntelligentRecorder(options)
    
    // 设置必要的信息
    tempRecorder.setBrowserInfo({
      url: targetUrl.value,
      title: document.title,
      userAgent: navigator.userAgent
    })
    
    // 添加所有操作
    capturedActions.value.forEach(action => {
      tempRecorder.addCapturedAction(action)
    })
    
    // 生成流程节点
    const nodes = tempRecorder.actionsToFlowNodes()
    console.log('生成的节点数:', nodes.length)
    
    // 直接发送生成的节点到父组件
    console.log('发送节点到设计器组件')
    emit('generate-flow', nodes)
    
    // 关闭对话框
    dialogVisible.value = false
    emit('update:visible', false)
    
    ElMessage.success('流程已生成')
  } catch (error) {
    console.error('生成流程失败:', error)
    ElMessage.error(`生成流程失败: ${(error as Error).message || '未知错误'}`)
  }
}
</script>

<style scoped>
.recorder-content {
  min-height: 300px;
}

.recording-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #f56c6c;
  animation: pulse 1.5s infinite;
}

.success-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #67c23a;
  position: relative;
}

.success-icon:after {
  content: "";
  position: absolute;
  width: 20px;
  height: 10px;
  border-left: 3px solid white;
  border-bottom: 3px solid white;
  transform: rotate(-45deg);
  top: 13px;
  left: 10px;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.action-item:hover {
  background-color: #f5f7fa;
}
</style> 