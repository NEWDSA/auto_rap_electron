<template>
  <div class="wait-config">
    <el-form-item label="等待类型">
      <el-select
        v-model="props.node.properties.waitType"
        @change="handleChange('waitType')"
      >
        <el-option label="固定时间" value="timeout" />
        <el-option label="元素可见" value="visible" />
        <el-option label="元素消失" value="hidden" />
        <el-option label="元素存在" value="exists" />
        <el-option label="元素可点击" value="clickable" />
      </el-select>
    </el-form-item>

    <template v-if="props.node.properties.waitType === 'timeout'">
      <el-form-item label="等待时间(秒)">
        <el-input-number
          v-model="props.node.properties.timeout"
          :min="0"
          :max="3600"
          @change="handleChange('timeout')"
        />
      </el-form-item>
    </template>

    <template v-else>
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
      <el-form-item>
        <el-checkbox
          v-model="props.node.properties.reverse"
          @change="handleChange('reverse')"
        >
          反向等待
        </el-checkbox>
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      waitType?: 'timeout' | 'visible' | 'hidden' | 'exists' | 'clickable'
      timeout?: number
      selector?: string
      reverse?: boolean
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