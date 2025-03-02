<template>
  <div class="extract-config">
    <el-form-item label="提取类型">
      <el-select
        v-model="props.node.properties.extractType"
        @change="handleChange('extractType')"
      >
        <el-option label="提取文本" value="text" />
        <el-option label="提取属性" value="attribute" />
        <el-option label="提取HTML" value="html" />
        <el-option label="提取表格" value="table" />
        <el-option label="提取列表" value="list" />
      </el-select>
    </el-form-item>

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

    <el-form-item label="元素选择器">
      <el-input
        v-model="props.node.properties.selector"
        placeholder="请选择要提取的元素"
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

    <!-- 属性提取的特殊配置 -->
    <template v-if="props.node.properties.extractType === 'attribute'">
      <el-form-item label="属性名称">
        <el-select
          v-model="props.node.properties.attributeName"
          @change="handleChange('attributeName')"
        >
          <el-option label="href (链接)" value="href" />
          <el-option label="src (资源)" value="src" />
          <el-option label="value (值)" value="value" />
          <el-option label="title (标题)" value="title" />
          <el-option label="alt (替代文本)" value="alt" />
          <el-option label="data-* (数据属性)" value="data" />
          <el-option label="自定义..." value="custom" />
        </el-select>
      </el-form-item>
      
      <el-form-item v-if="props.node.properties.attributeName === 'data'" label="数据属性名">
        <el-input
          v-model="props.node.properties.customDataAttribute"
          placeholder="请输入data-*属性名"
          @change="handleChange('customDataAttribute')"
        />
      </el-form-item>

      <el-form-item v-if="props.node.properties.attributeName === 'custom'" label="自定义属性名">
        <el-input
          v-model="props.node.properties.customAttributeName"
          placeholder="请输入属性名"
          @change="handleChange('customAttributeName')"
        />
      </el-form-item>
    </template>

    <!-- 表格提取的特殊配置 -->
    <template v-if="props.node.properties.extractType === 'table'">
      <el-form-item label="表头选择器">
        <el-input
          v-model="props.node.properties.headerSelector"
          placeholder="表头单元格的选择器"
          @change="handleChange('headerSelector')"
        >
          <template #append>
            <el-button @click="openBrowserForSelect('headerSelector')">选择表头</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="数据行选择器">
        <el-input
          v-model="props.node.properties.rowSelector"
          placeholder="数据行的选择器"
          @change="handleChange('rowSelector')"
        >
          <template #append>
            <el-button @click="openBrowserForSelect('rowSelector')">选择行</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="单元格选择器">
        <el-input
          v-model="props.node.properties.cellSelector"
          placeholder="单元格的选择器（可选）"
          @change="handleChange('cellSelector')"
        >
          <template #append>
            <el-button @click="openBrowserForSelect('cellSelector')">选择单元格</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item>
        <el-checkbox
          v-model="props.node.properties.hasHeader"
          @change="handleChange('hasHeader')"
        >
          包含表头
        </el-checkbox>
      </el-form-item>
    </template>

    <!-- 列表提取的特殊配置 -->
    <template v-if="props.node.properties.extractType === 'list'">
      <el-form-item>
        <el-checkbox
          v-model="props.node.properties.extractInnerHTML"
          @change="handleChange('extractInnerHTML')"
        >
          提取HTML内容（否则提取文本）
        </el-checkbox>
      </el-form-item>
    </template>

    <el-form-item label="变量名称">
      <el-input
        v-model="props.node.properties.variableName"
        placeholder="存储提取结果的变量名"
        @change="handleChange('variableName')"
      >
        <template #prepend>
          <el-tooltip content="变量名用于在后续节点中引用提取的数据">
            <el-icon><InfoFilled /></el-icon>
          </el-tooltip>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.trimContent"
        @change="handleChange('trimContent')"
      >
        去除首尾空白字符
      </el-checkbox>
    </el-form-item>

    <!-- 数据过滤配置 -->
    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.enableFilter"
        @change="handleChange('enableFilter')"
      >
        启用数据过滤
      </el-checkbox>
    </el-form-item>

    <template v-if="props.node.properties.enableFilter">
      <el-form-item label="过滤类型">
        <el-select
          v-model="props.node.properties.filterType"
          @change="handleChange('filterType')"
        >
          <el-option label="正则表达式" value="regex" />
          <el-option label="包含文本" value="contains" />
          <el-option label="不包含文本" value="notContains" />
          <el-option label="等于" value="equals" />
          <el-option label="不等于" value="notEquals" />
          <el-option label="大于" value="greaterThan" />
          <el-option label="小于" value="lessThan" />
        </el-select>
      </el-form-item>

      <el-form-item label="过滤条件">
        <el-input
          v-model="props.node.properties.filterValue"
          :placeholder="getFilterPlaceholder(props.node.properties.filterType)"
          @change="handleChange('filterValue')"
        />
      </el-form-item>

      <el-form-item v-if="props.node.properties.filterType === 'regex'">
        <el-checkbox
          v-model="props.node.properties.filterCaseInsensitive"
          @change="handleChange('filterCaseInsensitive')"
        >
          忽略大小写
        </el-checkbox>
      </el-form-item>

      <el-form-item v-if="['greaterThan', 'lessThan'].includes(props.node.properties.filterType || '')">
        <el-checkbox
          v-model="props.node.properties.filterNumeric"
          @change="handleChange('filterNumeric')"
        >
          数值比较
        </el-checkbox>
      </el-form-item>
    </template>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.waitForVisible"
        @change="handleChange('waitForVisible')"
      >
        等待元素可见
      </el-checkbox>
    </el-form-item>

    <el-form-item label="超时时间(秒)">
      <el-input-number
        v-model="props.node.properties.timeout"
        :min="1"
        :max="300"
        @change="handleChange('timeout')"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handlePreview">
        预览提取结果
      </el-button>
    </el-form-item>

    <!-- 预览结果对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="提取结果预览"
      width="60%"
    >
      <pre class="preview-content">{{ previewContent }}</pre>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleCopyPreview">
          复制内容
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FlowNode } from '@/types/node-config'
import { ipcRenderer } from '@/utils/electron'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

interface Props {
  node: {
    properties: {
      extractType?: 'text' | 'attribute' | 'html' | 'table' | 'list'
      selectorType?: 'css' | 'xpath' | 'id' | 'class' | 'name'
      selector?: string
      attributeName?: string
      customAttributeName?: string
      customDataAttribute?: string
      headerSelector?: string
      rowSelector?: string
      cellSelector?: string
      hasHeader?: boolean
      extractInnerHTML?: boolean
      variableName?: string
      trimContent?: boolean
      enableFilter?: boolean
      filterType?: 'regex' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan'
      filterValue?: string
      filterCaseInsensitive?: boolean
      filterNumeric?: boolean
      waitForVisible?: boolean
      timeout?: number
    }
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const isSelecting = ref(false)
const previewDialogVisible = ref(false)
const previewContent = ref('')

const handleChange = (key: string) => {
  emit('update', key)
}

const openBrowserForSelect = async (selectorType?: string) => {
  try {
    isSelecting.value = true
    ElMessage.info('请在浏览器中选择要提取的元素')
    
    const result = await ipcRenderer.invoke('element:startPicker')
    if (result) {
      if (selectorType) {
        // 更新特定的选择器
        switch (selectorType) {
          case 'headerSelector':
            props.node.properties.headerSelector = result.selector
            handleChange('headerSelector')
            break
          case 'rowSelector':
            props.node.properties.rowSelector = result.selector
            handleChange('rowSelector')
            break
          case 'cellSelector':
            props.node.properties.cellSelector = result.selector
            handleChange('cellSelector')
            break
          default:
            props.node.properties.selector = result.selector
            props.node.properties.selectorType = result.selectorType
            handleChange('selector')
        }
      } else {
        // 默认更新主选择器
        props.node.properties.selector = result.selector
        props.node.properties.selectorType = result.selectorType
        handleChange('selector')
      }
      ElMessage.success('元素选择成功')
    }
  } catch (error) {
    console.error('选择元素失败:', error)
    ElMessage.error(error.message || '选择元素失败')
  } finally {
    isSelecting.value = false
  }
}

const handlePreview = async () => {
  try {
    // 创建一个新的对象，只包含必要的属性
    const extractProperties = {
      selector: props.node.properties.selector,
      selectorType: props.node.properties.selectorType,
      extractType: props.node.properties.extractType,
      attributeName: props.node.properties.attributeName,
      headerSelector: props.node.properties.headerSelector,
      rowSelector: props.node.properties.rowSelector,
      cellSelector: props.node.properties.cellSelector,
      hasHeader: props.node.properties.hasHeader,
      extractInnerHTML: props.node.properties.extractInnerHTML,
      trimContent: props.node.properties.trimContent,
      enableFilter: props.node.properties.enableFilter,
      filterType: props.node.properties.filterType,
      filterValue: props.node.properties.filterValue,
      filterCaseInsensitive: props.node.properties.filterCaseInsensitive,
      filterNumeric: props.node.properties.filterNumeric
    }

    const result = await ipcRenderer.invoke('extract:preview', extractProperties)
    
    if (result === null || result === undefined) {
      previewContent.value = '未提取到内容'
    } else {
      previewContent.value = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    }
    
    previewDialogVisible.value = true
  } catch (error: any) {
    console.error('预览失败:', error)
    ElMessage.error(error.message || '预览失败，请检查选择器是否正确')
  }
}

const handleCopyPreview = async () => {
  try {
    await navigator.clipboard.writeText(previewContent.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const getFilterPlaceholder = (filterType?: string) => {
  switch (filterType) {
    case 'regex':
      return '请输入正则表达式'
    case 'contains':
    case 'notContains':
      return '请输入要匹配的文本'
    case 'equals':
    case 'notEquals':
      return '请输入要比较的值'
    case 'greaterThan':
    case 'lessThan':
      return '请输入比较值'
    default:
      return '请输入过滤条件'
  }
}

// 初始化默认值
if (!props.node.properties.timeout) {
  props.node.properties.timeout = 30
}
if (props.node.properties.waitForVisible === undefined) {
  props.node.properties.waitForVisible = true
}
</script>

<style scoped>
.preview-content {
  max-height: 400px;
  overflow: auto;
  padding: 1rem;
  background: #f5f7fa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style> 