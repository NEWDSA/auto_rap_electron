<template>
  <div class="condition-config">
    <el-form-item label="选择器">
      <el-input
        v-model="props.node.properties.selector"
        @change="handleChange('selector')"
      />
    </el-form-item>

    <el-form-item label="条件类型">
      <el-select
        v-model="props.node.properties.condition"
        @change="handleChange('condition')"
      >
        <el-option label="元素存在" value="exists" />
        <el-option label="元素不存在" value="notExists" />
        <el-option label="元素可见" value="visible" />
        <el-option label="元素不可见" value="notVisible" />
        <el-option label="元素可点击" value="clickable" />
        <el-option label="元素不可点击" value="notClickable" />
        <el-option label="文本包含" value="textContains" />
        <el-option label="文本不包含" value="textNotContains" />
        <el-option label="文本等于" value="textEquals" />
        <el-option label="文本不等于" value="textNotEquals" />
      </el-select>
    </el-form-item>

    <template v-if="['textContains', 'textNotContains', 'textEquals', 'textNotEquals'].includes(props.node.properties.condition || '')">
      <el-form-item label="文本值">
        <el-input
          v-model="props.node.properties.value"
          @change="handleChange('value')"
        />
      </el-form-item>
    </template>

    <el-form-item label="超时时间(秒)">
      <el-input-number
        v-model="props.node.properties.timeout"
        :min="0"
        :max="60"
        @change="handleChange('timeout')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      selector?: string
      condition?: 'exists' | 'notExists' | 'visible' | 'notVisible' | 'clickable' | 'notClickable' | 'textContains' | 'textNotContains' | 'textEquals' | 'textNotEquals'
      value?: string
      timeout?: number
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