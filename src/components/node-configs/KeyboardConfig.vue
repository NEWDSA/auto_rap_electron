<template>
  <div class="keyboard-config">
    <el-form-item label="操作类型">
      <el-select
        v-model="props.node.properties.keyboardActionType"
        @change="handleChange('keyboardActionType')"
      >
        <el-option label="按键" value="press" />
        <el-option label="组合键" value="combination" />
        <el-option label="输入文本" value="type" />
      </el-select>
    </el-form-item>

    <!-- 按键操作 -->
    <template v-if="props.node.properties.keyboardActionType === 'press'">
      <el-form-item label="选择按键">
        <el-select
          v-model="props.node.properties.key"
          @change="handleChange('key')"
        >
          <el-option-group label="常用按键">
            <el-option label="Enter" value="Enter" />
            <el-option label="Tab" value="Tab" />
            <el-option label="Escape" value="Escape" />
            <el-option label="Backspace" value="Backspace" />
            <el-option label="Delete" value="Delete" />
            <el-option label="Space" value="Space" />
          </el-option-group>
          <el-option-group label="功能键">
            <el-option v-for="i in 12" :key="i" :label="`F${i}`" :value="`F${i}`" />
          </el-option-group>
          <el-option-group label="方向键">
            <el-option label="↑" value="ArrowUp" />
            <el-option label="↓" value="ArrowDown" />
            <el-option label="←" value="ArrowLeft" />
            <el-option label="→" value="ArrowRight" />
          </el-option-group>
          <el-option-group label="其他">
            <el-option label="Home" value="Home" />
            <el-option label="End" value="End" />
            <el-option label="PageUp" value="PageUp" />
            <el-option label="PageDown" value="PageDown" />
          </el-option-group>
        </el-select>
      </el-form-item>
    </template>

    <!-- 组合键操作 -->
    <template v-if="props.node.properties.keyboardActionType === 'combination'">
      <el-form-item label="修饰键">
        <el-checkbox-group
          v-model="props.node.properties.modifiers"
          @change="handleChange('modifiers')"
        >
          <el-checkbox label="Control">Ctrl</el-checkbox>
          <el-checkbox label="Alt">Alt</el-checkbox>
          <el-checkbox label="Shift">Shift</el-checkbox>
          <el-checkbox label="Meta">Win/Cmd</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="主按键">
        <el-select
          v-model="props.node.properties.key"
          @change="handleChange('key')"
        >
          <el-option-group label="字母">
            <el-option 
              v-for="letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')"
              :key="letter"
              :label="letter"
              :value="letter"
            />
          </el-option-group>
          <el-option-group label="数字">
            <el-option 
              v-for="num in '0123456789'.split('')"
              :key="num"
              :label="num"
              :value="num"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
    </template>

    <!-- 文本输入 -->
    <template v-if="props.node.properties.keyboardActionType === 'type'">
      <el-form-item label="输入文本">
        <el-input
          v-model="props.node.properties.text"
          type="textarea"
          :rows="3"
          placeholder="请输入要模拟键入的文本"
          @change="handleChange('text')"
        />
      </el-form-item>

      <el-form-item>
        <el-checkbox
          v-model="props.node.properties.simulateTyping"
          @change="handleChange('simulateTyping')"
        >
          模拟人工输入
        </el-checkbox>
      </el-form-item>

      <el-form-item 
        label="输入延迟(毫秒)" 
        v-if="props.node.properties.simulateTyping"
      >
        <el-input-number
          v-model="props.node.properties.typingDelay"
          :min="50"
          :max="1000"
          :step="50"
          @change="handleChange('typingDelay')"
        />
      </el-form-item>
    </template>

    <!-- 通用配置 -->
    <el-form-item>
      <el-checkbox
        v-model="props.node.properties.waitAfterInput"
        @change="handleChange('waitAfterInput')"
      >
        输入后等待
      </el-checkbox>
    </el-form-item>

    <el-form-item 
      label="等待时间(毫秒)" 
      v-if="props.node.properties.waitAfterInput"
    >
      <el-input-number
        v-model="props.node.properties.waitTimeout"
        :min="0"
        :max="10000"
        :step="100"
        @change="handleChange('waitTimeout')"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

interface Props {
  node: {
    properties: {
      keyboardActionType?: 'press' | 'combination' | 'type'
      key?: string
      modifiers?: string[]
      text?: string
      simulateTyping?: boolean
      typingDelay?: number
      waitAfterInput?: boolean
      waitTimeout?: number
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

// 初始化默认值
onMounted(() => {
  if (!props.node.properties.keyboardActionType) {
    props.node.properties.keyboardActionType = 'press'
  }
  if (!props.node.properties.modifiers) {
    props.node.properties.modifiers = []
  }
  if (!props.node.properties.typingDelay) {
    props.node.properties.typingDelay = 100
  }
  if (!props.node.properties.waitTimeout) {
    props.node.properties.waitTimeout = 1000
  }
})
</script>

<style scoped>
.keyboard-config {
  .el-checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style> 