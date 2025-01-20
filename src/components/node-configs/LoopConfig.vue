<template>
  <div class="loop-config">
    <el-form-item label="循环类型">
      <el-select
        v-model="props.node.properties.loopType"
        @change="handleChange('loopType')"
      >
        <el-option label="固定次数" value="count" />
        <el-option label="元素列表" value="elements" />
        <el-option label="条件循环" value="condition" />
      </el-select>
    </el-form-item>

    <template v-if="props.node.properties.loopType === 'count'">
      <el-form-item label="循环次数">
        <el-input-number
          v-model="props.node.properties.count"
          :min="1"
          :max="1000"
          @change="handleChange('count')"
        />
      </el-form-item>
    </template>

    <template v-if="props.node.properties.loopType === 'elements'">
      <el-form-item label="选择器">
        <el-input
          v-model="props.node.properties.selector"
          @change="handleChange('selector')"
        />
      </el-form-item>
      <el-form-item label="变量名">
        <el-input
          v-model="props.node.properties.variableName"
          @change="handleChange('variableName')"
        />
      </el-form-item>
    </template>

    <template v-if="props.node.properties.loopType === 'condition'">
      <el-form-item label="条件类型">
        <el-select
          v-model="props.node.properties.condition"
          @change="handleChange('condition')"
        >
          <el-option label="元素存在" value="exists" />
          <el-option label="元素不存在" value="notExists" />
          <el-option label="元素可见" value="visible" />
          <el-option label="元素不可见" value="notVisible" />
        </el-select>
      </el-form-item>
      <el-form-item label="选择器">
        <el-input
          v-model="props.node.properties.selector"
          @change="handleChange('selector')"
        />
      </el-form-item>
      <el-form-item label="超时时间(秒)">
        <el-input-number
          v-model="props.node.properties.timeout"
          :min="0"
          :max="3600"
          @change="handleChange('timeout')"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      loopType?: 'count' | 'elements' | 'condition'
      count?: number
      selector?: string
      variableName?: string
      condition?: 'exists' | 'notExists' | 'visible' | 'notVisible'
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