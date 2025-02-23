<template>
  <div class="mouse-config">
    <el-form-item label="操作类型">
      <el-select
        v-model="props.node.properties.actionType"
        @change="handleChange('actionType')"
      >
        <el-option label="移动到元素" value="moveToElement" />
        <el-option label="移动到坐标" value="moveToPosition" />
      </el-select>
    </el-form-item>

    <template v-if="['moveToElement'].includes(props.node.properties.actionType || '')">
      <el-form-item label="选择器">
        <el-input
          v-model="props.node.properties.selector"
          @change="handleChange('selector')"
        />
      </el-form-item>
    </template>

    <template v-if="['moveToPosition'].includes(props.node.properties.actionType || '')">
      <el-form-item label="X坐标">
        <el-input-number
          v-model="props.node.properties.x"
          @change="handleChange('x')"
        />
      </el-form-item>
      <el-form-item label="Y坐标">
        <el-input-number
          v-model="props.node.properties.y"
          @change="handleChange('y')"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      actionType?: 'moveToElement' | 'moveToPosition'
      selector?: string
      x?: number
      y?: number
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