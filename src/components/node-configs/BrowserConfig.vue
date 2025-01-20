<template>
  <div class="browser-config">
    <el-form-item label="操作类型">
      <el-select
        v-model="props.node.properties.actionType"
        @change="handleChange('actionType')"
      >
        <el-option label="打开网页" value="goto" />
        <el-option label="后退" value="back" />
        <el-option label="前进" value="forward" />
        <el-option label="刷新" value="reload" />
      </el-select>
    </el-form-item>

    <template v-if="props.node.properties.actionType === 'goto'">
      <el-form-item label="URL">
        <el-input
          v-model="props.node.properties.url"
          @change="handleChange('url')"
        />
      </el-form-item>
      <el-form-item label="等待时间(秒)">
        <el-input-number
          v-model="props.node.properties.wait"
          :min="0"
          :max="60"
          @change="handleChange('wait')"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  node: {
    properties: {
      actionType?: 'goto' | 'back' | 'forward' | 'reload'
      url?: string
      wait?: number
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