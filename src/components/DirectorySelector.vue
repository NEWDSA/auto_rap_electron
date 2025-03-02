<template>
  <div class="directory-selector">
    <el-input
      v-model="directoryPath"
      placeholder="请选择保存文件夹"
      :disabled="disabled"
      class="directory-input"
    >
      <template #append>
        <el-button @click="selectDirectory" :disabled="disabled">
          选择文件夹
        </el-button>
      </template>
    </el-input>
  </div>
</template>

<script>
import { ref, defineComponent, watch } from 'vue'
import { ExportUtils } from '../utils/exportUtils'

export default defineComponent({
  name: 'DirectorySelector',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const directoryPath = ref(props.modelValue || '')

    // 监听外部值变化
    watch(() => props.modelValue, (newValue) => {
      directoryPath.value = newValue || ''
    })

    // 监听内部值变化
    watch(directoryPath, (newValue) => {
      emit('update:modelValue', newValue)
    })

    // 选择文件夹
    const selectDirectory = async () => {
      try {
        const selectedDir = await ExportUtils.selectSaveDirectory()
        if (selectedDir) {
          directoryPath.value = selectedDir
        }
      } catch (error) {
        console.error('选择文件夹失败:', error)
      }
    }

    return {
      directoryPath,
      selectDirectory
    }
  }
})
</script>

<style scoped>
.directory-selector {
  width: 100%;
}
.directory-input {
  width: 100%;
}
</style> 