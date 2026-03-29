<template>
  <div class="schedule-wrapper">
    <el-form :model="scheduleForm" label-width="120px" class="schedule-form">
      <el-form-item label="调度类型">
        <el-select
          v-model="scheduleForm.type"
          placeholder="请选择调度类型"
          @change="handleTypeChange"
        >
          <el-option label="一次性" value="once" />
          <el-option label="每日" value="daily" />
          <el-option label="每周" value="weekly" />
          <el-option label="每月" value="monthly" />
          <el-option label="时间间隔" value="interval" />
          <el-option label="Cron 表达式" value="cron" />
        </el-select>
      </el-form-item>

      <!-- 一次性任务设置 -->
      <template v-if="scheduleForm.type === 'once'">
        <el-form-item label="执行时间">
          <el-date-picker
            v-model="scheduleForm.config.timestamp"
            type="datetime"
            placeholder="选择执行时间"
            :disabled-date="disablePastDates"
            value-format="x"
          />
        </el-form-item>
      </template>

      <!-- 每日任务设置 -->
      <template v-if="scheduleForm.type === 'daily'">
        <el-form-item label="执行时间">
          <el-time-picker
            v-model="scheduleForm.config.time"
            placeholder="选择时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
      </template>

      <!-- 每周任务设置 -->
      <template v-if="scheduleForm.type === 'weekly'">
        <el-form-item label="星期">
          <el-select v-model="scheduleForm.config.day" placeholder="请选择星期">
            <el-option label="星期日" :value="0" />
            <el-option label="星期一" :value="1" />
            <el-option label="星期二" :value="2" />
            <el-option label="星期三" :value="3" />
            <el-option label="星期四" :value="4" />
            <el-option label="星期五" :value="5" />
            <el-option label="星期六" :value="6" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行时间">
          <el-time-picker
            v-model="scheduleForm.config.time"
            placeholder="选择时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
      </template>

      <!-- 每月任务设置 -->
      <template v-if="scheduleForm.type === 'monthly'">
        <el-form-item label="日期">
          <el-select v-model="scheduleForm.config.date" placeholder="请选择日期">
            <el-option v-for="day in 31" :key="day" :label="`${day}日`" :value="day" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行时间">
          <el-time-picker
            v-model="scheduleForm.config.time"
            placeholder="选择时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>
      </template>

      <!-- 时间间隔任务设置 -->
      <template v-if="scheduleForm.type === 'interval'">
        <el-form-item label="间隔(分钟)">
          <el-input-number
            v-model="scheduleForm.config.minutes"
            :min="1"
            :max="10080"
            placeholder="请输入时间间隔(分钟)"
          />
        </el-form-item>
      </template>

      <!-- Cron 表达式设置 -->
      <template v-if="scheduleForm.type === 'cron'">
        <el-form-item label="Cron 表达式">
          <el-input
            v-model="scheduleForm.config.expression"
            placeholder="例如: 0 0 * * * (每天0点执行)"
          >
            <template #append>
              <el-tooltip content="Cron 表达式格式: 分 时 日 月 星期">
                <el-button icon="Question" />
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <el-form-item>
        <el-switch
          v-model="scheduleForm.enabled"
          inline-prompt
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="saveSchedule">保存调度设置</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>

    <div v-if="nextRunTime" class="schedule-preview">
      <el-alert :title="`下次执行时间: ${nextRunTime}`" type="info" :closable="false" show-icon />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import type { TaskItem, ScheduleType } from '../../../electron/scheduler'

  // 定义组件 props
  const props = defineProps({
    taskId: {
      type: Number,
      required: true,
    },
  })

  // 定义组件事件
  const emit = defineEmits(['schedule-saved', 'schedule-canceled'])

  // 表单数据
  const scheduleForm = reactive({
    type: 'once', // 默认为一次性任务
    config: {
      // 各种类型的配置
      timestamp: Date.now() + 3600000, // 默认一小时后
      time: '12:00', // 默认中午12点
      day: 1, // 默认周一
      date: 1, // 默认每月1日
      minutes: 60, // 默认60分钟
      expression: '0 0 * * *', // 默认每天0点
    },
    enabled: false,
  })

  // 下次执行时间
  const nextRunTime = ref('')

  // 任务详情
  const taskDetail = ref<TaskItem | null>(null)

  // 禁用过去的日期
  const disablePastDates = (time: Date) => {
    return time.getTime() < Date.now()
  }

  // 处理调度类型变更
  const handleTypeChange = () => {
    calculateNextRunTime()
  }

  // 计算下次执行时间
  const calculateNextRunTime = () => {
    try {
      const now = new Date()
      let next = null

      switch (scheduleForm.type) {
        case 'once':
          // 一次性任务的时间点
          next = new Date(Number(scheduleForm.config.timestamp))
          break

        case 'daily':
          // 每日特定时间
          const [hours, minutes] = scheduleForm.config.time.split(':').map(Number)
          next = new Date()
          next.setHours(hours, minutes, 0, 0)
          // 如果今天的时间已过，则设为明天
          if (next.getTime() < now.getTime()) {
            next.setDate(next.getDate() + 1)
          }
          break

        case 'weekly':
          // 每周特定日期和时间
          const day = scheduleForm.config.day // 0-6，对应周日到周六
          const [weeklyHours, weeklyMinutes] = scheduleForm.config.time.split(':').map(Number)
          next = new Date()
          next.setHours(weeklyHours, weeklyMinutes, 0, 0)
          // 调整到本周的指定日期
          const currentDay = next.getDay()
          const daysUntilTarget = (day - currentDay + 7) % 7
          next.setDate(next.getDate() + daysUntilTarget)
          // 如果计算出的时间已过，则设为下周
          if (next.getTime() < now.getTime()) {
            next.setDate(next.getDate() + 7)
          }
          break

        case 'monthly':
          // 每月特定日期和时间
          const date = scheduleForm.config.date // 1-31
          const [monthlyHours, monthlyMinutes] = scheduleForm.config.time.split(':').map(Number)
          next = new Date()
          next.setDate(date)
          next.setHours(monthlyHours, monthlyMinutes, 0, 0)
          // 如果这个月的日期已过，则设为下个月
          if (next.getTime() < now.getTime()) {
            next.setMonth(next.getMonth() + 1)
          }
          break

        case 'interval':
          // 按时间间隔（分钟）
          const intervalMinutes = scheduleForm.config.minutes
          next = new Date(now.getTime() + intervalMinutes * 60 * 1000)
          break

        case 'cron':
          // 简单处理：仅展示
          next = new Date()
          next.setDate(next.getDate() + 1)
          break
      }

      if (next) {
        nextRunTime.value = next.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      } else {
        nextRunTime.value = ''
      }
    } catch (error) {
      console.error('计算下次执行时间出错:', error)
      nextRunTime.value = '计算出错'
    }
  }

  // 深度清理对象，确保可序列化
  const deepCleanObject = (obj: any): any => {
    // 如果不是对象或为null，直接返回
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    // 如果是数组，递归清理每个元素
    if (Array.isArray(obj)) {
      return obj.map(item => deepCleanObject(item))
    }

    // 如果是普通对象，递归清理每个属性
    const cleanObj: Record<string, any> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // 跳过函数和特殊对象
        const value = obj[key]
        if (
          typeof value !== 'function' &&
          !(value instanceof Element) &&
          !(typeof value === 'symbol')
        ) {
          try {
            // 尝试序列化和反序列化，确保可以克隆
            JSON.parse(JSON.stringify(value))
            cleanObj[key] = deepCleanObject(value)
          } catch (e) {
            // 如果无法序列化，跳过该属性
            console.warn(`属性 ${key} 无法序列化，已跳过`)
          }
        }
      }
    }
    return cleanObj
  }

  // 保存调度设置
  const saveSchedule = async () => {
    try {
      // 准备调度配置
      const scheduleConfig = {
        type: scheduleForm.type,
        config: scheduleForm.config,
        enabled: scheduleForm.enabled,
      }

      // 清理对象，确保可序列化
      const cleanedConfig = deepCleanObject(scheduleConfig)

      // 调用后端 API 更新任务的调度配置
      const result = await window.electronAPI.invoke('scheduler:update-task', props.taskId, {
        scheduleConfig: cleanedConfig,
      })

      if (result.success) {
        ElMessage.success('调度设置保存成功')
        emit('schedule-saved', result.data)
      } else {
        throw new Error(result.error || '保存失败')
      }
    } catch (error: any) {
      ElMessage.error(`保存调度设置失败: ${error.message}`)
    }
  }

  // 重置表单
  const resetForm = () => {
    // 重置为初始状态或从任务中获取当前设置
    if (taskDetail.value && taskDetail.value.scheduleConfig) {
      // 如果任务有调度配置，使用它
      const { type, config, enabled } = taskDetail.value.scheduleConfig
      scheduleForm.type = type
      scheduleForm.config = JSON.parse(JSON.stringify(config))
      scheduleForm.enabled = enabled
    } else {
      // 否则使用默认设置
      scheduleForm.type = 'once'
      scheduleForm.config = {
        timestamp: Date.now() + 3600000,
        time: '12:00',
        day: 1,
        date: 1,
        minutes: 60,
        expression: '0 0 * * *',
      }
      scheduleForm.enabled = false
    }

    // 重新计算下次执行时间
    calculateNextRunTime()
  }

  // 加载任务详情
  const loadTaskDetail = async () => {
    try {
      const result = await window.electronAPI.invoke('scheduler:get-task', props.taskId)
      if (result.success) {
        taskDetail.value = result.data

        // 如果任务有调度配置，使用它初始化表单
        if (taskDetail.value && taskDetail.value.scheduleConfig) {
          const { type, config, enabled } = taskDetail.value.scheduleConfig
          scheduleForm.type = type
          scheduleForm.config = JSON.parse(JSON.stringify(config))
          scheduleForm.enabled = enabled
        }

        // 计算下次执行时间
        calculateNextRunTime()
      } else {
        ElMessage.error(`加载任务详情失败: ${result.error}`)
      }
    } catch (error: any) {
      ElMessage.error(`加载任务详情出错: ${error.message}`)
    }
  }

  // 监听表单变化，重新计算下次执行时间
  watch(
    () => [scheduleForm.type, scheduleForm.config, scheduleForm.enabled],
    () => calculateNextRunTime(),
    { deep: true }
  )

  // 组件挂载时加载任务详情
  onMounted(() => {
    if (props.taskId) {
      loadTaskDetail()
    } else {
      // 如果没有任务ID，使用默认值
      resetForm()
    }
  })
</script>

<style lang="postcss" scoped>
  .schedule-wrapper {
    padding: 20px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }

  .schedule-form {
    max-width: 600px;
  }

  .schedule-preview {
    margin-top: 20px;
    padding: 10px;
    border-radius: 4px;
  }

  .dark .schedule-wrapper {
    background-color: #1e1e1e;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
  }
</style>
