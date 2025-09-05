/**
 * 节点管理器
 * 自动扫描和注册节点配置组件
 */

import { NodeRegistryService } from '@/services/node-registry.service'
import type { NodeTypeInfo } from '@/services/node-registry.service'

/**
 * 节点管理器类
 */
export class NodeManager {
  private static instance: NodeManager
  private nodeRegistry: NodeRegistryService

  private constructor() {
    this.nodeRegistry = NodeRegistryService.getInstance()
  }

  static getInstance(): NodeManager {
    if (!NodeManager.instance) {
      NodeManager.instance = new NodeManager()
    }
    return NodeManager.instance
  }

  /**
   * 初始化节点管理器
   */
  async initialize() {
    console.log('🔧 初始化节点管理器...')
    
    // 扫描并注册所有节点类型
    await this.scanAndRegisterNodes()
    
    console.log('✅ 节点管理器初始化完成')
    console.log(`📊 已注册 ${this.nodeRegistry.getAllNodeTypes().length} 个节点类型`)
  }

  /**
   * 扫描并注册节点
   */
  private async scanAndRegisterNodes() {
    // 这里可以扩展为动态扫描node-configs目录
    // 目前使用预定义的节点类型
    
    const nodeTypes = this.nodeRegistry.getAllNodeTypes()
    console.log('📋 已注册的节点类型：')
    
    nodeTypes.forEach(nodeType => {
      console.log(`  - ${nodeType.type}: ${nodeType.name} (${nodeType.category})`)
    })
  }

  /**
   * 获取节点注册服务
   */
  getNodeRegistry(): NodeRegistryService {
    return this.nodeRegistry
  }

  /**
   * 获取所有节点类型
   */
  getAllNodeTypes(): NodeTypeInfo[] {
    return this.nodeRegistry.getAllNodeTypes()
  }

  /**
   * 按分类获取节点类型
   */
  getNodeTypesByCategory(): Record<string, NodeTypeInfo[]> {
    return this.nodeRegistry.getNodeTypesByCategory()
  }

  /**
   * 获取指定节点类型信息
   */
  getNodeType(type: string): NodeTypeInfo | undefined {
    return this.nodeRegistry.getNodeType(type)
  }

  /**
   * 生成AI系统提示词
   */
  generateAISystemPrompt(): string {
    return this.nodeRegistry.generateSystemPrompt()
  }

  /**
   * 验证节点配置
   */
  validateNodeConfig(nodeType: string, config: Record<string, any>): {
    valid: boolean
    errors: string[]
  } {
    const nodeInfo = this.getNodeType(nodeType)
    if (!nodeInfo) {
      return {
        valid: false,
        errors: [`未知的节点类型: ${nodeType}`]
      }
    }

    const errors: string[] = []
    
    // 检查必需参数
    if (nodeInfo.parameters) {
      nodeInfo.parameters.forEach(param => {
        if (param.required && !config[param.name]) {
          errors.push(`缺少必需参数: ${param.name}`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取节点配置模板
   */
  getNodeConfigTemplate(nodeType: string): Record<string, any> {
    const nodeInfo = this.getNodeType(nodeType)
    if (!nodeInfo || !nodeInfo.parameters) {
      return {}
    }

    const template: Record<string, any> = {}
    
    nodeInfo.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        template[param.name] = param.defaultValue
      }
    })

    return template
  }
}

/**
 * 导出单例实例
 */
export const nodeManager = NodeManager.getInstance()