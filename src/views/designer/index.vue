<template>
  <div class="h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <el-input
            v-model="flowName"
            placeholder="流程名称"
            class="!w-64"
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
          </el-input>
          
          <el-button-group>
            <el-button :type="isRecording ? 'danger' : 'primary'" @click="toggleRecording">
              <el-icon><VideoCamera /></el-icon>
              {{ isRecording ? '停止录制' : '开始录制' }}
            </el-button>
            <el-button type="primary" @click="runFlow">
              <el-icon><VideoPlay /></el-icon>
              运行
            </el-button>
            <el-button @click="saveFlow">
              <el-icon><Download /></el-icon>
              保存
            </el-button>
          </el-button-group>
        </div>

        <div class="flex items-center space-x-4">
          <el-button-group>
            <el-button @click="undo" :disabled="!canUndo">
              <el-icon><Back /></el-icon>
            </el-button>
            <el-button @click="redo" :disabled="!canRedo">
              <el-icon><Right /></el-icon>
            </el-button>
          </el-button-group>

          <el-dropdown>
            <el-button>
              <el-icon class="mr-1"><More /></el-icon>
              更多
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="exportFlow">导出流程</el-dropdown-item>
                <el-dropdown-item @click="importFlow">导入流程</el-dropdown-item>
                <el-dropdown-item divided @click="clearFlow">清空流程</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="flex-1 flex">
      <!-- 左侧工具箱 -->
      <div class="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4">
        <h3 class="text-lg font-medium mb-4">工具箱</h3>
        <el-collapse v-model="activeTools">
          <el-collapse-item title="基础操作" name="basic">
            <div class="space-y-2">
              <div v-for="tool in basicTools" :key="tool.type" class="tool-item">
                <el-button class="w-full justify-start">
                  <el-icon class="mr-2"><component :is="tool.icon" /></el-icon>
                  {{ tool.name }}
                </el-button>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="表单操作" name="form">
            <div class="space-y-2">
              <div v-for="tool in formTools" :key="tool.type" class="tool-item">
                <el-button class="w-full justify-start">
                  <el-icon class="mr-2"><component :is="tool.icon" /></el-icon>
                  {{ tool.name }}
                </el-button>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 中间画布区 -->
      <div class="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <div class="h-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <!-- 流程图画布 -->
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 p-4">
        <h3 class="text-lg font-medium mb-4">属性设置</h3>
        <el-empty v-if="!selectedNode" description="请选择节点" />
        <div v-else>
          <!-- 节点属性表单 -->
          <el-form label-position="top">
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.name" />
            </el-form-item>
            <!-- 其他属性根据节点类型动态显示 -->
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 流程名称
const flowName = ref('')

// 录制状态
const isRecording = ref(false)
const toggleRecording = () => {
  isRecording.value = !isRecording.value
}

// 撤销重做状态
const canUndo = ref(false)
const canRedo = ref(false)

// 工具箱展开项
const activeTools = ref(['basic'])

// 基础工具
const basicTools = [
  { type: 'click', name: '点击', icon: 'Pointer' },
  { type: 'input', name: '输入', icon: 'EditPen' },
  { type: 'scroll', name: '滚动', icon: 'Mouse' },
  { type: 'wait', name: '等待', icon: 'Timer' },
]

// 表单工具
const formTools = [
  { type: 'select', name: '下拉选择', icon: 'Select' },
  { type: 'checkbox', name: '复选框', icon: 'Check' },
  { type: 'radio', name: '单选框', icon: 'Choice' },
  { type: 'upload', name: '文件上传', icon: 'Upload' },
]

// 选中的节点
const selectedNode = ref<any>(null)

// 流程操作
const runFlow = () => {
  // TODO: 实现流程运行
}

const saveFlow = () => {
  // TODO: 实现流程保存
}

const exportFlow = () => {
  // TODO: 实现流程导出
}

const importFlow = () => {
  // TODO: 实现流程导入
}

const clearFlow = () => {
  // TODO: 实现流程清空
}

const undo = () => {
  // TODO: 实现撤销
}

const redo = () => {
  // TODO: 实现重做
}
</script>

<style scoped>
.tool-item {
  @apply transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded;
}

:deep(.el-button) {
  @apply h-9;
}
</style> 