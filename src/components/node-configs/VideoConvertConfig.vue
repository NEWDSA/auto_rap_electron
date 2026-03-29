<template>
  <div class="space-y-4" @click.stop>
    <el-form-item label="输入视频文件">
      <div class="flex space-x-2">
        <el-input v-model="node.properties.inputPath" placeholder="请选择输入文件" readonly />
        <el-button @click="selectInputFile">选择</el-button>
      </div>
    </el-form-item>

    <el-form-item label="输出格式">
      <el-select v-model="node.properties.outputFormat" @change="handleChange">
        <el-option label="MP4" value="mp4" />
        <el-option label="MKV" value="mkv" />
        <el-option label="MOV" value="mov" />
        <el-option label="AVI" value="avi" />
        <el-option label="MP3(提取音频)" value="mp3" />
        <el-option label="WAV(提取音频)" value="wav" />
      </el-select>
    </el-form-item>

    <el-form-item label="输出目录(选填)">
      <div class="flex space-x-2">
        <el-input
          v-model="node.properties.outputDir"
          placeholder="不填则输出到输入文件同目录"
          readonly
        />
        <el-button @click="selectOutputDir">选择</el-button>
      </div>
    </el-form-item>

    <el-form-item label="输出文件(选填)">
      <div class="flex space-x-2">
        <el-input v-model="node.properties.outputPath" placeholder="不填则自动命名" readonly />
        <el-button @click="selectOutputFile">选择</el-button>
      </div>
    </el-form-item>

    <el-form-item>
      <el-checkbox v-model="node.properties.overwrite" @change="handleChange"
        >覆盖同名文件</el-checkbox
      >
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import type { FlowNode } from '@/types/node-config'
  import { ElMessage } from 'element-plus'

  const props = defineProps<{
    node: FlowNode
  }>()

  const emit = defineEmits<{
    (e: 'update', key: string): void
  }>()

  const handleChange = () => {
    emit('update', 'properties')
  }

  const selectInputFile = async () => {
    if (!window.electronAPI) {
      ElMessage.warning('请在 Electron 环境中运行以使用此功能')
      return
    }

    const res = await window.electronAPI.invoke('dialog:openFile', {
      title: '选择要转换的视频文件',
      filters: [
        {
          name: '视频/音频',
          extensions: ['mp4', 'mkv', 'mov', 'avi', 'flv', 'webm', 'mp3', 'wav', 'm4a'],
        },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (!res?.canceled && Array.isArray(res.filePaths) && res.filePaths[0]) {
      props.node.properties.inputPath = res.filePaths[0]
      handleChange()
    }
  }

  const selectOutputDir = async () => {
    if (!window.electronAPI) {
      ElMessage.warning('请在 Electron 环境中运行以使用此功能')
      return
    }
    const path = await window.electronAPI.invoke('dialog:showOpenDirectoryDialog')
    if (path) {
      props.node.properties.outputDir = path
      handleChange()
    }
  }

  const selectOutputFile = async () => {
    if (!window.electronAPI) {
      ElMessage.warning('请在 Electron 环境中运行以使用此功能')
      return
    }

    const ext = props.node.properties.outputFormat || 'mp4'
    const filePath = await window.electronAPI.invoke('dialog:showSaveDialog', {
      title: '选择输出文件',
      defaultPath: `output.${ext}`,
      filters: [{ name: '输出文件', extensions: [String(ext)] }],
    })

    if (filePath) {
      props.node.properties.outputPath = filePath
      handleChange()
    }
  }

  onMounted(() => {
    if (!props.node.properties.outputFormat) props.node.properties.outputFormat = 'mp4'
    if (props.node.properties.overwrite === undefined) props.node.properties.overwrite = true
  })
</script>
