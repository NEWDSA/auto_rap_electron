<template>
  <div class="keyboard-config">
    <el-form-item label="按键">
      <el-input
        v-model="props.node.properties.key"
        @change="handleChange('key')"
      />
    </el-form-item>

    <el-form-item label="修饰键">
      <el-checkbox-group
        v-model="props.node.properties.modifiers"
        @change="handleChange('modifiers')"
      >
        <el-checkbox label="Control" />
        <el-checkbox label="Alt" />
        <el-checkbox label="Shift" />
        <el-checkbox label="Meta" />
      </el-checkbox-group>
    </el-form-item>

    <el-form-item label="文本">
      <el-input
        v-model="props.node.properties.text"
        type="textarea"
        @change="handleChange('text')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      key?: string
      modifiers?: string[]
      text?: string
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