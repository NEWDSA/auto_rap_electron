<template>
  <div class="click-config">
    <el-form-item label="选择器">
      <el-input
        v-model="props.node.properties.selector"
        @change="handleChange('selector')"
      />
    </el-form-item>

    <el-form-item label="点击类型">
      <el-select
        v-model="props.node.properties.clickType"
        @change="handleChange('clickType')"
      >
        <el-option label="单击" value="click" />
        <el-option label="双击" value="dblclick" />
        <el-option label="右键" value="rightClick" />
      </el-select>
    </el-form-item>

    <el-form-item label="点击位置">
      <el-select
        v-model="props.node.properties.position"
        @change="handleChange('position')"
      >
        <el-option label="中心" value="center" />
        <el-option label="左上" value="topLeft" />
        <el-option label="右上" value="topRight" />
        <el-option label="左下" value="bottomLeft" />
        <el-option label="右下" value="bottomRight" />
      </el-select>
    </el-form-item>

    <el-form-item label="延迟(毫秒)">
      <el-input-number
        v-model="props.node.properties.delay"
        :min="0"
        :max="10000"
        :step="100"
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
      clickType?: 'click' | 'dblclick' | 'rightClick'
      position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
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