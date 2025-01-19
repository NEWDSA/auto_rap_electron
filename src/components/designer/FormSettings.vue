<template>
  <div class="space-y-4">
    <!-- 表单类型 -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">表单类型</label>
      <el-select v-model="config.formType" class="w-full">
        <el-option label="Excel表格" value="excel" />
        <el-option label="Web表单" value="web" />
        <el-option label="自定义表单" value="custom" />
      </el-select>
    </div>
    
    <!-- Excel表格设置 -->
    <template v-if="config.formType === 'excel'">
      <!-- 数据源文件 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">数据源文件</label>
        <div class="flex items-center space-x-2">
          <el-input 
            v-model="config.dataFile"
            placeholder="选择Excel文件"
            readonly
            class="flex-1"
          />
          <el-button @click="selectDataFile">
            浏览
          </el-button>
        </div>
      </div>
      
      <!-- 工作表 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">工作表</label>
        <el-select v-model="config.sheet" class="w-full">
          <el-option 
            v-for="sheet in sheets" 
            :key="sheet"
            :label="sheet"
            :value="sheet"
          />
        </el-select>
      </div>
      
      <!-- 数据范围 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">数据范围</label>
        <div class="flex items-center space-x-2">
          <el-input 
            v-model="config.range"
            placeholder="例如：A1:D10"
            class="flex-1"
          />
        </div>
      </div>
    </template>
    
    <!-- Web表单设置 -->
    <template v-if="config.formType === 'web'">
      <!-- 表单字段映射 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">表单字段映射</label>
        <div class="space-y-2">
          <div v-for="(field, index) in config.fields" :key="index" class="flex items-center space-x-2">
            <el-input 
              v-model="field.name"
              placeholder="字段名称"
              class="w-1/3"
            />
            <el-input 
              v-model="field.selector"
              placeholder="元素选择器"
              class="w-1/3"
            />
            <el-button @click="selectField(index)">
              <el-icon><Aim /></el-icon>
            </el-button>
            <el-button @click="removeField(index)" type="danger">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <el-button @click="addField" class="mt-2">
          添加字段
        </el-button>
      </div>
    </template>
    
    <!-- 自定义表单设置 -->
    <template v-if="config.formType === 'custom'">
      <!-- 自定义脚本 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义脚本</label>
        <el-input 
          v-model="config.script"
          type="textarea"
          :rows="10"
          placeholder="请输入自定义表单处理脚本"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400">
          支持JavaScript脚本，可以使用内置API进行表单操作
        </p>
      </div>
    </template>
    
    <!-- 提交按钮 -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">提交按钮</label>
      <div class="flex items-center space-x-2">
        <el-input 
          v-model="config.submitButton"
          placeholder="点击选择提交按钮"
          readonly
          class="flex-1"
        />
        <el-button @click="selectSubmitButton">
          <el-icon><Aim /></el-icon>
        </el-button>
      </div>
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
      formType: 'excel',
      dataFile: '',
      sheet: '',
      range: '',
      fields: [],
      script: '',
      submitButton: '',
      delay: 500
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 代理配置对象
const config = ref({...props.modelValue})

// Excel工作表列表
const sheets = ref([])

// 监听配置变化
watch(config, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

// 选择数据源文件
const selectDataFile = async () => {
  try {
    const result = await window.electronAPI.openFile({
      filters: [
        { name: 'Excel文件', extensions: ['xlsx', 'xls'] }
      ]
    })
    if (result) {
      config.value.dataFile = result
      // TODO: 读取Excel工作表列表
      sheets.value = await window.electronAPI.getExcelSheets(result)
    }
  } catch (error) {
    console.error('选择文件失败:', error)
  }
}

// 添加表单字段
const addField = () => {
  config.value.fields.push({
    name: '',
    selector: ''
  })
}

// 移除表单字段
const removeField = (index) => {
  config.value.fields.splice(index, 1)
}

// 选择表单字段
const selectField = async (index) => {
  try {
    const result = await window.electronAPI.startElementPicker()
    if (result) {
      config.value.fields[index].selector = result
    }
  } catch (error) {
    console.error('选择元素失败:', error)
  }
}

// 选择提交按钮
const selectSubmitButton = async () => {
  try {
    const result = await window.electronAPI.startElementPicker()
    if (result) {
      config.value.submitButton = result
    }
  } catch (error) {
    console.error('选择元素失败:', error)
  }
}
</script> 