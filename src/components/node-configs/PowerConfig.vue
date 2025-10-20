<template>
  <div>
    <el-form label-position="top">
      <el-form-item label="操作类型">
        <el-select v-model="node.properties.actionType" class="w-full">
          <el-option label="锁屏" value="lock" />
          <el-option label="睡眠" value="sleep" />
          <el-option label="重启" value="restart" />
          <el-option label="关机" value="shutdown" />
        </el-select>
      </el-form-item>

      <el-form-item label="强制执行">
        <el-switch v-model="node.properties.force" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="node.properties.description" type="textarea" rows="2" />
      </el-form-item>
    </el-form>
  </div>
  </template>

<script setup lang="ts">
import type { NodeConfigProps } from '@/types/node-config'

const props = defineProps<NodeConfigProps>()
const node = props.node

// 初始化默认值
if (!node.properties.actionType) node.properties.actionType = 'lock'
if (node.properties.force === undefined) node.properties.force = false
</script>

<style scoped>
</style>


