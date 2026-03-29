/**
 * 节点注册服务
 * 动态发现和管理RPA节点类型
 */

import type { FlowNode } from '@/types/node-config'
import { NodeScannerService } from './node-scanner.service'

export interface NodeTypeInfo {
  type: string
  name: string
  description: string
  category: string
  parameters?: NodeParameter[]
}

export interface NodeParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea'
  description: string
  required?: boolean
  options?: string[]
  defaultValue?: any
}

export class NodeRegistryService {
  private static instance: NodeRegistryService
  private nodeTypes: Map<string, NodeTypeInfo> = new Map()

  private constructor() {
    this.initializeNodeTypes()
  }

  static getInstance(): NodeRegistryService {
    if (!NodeRegistryService.instance) {
      NodeRegistryService.instance = new NodeRegistryService()
    }
    return NodeRegistryService.instance
  }

  /**
   * 初始化节点类型定义
   */
  private initializeNodeTypes() {
    // 使用节点扫描器获取真实的节点信息
    const scanner = NodeScannerService.getInstance()
    const scannedNodes = scanner.scanAllNodes()

    // 注册所有扫描到的节点
    scannedNodes.forEach(nodeInfo => {
      this.registerNodeType(nodeInfo)
    })
  }

  /**
   * 注册节点类型
   */
  registerNodeType(nodeInfo: NodeTypeInfo) {
    this.nodeTypes.set(nodeInfo.type, nodeInfo)
  }

  /**
   * 获取所有节点类型
   */
  getAllNodeTypes(): NodeTypeInfo[] {
    return Array.from(this.nodeTypes.values())
  }

  /**
   * 获取指定节点类型信息
   */
  getNodeType(type: string): NodeTypeInfo | undefined {
    return this.nodeTypes.get(type)
  }

  /**
   * 生成AI系统提示词
   */
  generateSystemPrompt(): string {
    const nodeTypes = this.getAllNodeTypes()
    console.log('🔍 生成系统提示词，节点数量:', nodeTypes.length)

    if (nodeTypes.length === 0) {
      console.warn('⚠️ 没有找到任何节点类型，使用默认提示词')
      return `你是一个 RPA（机器人流程自动化）专家。用户会描述他们想要自动化的任务，你需要将其转换为详细的流程步骤。\n\n请分析用户需求，输出结构化的流程步骤。`
    }

    let prompt = `你是一个 RPA（机器人流程自动化）专家。用户会描述他们想要自动化的任务，你需要将其转换为详细的流程步骤。\n\n可用的节点类型：\n`

    nodeTypes.forEach((nodeType, index) => {
      prompt += `${index + 1}. ${nodeType.type}: ${nodeType.description}\n`

      if (nodeType.parameters && nodeType.parameters.length > 0) {
        prompt += `   主要参数：\n`
        nodeType.parameters.forEach(param => {
          const required = param.required ? '(必需)' : '(可选)'
          prompt += `   - ${param.name}: ${param.description} ${required}\n`
        })
      }
      prompt += `\n`
    })

    console.log('✅ 系统提示词生成完成，长度:', prompt.length)

    prompt += `请分析用户需求，输出结构化的流程步骤。每个步骤包含：
- 步骤序号
- 节点类型
- 操作描述
- 必要的参数

输出格式示例：
1. [browser] 打开浏览器并访问 https://example.com
2. [wait] 等待页面加载完成（3秒）
3. [click] 点击登录按钮（选择器：#login-btn）
4. [input] 输入用户名（选择器：#username，值：user@example.com）
5. [extract] 提取数据（选择器：.news-title）
6. [export] 导出到Excel文件

请确保步骤清晰、可执行，并包含所有必要的细节。`

    return prompt
  }

  /**
   * 按分类获取节点类型
   */
  getNodeTypesByCategory(): Record<string, NodeTypeInfo[]> {
    const categories: Record<string, NodeTypeInfo[]> = {}

    this.nodeTypes.forEach(nodeType => {
      if (!categories[nodeType.category]) {
        categories[nodeType.category] = []
      }
      categories[nodeType.category].push(nodeType)
    })

    return categories
  }
}
