<template>
  <div class="screenshot-config">
    <el-form-item label="截图类型">
      <el-select
        v-model="props.node.properties.screenshotType"
        @change="handleChange('screenshotType')"
      >
        <el-option label="全页面" value="fullPage" />
        <el-option label="可视区域" value="viewport" />
        <el-option label="指定元素" value="element" />
      </el-select>
    </el-form-item>

    <template v-if="props.node.properties.screenshotType === 'element'">
      <el-form-item label="选择器">
        <el-input
          v-model="props.node.properties.selector"
          @change="handleChange('selector')"
        />
      </el-form-item>
    </template>

    <el-form-item label="保存路径">
      <el-input
        v-model="props.node.properties.path"
        @change="handleChange('path')"
      >
        <template #append>.png</template>
      </el-input>
    </el-form-item>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.omitBackground"
        @change="handleChange('omitBackground')"
      >
        透明背景
      </el-checkbox>
    </el-form-item>

    <el-form-item label="图片质量">
      <el-slider
        v-model="props.node.properties.quality"
        :min="0"
        :max="100"
        :step="1"
        @change="handleChange('quality')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      screenshotType?: 'fullPage' | 'viewport' | 'element'
      selector?: string
      path?: string
      omitBackground?: boolean
      quality?: number
    }
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', key: string): void
}>()

const handleChange = (key: string) => {
  emit('update', key)
}
</script> 