<template>
  <div class="export-config">
    <el-form-item label="导出类型">
      <el-select
        v-model="props.node.properties.exportType"
        @change="handleExportTypeChange"
      >
        <el-option label="Excel" value="excel" />
        <el-option label="CSV" value="csv" />
        <el-option label="JSON" value="json" />
        <el-option label="Word" value="docx" />
        <el-option label="PDF" value="pdf" />
        <el-option label="图片" value="image" />
        <el-option label="文本" value="txt" />
      </el-select>
    </el-form-item>

    <el-form-item label="文件名">
      <el-input
        v-model="props.node.properties.fileName"
        placeholder="请输入导出文件名（不含扩展名）"
        @change="handleChange('fileName')"
      />
    </el-form-item>

    <el-form-item label="数据来源">
      <el-select
        v-model="props.node.properties.dataSource"
        @change="handleChange('dataSource')"
      >
        <el-option label="变量" value="variable" />
        <el-option label="提取结果" value="extract" />
      </el-select>
    </el-form-item>

    <el-form-item v-if="props.node.properties.dataSource === 'variable'" label="变量名">
      <el-input
        v-model="props.node.properties.variableName"
        placeholder="请输入变量名"
        @change="handleChange('variableName')"
      />
    </el-form-item>

    <!-- Excel特有配置 -->
    <template v-if="props.node.properties.exportType === 'excel'">
      <el-form-item label="工作表名">
        <el-input
          v-model="props.node.properties.sheetName"
          placeholder="请输入工作表名"
          @change="handleChange('sheetName')"
        />
      </el-form-item>
    </template>

    <!-- CSV特有配置 -->
    <template v-if="props.node.properties.exportType === 'csv'">
      <el-form-item label="分隔符">
        <el-input
          v-model="props.node.properties.delimiter"
          placeholder="请输入分隔符"
          @change="handleChange('delimiter')"
        >
          <template #prepend>
            <el-select v-model="props.node.properties.delimiter" style="width: 100px">
              <el-option label="逗号 ," value="," />
              <el-option label="分号 ;" value=";" />
              <el-option label="制表符 \t" value="\t" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
    </template>

    <!-- Word、PDF特有配置 -->
    <template v-if="checkExportType('docx', 'pdf')">
      <el-form-item label="文档标题">
        <el-input
          v-model="props.node.properties.title"
          placeholder="请输入文档标题"
          @change="handleChange('title')"
        />
      </el-form-item>
      
      <!-- PDF特有配置 -->
      <template v-if="checkExportType('pdf')">
        <el-form-item label="页面大小">
          <el-select
            v-model="props.node.properties.pageSize"
            @change="handleChange('pageSize')"
          >
            <el-option label="A4" value="A4" />
            <el-option label="A3" value="A3" />
            <el-option label="Letter" value="Letter" />
          </el-select>
        </el-form-item>
      </template>
    </template>

    <!-- 图片特有配置 -->
    <template v-if="checkExportType('image')">
      <el-form-item label="图片格式">
        <el-select
          v-model="props.node.properties.imageFormat"
          @change="handleChange('imageFormat')"
        >
          <el-option label="PNG" value="png" />
          <el-option label="JPEG" value="jpeg" />
        </el-select>
      </el-form-item>
      <el-form-item label="文档标题">
        <el-input
          v-model="props.node.properties.title"
          placeholder="请输入表格标题"
          @change="handleChange('title')"
        />
      </el-form-item>
    </template>

    <!-- 文本特有配置 -->
    <template v-if="checkExportType('txt')">
      <el-form-item label="文档标题">
        <el-input
          v-model="props.node.properties.title"
          placeholder="请输入文档标题"
          @change="handleChange('title')"
        />
      </el-form-item>
    </template>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.includeHeaders"
        @change="handleChange('includeHeaders')"
      >
        包含表头
      </el-checkbox>
    </el-form-item>

    <el-form-item label="编码">
      <el-select
        v-model="props.node.properties.encoding"
        @change="handleChange('encoding')"
      >
        <el-option label="UTF-8" value="utf-8" />
        <el-option label="GBK" value="gbk" />
        <el-option label="GB2312" value="gb2312" />
      </el-select>
    </el-form-item>

    <el-form-item label="保存方式">
      <el-radio-group 
        v-model="props.node.properties.saveMode" 
        @change="handleSaveModeChange"
      >
        <el-radio label="auto">自动保存到指定目录</el-radio>
        <el-radio label="select">手动选择保存位置</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 添加文件夹选择器，仅在自动保存模式下显示 -->
    <el-form-item v-if="props.node.properties.saveMode === 'auto'" label="保存目录">
      <directory-selector 
        v-model="props.node.properties.savePath"
        @update:modelValue="handleChange('savePath')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FlowNode } from '@/types/node-config'
import DirectorySelector from '../DirectorySelector.vue'

interface Props {
  node: FlowNode
}

const props = defineProps<Props>()
const emit = defineEmits(['update'])

// 确保类型正确
type ExportType = 'excel' | 'csv' | 'json' | 'docx' | 'pdf' | 'image' | 'txt'

// 初始化默认值
if (!props.node.properties.exportType) {
  props.node.properties.exportType = 'excel' as ExportType
  props.node.properties.fileName = 'export'
  props.node.properties.dataSource = 'variable'
  props.node.properties.includeHeaders = true
  props.node.properties.encoding = 'utf-8'
  props.node.properties.sheetName = 'Sheet1'
  props.node.properties.delimiter = ','
  props.node.properties.saveMode = 'auto'
  props.node.properties.savePath = ''
  props.node.properties.title = '导出数据'
  props.node.properties.pageSize = 'A4'
  props.node.properties.imageFormat = 'png'
}

// 类型检查辅助函数
function checkExportType(...types: ExportType[]) {
  return types.includes(props.node.properties.exportType as ExportType)
}

// 处理导出类型变化
const handleExportTypeChange = () => {
  handleChange('exportType')
  
  // 根据导出类型设置默认值
  if (!props.node.properties.title) {
    props.node.properties.title = '导出数据'
    handleChange('title')
  }
  
  if (!props.node.properties.pageSize) {
    props.node.properties.pageSize = 'A4'
    handleChange('pageSize')
  }
  
  if (!props.node.properties.imageFormat) {
    props.node.properties.imageFormat = 'png'
    handleChange('imageFormat')
  }
}

const handleChange = (prop: string) => {
  emit('update', { [prop]: props.node.properties[prop] })
}

const handleSaveModeChange = () => {
  handleChange('saveMode')
  // 如果切换到手动选择模式，清空预设的保存路径
  if (props.node.properties.saveMode === 'select') {
    props.node.properties.savePath = ''
    handleChange('savePath')
  }
}
</script>

<style scoped>
.export-config {
  padding: 10px;
}
</style> 