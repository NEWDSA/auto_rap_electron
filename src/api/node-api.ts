/**
 * 节点API接口
 * 提供节点类型信息的API接口
 */

import { nodeManager } from '@/utils/node-manager'
import type { NodeTypeInfo } from '@/services/node-registry.service'

/**
 * 节点API类
 */
export class NodeAPI {
  /**
   * 获取所有节点类型
   */
  static getAllNodeTypes(): NodeTypeInfo[] {
    return nodeManager.getAllNodeTypes()
  }

  /**
   * 按分类获取节点类型
   */
  static getNodeTypesByCategory(): Record<string, NodeTypeInfo[]> {
    return nodeManager.getNodeTypesByCategory()
  }

  /**
   * 获取指定节点类型信息
   */
  static getNodeType(type: string): NodeTypeInfo | undefined {
    return nodeManager.getNodeType(type)
  }

  /**
   * 获取节点配置模板
   */
  static getNodeConfigTemplate(nodeType: string): Record<string, any> {
    return nodeManager.getNodeConfigTemplate(nodeType)
  }

  /**
   * 验证节点配置
   */
  static validateNodeConfig(nodeType: string, config: Record<string, any>): {
    valid: boolean
    errors: string[]
  } {
    return nodeManager.validateNodeConfig(nodeType, config)
  }

  /**
   * 生成AI系统提示词
   */
  static generateAISystemPrompt(): string {
    return nodeManager.generateAISystemPrompt()
  }

  /**
   * 获取节点类型统计信息
   */
  static getNodeTypeStats(): {
    total: number
    byCategory: Record<string, number>
  } {
    const nodeTypes = nodeManager.getAllNodeTypes()
    const byCategory: Record<string, number> = {}
    
    nodeTypes.forEach(nodeType => {
      byCategory[nodeType.category] = (byCategory[nodeType.category] || 0) + 1
    })
    
    return {
      total: nodeTypes.length,
      byCategory
    }
  }

  /**
   * 搜索节点类型
   */
  static searchNodeTypes(query: string): NodeTypeInfo[] {
    const allNodes = nodeManager.getAllNodeTypes()
    const lowerQuery = query.toLowerCase()
    
    return allNodes.filter(node => 
      node.name.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery) ||
      node.type.toLowerCase().includes(lowerQuery) ||
      node.category.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 获取节点类型的详细信息（包括参数说明）
   */
  static getNodeTypeDetails(type: string): {
    nodeInfo: NodeTypeInfo | undefined
    configTemplate: Record<string, any>
    parameterHelp: Record<string, string>
  } {
    const nodeInfo = nodeManager.getNodeType(type)
    const configTemplate = nodeManager.getNodeConfigTemplate(type)
    const parameterHelp: Record<string, string> = {}
    
    if (nodeInfo?.parameters) {
      nodeInfo.parameters.forEach(param => {
        parameterHelp[param.name] = param.description
      })
    }
    
    return {
      nodeInfo,
      configTemplate,
      parameterHelp
    }
  }
}

// 导出便捷方法
export const {
  getAllNodeTypes,
  getNodeTypesByCategory,
  getNodeType,
  getNodeConfigTemplate,
  validateNodeConfig,
  generateAISystemPrompt,
  getNodeTypeStats,
  searchNodeTypes,
  getNodeTypeDetails
} = NodeAPI