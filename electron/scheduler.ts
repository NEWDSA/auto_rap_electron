import type { FlowNode } from '../src/types/node-config'
import { AutomationController } from './automation-controller'
import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending', // 等待执行
  RUNNING = 'running', // 正在执行
  COMPLETED = 'completed', // 执行完成
  FAILED = 'failed', // 执行失败
  STOPPED = 'stopped', // 已停止
  SCHEDULED = 'scheduled', // 已调度（定时任务）
}

// 定时任务类型枚举
export enum ScheduleType {
  ONCE = 'once', // 一次性
  DAILY = 'daily', // 每日
  WEEKLY = 'weekly', // 每周
  MONTHLY = 'monthly', // 每月
  INTERVAL = 'interval', // 时间间隔
  CRON = 'cron', // Cron 表达式
}

// 任务项接口
export interface TaskItem {
  id: number // 任务ID
  name: string // 任务名称
  status: TaskStatus // 任务状态
  nodes: FlowNode[] // 流程节点
  createTime: number // 创建时间
  lastRunTime?: number // 上次运行时间
  executionCount: number // 执行次数
  scheduleConfig?: {
    // 调度配置（可选）
    type: ScheduleType // 调度类型
    config: any // 具体配置
    nextRunTime?: number // 下次运行时间
    enabled: boolean // 是否启用
  }
  logPath?: string // 日志路径
}

// 任务执行结果接口
export interface TaskResult {
  taskId: number // 任务ID
  success: boolean // 是否成功
  startTime: number // 开始时间
  endTime: number // 结束时间
  error?: string // 错误信息
  data?: any // 执行数据
}

// 任务调度器类
export class TaskScheduler extends EventEmitter {
  private static instance: TaskScheduler
  private tasks: Map<number, TaskItem> = new Map() // 任务映射表
  private runningTaskId: number | null = null // 当前运行的任务ID
  private taskQueue: number[] = [] // 任务队列
  private scheduledTimers: Map<number, NodeJS.Timeout> = new Map() // 定时器映射表
  private automationController: AutomationController
  private taskLogsDir: string
  private isProcessingQueue: boolean = false // 是否正在处理队列

  private constructor(automationController: AutomationController) {
    super()
    this.automationController = automationController
    // 创建日志目录
    this.taskLogsDir = path.join(app.getPath('userData'), 'task-logs')
    if (!fs.existsSync(this.taskLogsDir)) {
      fs.mkdirSync(this.taskLogsDir, { recursive: true })
    }

    // 每分钟检查一次定时任务
    setInterval(() => this.checkScheduledTasks(), 60000)

    // 初始化后立即检查一次
    this.checkScheduledTasks()

    // 监听进程退出事件，清理资源
    process.on('exit', () => {
      this.cleanup()
    })
  }

  // 获取单例实例
  public static getInstance(automationController: AutomationController): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler(automationController)
    }
    return TaskScheduler.instance
  }

  // 添加任务到调度器
  public addTask(task: Omit<TaskItem, 'createTime' | 'executionCount'> | any): TaskItem {
    // 修改：确保使用传入任务的ID，不再生成新ID
    const id = task.id || this.generateTaskId()
    console.log(`添加任务: 名称=${task.name}, 传入ID=${task.id}, 使用ID=${id}`)

    const newTask: TaskItem = {
      ...task,
      id,
      createTime: task.createTime || Date.now(),
      executionCount: task.executionCount !== undefined ? task.executionCount : 0,
      status: task.scheduleConfig?.enabled
        ? TaskStatus.SCHEDULED
        : task.status || TaskStatus.PENDING,
    }

    this.tasks.set(id, newTask)

    // 如果是定时任务且已启用，设置调度
    if (newTask.scheduleConfig?.enabled) {
      this.scheduleTask(newTask)
    }

    this.emit('taskAdded', newTask)
    return newTask
  }

  // 更新任务信息
  public updateTask(taskId: number, updates: Partial<TaskItem>): TaskItem | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    // 更新任务信息
    const updatedTask = { ...task, ...updates }
    this.tasks.set(taskId, updatedTask)

    // 处理调度状态变更
    if (updates.scheduleConfig !== undefined) {
      // 清除现有调度
      this.clearTaskSchedule(taskId)

      // 如果启用了调度，重新设置
      if (updatedTask.scheduleConfig?.enabled) {
        this.scheduleTask(updatedTask)
        updatedTask.status = TaskStatus.SCHEDULED
      } else if (updatedTask.status === TaskStatus.SCHEDULED) {
        // 如果禁用了调度，将状态改为等待
        updatedTask.status = TaskStatus.PENDING
      }
    }

    this.emit('taskUpdated', updatedTask)
    return updatedTask
  }

  // 删除任务
  public deleteTask(taskId: number): boolean {
    // 如果任务正在运行，先停止它
    if (this.runningTaskId === taskId) {
      this.stopTask(taskId)
    }

    // 清除任务的调度
    this.clearTaskSchedule(taskId)

    // 从队列中移除
    this.taskQueue = this.taskQueue.filter(id => id !== taskId)

    // 从任务映射表中删除
    const result = this.tasks.delete(taskId)

    if (result) {
      this.emit('taskDeleted', taskId)
    }

    return result
  }

  // 获取所有任务
  public getAllTasks(): TaskItem[] {
    return Array.from(this.tasks.values())
  }

  // 获取任务详情
  public getTask(taskId: number): TaskItem | null {
    return this.tasks.get(taskId) || null
  }

  // 启动任务
  public async startTask(taskId: number): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // 如果任务已在运行，返回false
    if (task.status === TaskStatus.RUNNING) return false

    // 如果有其他任务正在运行，将此任务加入队列
    if (this.runningTaskId !== null) {
      // 确保任务不在队列中
      if (!this.taskQueue.includes(taskId)) {
        this.taskQueue.push(taskId)
        // 更新任务状态
        task.status = TaskStatus.PENDING
        this.tasks.set(taskId, task)
        this.emit('taskQueued', task)
      }
      return true
    }

    // 否则立即执行任务
    return this.executeTask(taskId)
  }

  // 停止任务
  public async stopTask(taskId: number): Promise<boolean> {
    // 如果不是当前运行的任务，只需从队列中移除
    if (this.runningTaskId !== taskId) {
      // 从队列中移除
      this.taskQueue = this.taskQueue.filter(id => id !== taskId)

      // 更新任务状态
      const task = this.tasks.get(taskId)
      if (task && task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.STOPPED
        this.tasks.set(taskId, task)
        this.emit('taskStopped', task)
      }

      return true
    }

    // 停止当前运行的任务
    try {
      await this.automationController.stop()

      // 更新任务状态
      const task = this.tasks.get(taskId)
      if (task) {
        task.status = TaskStatus.STOPPED
        this.tasks.set(taskId, task)
        this.emit('taskStopped', task)
      }

      // 重置运行状态
      this.runningTaskId = null

      // 处理队列中的下一个任务
      this.processTaskQueue()

      return true
    } catch (error) {
      console.error('停止任务出错:', error)
      return false
    }
  }

  // 清空任务队列
  public clearTaskQueue(): void {
    // 保存当前队列以便发出事件
    const clearedTasks = this.taskQueue.map(id => this.tasks.get(id)).filter(Boolean) as TaskItem[]

    // 清空队列
    this.taskQueue = []

    // 更新队列中任务的状态
    for (const task of clearedTasks) {
      if (task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.STOPPED
        this.tasks.set(task.id, task)
        this.emit('taskStopped', task)
      }
    }

    this.emit('queueCleared', clearedTasks)
  }

  // 计算下次运行时间
  public calculateNextRunTime(task: TaskItem): number | null {
    if (!task.scheduleConfig || !task.scheduleConfig.enabled) return null

    const now = Date.now()
    const { type, config } = task.scheduleConfig

    switch (type) {
      case ScheduleType.ONCE:
        // 一次性任务的时间点
        const timestamp = config.timestamp
        return timestamp > now ? timestamp : null

      case ScheduleType.DAILY:
        // 每日特定时间
        const [hours, minutes] = config.time.split(':').map(Number)
        const today = new Date()
        today.setHours(hours, minutes, 0, 0)

        // 如果今天的时间已过，则设为明天
        if (today.getTime() < now) {
          today.setDate(today.getDate() + 1)
        }

        return today.getTime()

      case ScheduleType.WEEKLY:
        // 每周特定日期和时间
        const day = config.day // 0-6，对应周日到周六
        const weeklyTime = config.time
        const [weeklyHours, weeklyMinutes] = weeklyTime.split(':').map(Number)

        const thisWeek = new Date()
        thisWeek.setHours(weeklyHours, weeklyMinutes, 0, 0)

        // 调整到本周的指定日期
        const currentDay = thisWeek.getDay()
        const daysUntilTarget = (day - currentDay + 7) % 7
        thisWeek.setDate(thisWeek.getDate() + daysUntilTarget)

        // 如果计算出的时间已过，则设为下周
        if (thisWeek.getTime() < now) {
          thisWeek.setDate(thisWeek.getDate() + 7)
        }

        return thisWeek.getTime()

      case ScheduleType.MONTHLY:
        // 每月特定日期和时间
        const date = config.date // 1-31
        const monthlyTime = config.time
        const [monthlyHours, monthlyMinutes] = monthlyTime.split(':').map(Number)

        const thisMonth = new Date()
        thisMonth.setDate(date)
        thisMonth.setHours(monthlyHours, monthlyMinutes, 0, 0)

        // 如果这个月的日期已过，则设为下个月
        if (thisMonth.getTime() < now) {
          thisMonth.setMonth(thisMonth.getMonth() + 1)
        }

        return thisMonth.getTime()

      case ScheduleType.INTERVAL:
        // 按时间间隔（分钟）
        const intervalMinutes = config.minutes
        // 如果有上次运行时间，基于上次运行计算；否则基于当前时间
        const baseTime = task.lastRunTime || now
        return baseTime + intervalMinutes * 60 * 1000

      case ScheduleType.CRON:
        // TODO: 实现Cron表达式的解析
        // 需要引入额外的库来解析Cron表达式
        console.warn('Cron表达式调度暂未实现')
        return null

      default:
        return null
    }
  }

  // 清理资源
  private cleanup(): void {
    // 清除所有定时器
    for (const timerId of this.scheduledTimers.values()) {
      clearTimeout(timerId)
    }
    this.scheduledTimers.clear()

    // 尝试停止当前运行的任务
    if (this.runningTaskId !== null) {
      try {
        this.automationController.stop()
      } catch (error) {
        console.error('清理资源时停止任务出错:', error)
      }
    }
  }

  // 生成唯一任务ID
  private generateTaskId(): number {
    // 简单实现：使用当前时间戳
    return Date.now()
  }

  // 执行任务
  private async executeTask(taskId: number): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || !task.nodes || task.nodes.length === 0) return false

    // 设置当前运行的任务ID
    this.runningTaskId = taskId

    // 更新任务状态
    task.status = TaskStatus.RUNNING
    task.lastRunTime = Date.now()
    task.executionCount++
    this.tasks.set(taskId, task)

    // 创建任务日志文件
    const logFileName = `task_${taskId}_${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.log`
    task.logPath = path.join(this.taskLogsDir, logFileName)

    // 记录任务开始日志
    this.logTaskEvent(task, `开始执行任务 "${task.name}" (ID: ${taskId})`)

    // 通知任务开始
    this.emit('taskStarted', task)

    try {
      // 执行任务
      await this.automationController.start(task.nodes, taskId)

      // 任务成功完成
      task.status = TaskStatus.COMPLETED
      this.tasks.set(taskId, task)

      // 记录任务完成日志
      this.logTaskEvent(task, `任务 "${task.name}" (ID: ${taskId}) 执行成功`)

      // 更新数据库中的执行次数
      this.emit('taskExecutionCountUpdated', {
        taskId,
        executionCount: task.executionCount,
      })

      // 通知任务完成
      this.emit('taskCompleted', {
        taskId,
        success: true,
        startTime: task.lastRunTime as number,
        endTime: Date.now(),
      })

      return true
    } catch (error: any) {
      // 任务执行失败
      task.status = TaskStatus.FAILED
      this.tasks.set(taskId, task)

      // 记录任务失败日志
      this.logTaskEvent(task, `任务 "${task.name}" (ID: ${taskId}) 执行失败: ${error.message}`)

      // 更新数据库中的执行次数（即使失败也计入执行次数）
      this.emit('taskExecutionCountUpdated', {
        taskId,
        executionCount: task.executionCount,
      })

      // 通知任务失败
      this.emit('taskFailed', {
        taskId,
        success: false,
        startTime: task.lastRunTime as number,
        endTime: Date.now(),
        error: error.message,
      })

      return false
    } finally {
      // 重置当前运行的任务ID
      this.runningTaskId = null

      // 更新任务下次运行时间（如果是定时任务）
      if (task.scheduleConfig?.enabled) {
        const nextRunTime = this.calculateNextRunTime(task)
        if (nextRunTime) {
          task.scheduleConfig.nextRunTime = nextRunTime
          this.scheduleTask(task)
        }
      }

      // 处理队列中的下一个任务
      this.processTaskQueue()
    }
  }

  // 处理任务队列
  private async processTaskQueue(): Promise<void> {
    // 如果已经在处理队列或没有待处理的任务，返回
    if (this.isProcessingQueue || this.runningTaskId !== null || this.taskQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      // 取出队列中的第一个任务
      const taskId = this.taskQueue.shift() as number

      // 执行任务
      await this.executeTask(taskId)
    } finally {
      this.isProcessingQueue = false

      // 如果队列还有任务且没有正在运行的任务，继续处理
      if (this.taskQueue.length > 0 && this.runningTaskId === null) {
        this.processTaskQueue()
      }
    }
  }

  // 设置任务调度
  private scheduleTask(task: TaskItem): void {
    if (!task.scheduleConfig?.enabled) return

    // 清除现有调度
    this.clearTaskSchedule(task.id)

    // 计算下次运行时间
    const nextRunTime = this.calculateNextRunTime(task)
    if (!nextRunTime) return

    // 更新任务的下次运行时间
    task.scheduleConfig.nextRunTime = nextRunTime
    this.tasks.set(task.id, task)

    // 计算延迟时间（毫秒）
    const delay = nextRunTime - Date.now()
    if (delay <= 0) return

    // 设置定时器
    const timerId = setTimeout(() => {
      // 移除定时器ID
      this.scheduledTimers.delete(task.id)

      // 执行任务
      this.startTask(task.id)
    }, delay)

    // 保存定时器ID
    this.scheduledTimers.set(task.id, timerId)

    // 日志记录
    this.logTaskEvent(
      task,
      `任务 "${task.name}" (ID: ${task.id}) 已调度，将在 ${new Date(nextRunTime).toLocaleString()} 执行`
    )

    // 通知任务已调度
    this.emit('taskScheduled', {
      taskId: task.id,
      scheduledTime: nextRunTime,
    })
  }

  // 清除任务调度
  private clearTaskSchedule(taskId: number): void {
    const timerId = this.scheduledTimers.get(taskId)
    if (timerId) {
      clearTimeout(timerId)
      this.scheduledTimers.delete(taskId)
    }
  }

  // 检查所有定时任务
  private checkScheduledTasks(): void {
    const now = Date.now()

    // 遍历所有任务
    for (const task of this.tasks.values()) {
      // 跳过非调度任务或已在队列中的任务
      if (
        !task.scheduleConfig?.enabled ||
        task.status === TaskStatus.RUNNING ||
        this.taskQueue.includes(task.id)
      ) {
        continue
      }

      // 如果已经设置了调度，跳过
      if (this.scheduledTimers.has(task.id)) {
        continue
      }

      // 计算下次运行时间
      const nextRunTime = this.calculateNextRunTime(task)
      if (!nextRunTime) continue

      // 更新任务的下次运行时间
      task.scheduleConfig.nextRunTime = nextRunTime
      this.tasks.set(task.id, task)

      // 如果下次运行时间已过，立即执行
      if (nextRunTime <= now) {
        this.startTask(task.id)
      } else {
        // 否则设置调度
        this.scheduleTask(task)
      }
    }
  }

  // 记录任务事件到日志文件
  private logTaskEvent(task: TaskItem, message: string): void {
    if (!task.logPath) return

    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`

    try {
      fs.appendFileSync(task.logPath, logMessage)
    } catch (error) {
      console.error('写入任务日志出错:', error)
    }
  }

  // 获取任务日志
  public getTaskLog(taskId: number): string {
    const task = this.tasks.get(taskId)
    if (!task || !task.logPath || !fs.existsSync(task.logPath)) {
      return ''
    }

    try {
      return fs.readFileSync(task.logPath, 'utf-8')
    } catch (error) {
      console.error('读取任务日志出错:', error)
      return ''
    }
  }
}
