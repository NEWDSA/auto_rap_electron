<template>
  <div class="input-config">
    <el-form-item label="选择器">
      <el-input
        v-model="props.node.properties.selector"
        @change="handleChange('selector')"
      />
    </el-form-item>

    <el-form-item label="输入值">
      <el-input
        v-model="props.node.properties.value"
        type="textarea"
        @change="handleChange('value')"
      />
    </el-form-item>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.clear"
        @change="handleChange('clear')"
      >
        清空原有内容
      </el-checkbox>
    </el-form-item>

    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.pressEnter"
        @change="handleChange('pressEnter')"
      >
        输入后按回车
      </el-checkbox>
    </el-form-item>

    <el-form-item label="延迟(毫秒)">
      <el-input-number
        v-model="props.node.properties.delay"
        :min="0"
        :max="1000"
        :step="50"
        @change="handleChange('delay')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      selector?: string
      value?: string
      clear?: boolean
      pressEnter?: boolean
      delay?: number
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