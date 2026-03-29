<template>
  <div class="video-download-config">
    <el-form label-position="top" size="small">
      <el-form-item label="视频/列表链接">
        <el-input
          v-model="config.url"
          placeholder="输入B站视频、UP主主页或收藏夹链接"
          type="textarea"
          :rows="2"
        >
          <template #prefix>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="保存路径">
        <div class="path-input-group">
          <el-input v-model="config.savePath" placeholder="D:/Downloads" />
          <el-button @click="selectSavePath">选择</el-button>
        </div>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="画质选择">
            <el-select v-model="config.quality" placeholder="选择画质">
              <el-option label="最高画质 (4K/1080P+)" value="best" />
              <el-option label="1080P" value="1080" />
              <el-option label="720P" value="720" />
              <el-option label="仅音频" value="audio" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="下载选项">
            <el-checkbox v-model="config.downloadDanmaku">下载弹幕</el-checkbox>
            <el-checkbox v-model="config.downloadSubtitle">下载字幕</el-checkbox>
            <el-checkbox v-model="config.downloadThumbnail">下载封面</el-checkbox>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Cookie (选填，会员/高清画质需要)">
        <el-input
          v-model="config.cookie"
          placeholder="SESSDATA=..."
          type="textarea"
          :rows="2"
          show-password
        />
        <div class="form-tip">不填则以游客身份下载，最高仅 480P/1080P</div>
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          :loading="isDownloading"
          style="width: 100%"
          @click="testDownload"
        >
          {{ isDownloading ? '下载中...' : '测试下载' }}
        </el-button>
        <div v-if="isDownloading" class="download-progress-container">
          <el-progress
            :percentage="downloadProgress"
            :status="downloadStatus === '下载完成' ? 'success' : ''"
          />
          <div class="status-text">{{ downloadStatus }}</div>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted, onUnmounted } from 'vue'
  import { Link } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  const props = defineProps<{
    node: any
  }>()

  const emit = defineEmits(['update'])

  const isDownloading = ref(false)
  const downloadProgress = ref(0)
  const downloadStatus = ref('')

  const config = ref({
    url: '',
    savePath: 'D:\\Downloads',
    quality: 'best',
    downloadDanmaku: true,
    downloadSubtitle: false,
    downloadThumbnail: true,
    cookie: '',
    ...props.node.properties,
  })

  // 监听配置变化并更新父组件
  watch(
    config,
    newVal => {
      // 同步属性到 props.node.properties
      Object.assign(props.node.properties, newVal)
      emit('update', 'properties')
    },
    { deep: true }
  )

  const handleProgress = (_event: any, data: any) => {
    downloadProgress.value = Math.floor(data.progress)
    downloadStatus.value = data.status
    // 同时更新配置，这样 LogicFlow 节点属性也会同步
    config.value.progress = data.progress
    config.value.status = data.status
  }

  onMounted(() => {
    if (window.electronAPI) {
      window.electronAPI.on('video:progress', handleProgress)
    }
  })

  onUnmounted(() => {
    if (window.electronAPI) {
      // 如果 electronAPI.on 返回了取消监听的方法，应该调用它。
      // 但根据 preload.ts 的实现，通常是通过 ipcRenderer.on，
      // 这里如果不能直接取消，至少保证组件卸载后不执行逻辑。
    }
  })

  const selectSavePath = async () => {
    if (!window.electronAPI) {
      ElMessage.warning('请在 Electron 环境中运行以使用此功能')
      return
    }
    try {
      const path = await window.electronAPI.invoke('dialog:showOpenDirectoryDialog')
      if (path) {
        config.value.savePath = path
      }
    } catch (error) {
      console.error('选择目录失败:', error)
      ElMessage.error('选择目录失败')
    }
  }

  const testDownload = async () => {
    if (!config.value.url) {
      ElMessage.warning('请输入视频链接')
      return
    }
    if (!config.value.savePath) {
      ElMessage.warning('请选择保存路径')
      return
    }

    if (!window.electronAPI) {
      ElMessage.warning('请在 Electron 环境中运行以使用此功能')
      return
    }

    isDownloading.value = true
    downloadProgress.value = 0
    downloadStatus.value = '准备下载...'

    try {
      const result = await window.electronAPI.invoke('video:download', {
        url: config.value.url,
        options: {
          savePath: config.value.savePath,
          quality: config.value.quality,
          downloadDanmaku: config.value.downloadDanmaku,
          downloadSubtitle: config.value.downloadSubtitle,
          downloadThumbnail: config.value.downloadThumbnail,
          cookie: config.value.cookie,
        },
      })

      if (result.success) {
        ElMessage.success('下载成功！')
        downloadProgress.value = 100
        downloadStatus.value = '下载完成'
      } else {
        console.error('下载失败详情:', result)
        ElMessage.error(`下载失败: ${result.message}\n${result.stack || ''}`)
        downloadStatus.value = '下载失败'
      }
    } catch (error: any) {
      console.error('IPC调用失败详情:', error)
      ElMessage.error(`调用失败: ${error.message}\n${error.stack || ''}`)
      downloadStatus.value = '调用失败'
    } finally {
      isDownloading.value = false
    }
  }
</script>

<style scoped>
  .video-download-config {
    padding: 10px;
  }
  .path-input-group {
    display: flex;
    gap: 8px;
  }
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
  .download-progress-container {
    margin-top: 15px;
    width: 100%;
  }
  .status-text {
    font-size: 12px;
    color: #606266;
    text-align: center;
    margin-top: 5px;
  }
</style>
