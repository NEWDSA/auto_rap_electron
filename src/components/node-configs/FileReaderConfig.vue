<template>
  <div class="file-reader-config">
    <el-form :model="config" label-width="120px" size="small">
      <!-- 文件路径 -->
      <el-form-item label="文件路径">
        <div class="flex gap-2">
          <el-input
            v-model="config.filePath"
            placeholder="请输入文件路径或点击选择文件"
            @input="handleChange('filePath')"
          />
          <el-button type="primary" size="small" @click="selectFile"> 选择文件 </el-button>
        </div>
        <div class="text-xs text-gray-500 mt-1">支持 PDF、TXT、DOC、DOCX 格式</div>
      </el-form-item>

      <!-- 文件类型 -->
      <el-form-item label="文件类型">
        <el-select
          v-model="config.fileType"
          placeholder="选择文件类型"
          @change="handleChange('fileType')"
        >
          <el-option label="自动检测" value="auto" />
          <el-option label="PDF" value="pdf" />
          <el-option label="TXT" value="txt" />
          <el-option label="DOC" value="doc" />
          <el-option label="DOCX" value="docx" />
        </el-select>
      </el-form-item>

      <!-- 编码格式 -->
      <el-form-item v-if="config.fileType === 'txt'" label="编码格式">
        <el-select
          v-model="config.fileEncoding"
          placeholder="选择编码格式"
          @change="handleChange('fileEncoding')"
        >
          <el-option label="自动检测" value="auto" />
          <el-option label="UTF-8" value="utf8" />
          <el-option label="GBK" value="gbk" />
          <el-option label="GB2312" value="gb2312" />
        </el-select>
      </el-form-item>

      <!-- 输出变量名 -->
      <el-form-item label="输出变量名">
        <el-input
          v-model="config.outputVariable"
          placeholder="例如：fileContent"
          @input="handleChange('outputVariable')"
        />
        <div class="text-xs text-gray-500 mt-1">读取的内容将存储到此变量中</div>
      </el-form-item>

      <!-- 高级选项 -->
      <el-form-item label="高级选项">
        <div class="space-y-2">
          <el-checkbox v-model="config.includeMetadata" @change="handleChange('includeMetadata')">
            包含文件元数据
          </el-checkbox>

          <el-checkbox
            v-if="config.fileType === 'pdf'"
            v-model="config.extractImages"
            @change="handleChange('extractImages')"
          >
            提取图片
          </el-checkbox>

          <el-checkbox
            v-if="config.fileType === 'pdf' || config.fileType === 'docx'"
            v-model="config.extractTables"
            @change="handleChange('extractTables')"
          >
            提取表格
          </el-checkbox>
        </div>
      </el-form-item>

      <!-- 预览按钮 -->
      <el-form-item>
        <el-button type="success" size="small" :disabled="!config.filePath" @click="previewFile">
          预览文件
        </el-button>
        <el-button type="primary" size="small" :disabled="!config.filePath" @click="testRead">
          测试读取
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ipcRenderer } from '@/utils/electron'
  import type { NodeConfigProps } from '@/types/node-config'

  const props = defineProps<NodeConfigProps>()

  // 默认配置
  const defaultConfig = {
    filePath: '',
    fileType: 'auto' as const,
    fileEncoding: 'auto' as const,
    outputVariable: 'fileContent',
    includeMetadata: false,
    extractImages: false,
    extractTables: false,
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

  const handleChange = (key: string) => {
    props.onUpdate?.(key)
  }

  // 选择文件
  const selectFile = async () => {
    try {
      const result = await ipcRenderer.invoke('dialog:openFile', {
        title: '选择要读取的文件',
        filters: [
          { name: '所有支持的文件', extensions: ['pdf', 'txt', 'doc', 'docx'] },
          { name: 'PDF文件', extensions: ['pdf'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: 'Word文档', extensions: ['doc', 'docx'] },
        ],
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]

        // 直接更新节点属性，而不是通过 computed
        props.node.properties.filePath = filePath
        handleChange('filePath')

        // 自动检测文件类型
        const extension = filePath.split('.').pop()?.toLowerCase()
        if (extension) {
          props.node.properties.fileType = extension as any
          handleChange('fileType')
        }
      }
    } catch (error) {
      console.error('选择文件失败:', error)
      ElMessage.error('选择文件失败')
    }
  }

  // 预览文件
  const previewFile = async () => {
    if (!config.value.filePath) {
      ElMessage.warning('请先选择文件')
      return
    }

    try {
      await ipcRenderer.invoke('file:preview', {
        filePath: config.value.filePath,
        fileType: config.value.fileType,
      })
    } catch (error) {
      console.error('预览文件失败:', error)
      ElMessage.error('预览文件失败')
    }
  }

  // 测试读取
  const testRead = async () => {
    if (!config.value.filePath) {
      ElMessage.warning('请先选择文件')
      return
    }

    try {
      const result = await ipcRenderer.invoke('file:read', {
        filePath: config.value.filePath,
        fileType: config.value.fileType,
        encoding: config.value.fileEncoding,
        includeMetadata: config.value.includeMetadata,
        extractImages: config.value.extractImages,
        extractTables: config.value.extractTables,
      })

      if (result.success) {
        ElMessageBox.alert(
          `文件读取成功！\n\n内容长度: ${result.data.content?.length || 0} 字符\n\n前100字符预览:\n${result.data.content?.substring(0, 100)}...`,
          '读取结果',
          {
            confirmButtonText: '确定',
            type: 'success',
          }
        )
      } else {
        ElMessage.error(`读取失败: ${result.error}`)
      }
    } catch (error) {
      console.error('测试读取失败:', error)
      ElMessage.error('测试读取失败')
    }
  }
</script>

<style scoped>
  .file-reader-config {
    padding: 16px;
  }

  .space-y-2 > * + * {
    margin-top: 8px;
  }
</style>
