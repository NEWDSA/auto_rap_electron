<template>
  <div class="extract-config">
    <el-form-item label="选择器">
      <el-input
        v-model="props.node.properties.selector"
        @change="handleChange('selector')"
      />
    </el-form-item>
    <el-form-item label="提取类型">
      <el-select
        v-model="props.node.properties.extractType"
        @change="handleChange('extractType')"
      >
        <el-option label="文本" value="text" />
        <el-option label="属性" value="attribute" />
        <el-option label="HTML" value="html" />
      </el-select>
    </el-form-item>
    <el-form-item v-if="props.node.properties.extractType === 'attribute'" label="属性名">
      <el-input
        v-model="props.node.properties.attributeName"
        @change="handleChange('attributeName')"
      />
    </el-form-item>
    <el-form-item label="变量名">
      <el-input
        v-model="props.node.properties.variableName"
        @change="handleChange('variableName')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      selector?: string
      extractType?: 'text' | 'attribute' | 'html'
      attributeName?: string
      variableName?: string
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