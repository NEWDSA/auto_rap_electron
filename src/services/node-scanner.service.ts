/**
 * 节点扫描服务
 * 自动从Vue组件中提取节点属性信息
 */

import type { NodeTypeInfo, NodeParameter } from './node-registry.service'

/**
 * 节点扫描器
 */
export class NodeScannerService {
  private static instance: NodeScannerService

  private constructor() {}

  static getInstance(): NodeScannerService {
    if (!NodeScannerService.instance) {
      NodeScannerService.instance = new NodeScannerService()
    }
    return NodeScannerService.instance
  }

  /**
   * 扫描所有节点配置并生成详细信息
   */
  scanAllNodes(): NodeTypeInfo[] {
    return [
      this.scanInputNode(),
      this.scanClickNode(),
      this.scanBrowserNode(),
      this.scanExtractNode(),
      this.scanWaitNode(),
      this.scanScreenshotNode(),
      this.scanScrollNode(),
      this.scanKeyboardNode(),
      this.scanMouseNode(),
      this.scanConditionNode(),
      this.scanLoopNode(),
      this.scanExportNode()
    ]
  }

  /**
   * 扫描输入节点
   */
  private scanInputNode(): NodeTypeInfo {
    return {
      type: 'input',
      name: '输入文本',
      description: '在指定的输入框中输入文本内容，支持多种选择器类型和输入模式',
      category: '交互操作',
      parameters: [
        {
          name: 'selectorType',
          type: 'select',
          description: '元素选择器类型',
          required: true,
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'selector',
          type: 'string',
          description: '元素选择器表达式，用于定位输入框',
          required: true
        },
        {
          name: 'text',
          type: 'textarea',
          description: '要输入的文本内容',
          required: true
        },
        {
          name: 'clearFirst',
          type: 'boolean',
          description: '输入前是否清除原有内容',
          defaultValue: true
        },
        {
          name: 'simulateTyping',
          type: 'boolean',
          description: '是否模拟真实的打字过程',
          defaultValue: true
        },
        {
          name: 'typingDelay',
          type: 'number',
          description: '模拟打字时每个字符的延迟时间（毫秒），范围50-1000',
          defaultValue: 100
        },
        {
          name: 'waitAfterInput',
          type: 'boolean',
          description: '输入完成后是否等待',
          defaultValue: false
        },
        {
          name: 'waitTimeout',
          type: 'number',
          description: '输入后等待时间（秒），范围1-60',
          defaultValue: 5
        }
      ]
    }
  }

  /**
   * 扫描点击节点
   */
  private scanClickNode(): NodeTypeInfo {
    return {
      type: 'click',
      name: '点击元素',
      description: '点击页面上的指定元素，支持多种选择器和等待设置',
      category: '交互操作',
      parameters: [
        {
          name: 'selectorType',
          type: 'select',
          description: '元素选择器类型',
          required: true,
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'selector',
          type: 'string',
          description: '元素选择器表达式，用于定位要点击的元素',
          required: true
        },
        {
          name: 'waitAfterClick',
          type: 'boolean',
          description: '点击后是否等待页面加载',
          defaultValue: true
        },
        {
          name: 'clickTimeout',
          type: 'number',
          description: '点击后等待超时时间（秒），范围1-60',
          defaultValue: 5
        }
      ]
    }
  }

  /**
   * 扫描浏览器节点
   */
  private scanBrowserNode(): NodeTypeInfo {
    return {
      type: 'browser',
      name: '浏览器操作',
      description: '控制浏览器的各种操作，包括导航、窗口管理等',
      category: '浏览器控制',
      parameters: [
        {
          name: 'browserActionType',
          type: 'select',
          description: '浏览器操作类型',
          required: true,
          options: ['goto', 'back', 'forward', 'reload', 'close', 'maximize', 'minimize'],
          defaultValue: 'goto'
        },
        {
          name: 'url',
          type: 'string',
          description: '目标URL地址（当操作类型为goto时必需）'
        },
        {
          name: 'waitForLoad',
          type: 'boolean',
          description: '是否等待页面加载完成',
          defaultValue: true
        },
        {
          name: 'timeout',
          type: 'number',
          description: '页面加载超时时间（毫秒）',
          defaultValue: 30000
        },
        {
          name: 'width',
          type: 'number',
          description: '浏览器窗口宽度（像素）',
          defaultValue: 1920
        },
        {
          name: 'height',
          type: 'number',
          description: '浏览器窗口高度（像素）',
          defaultValue: 1080
        },
        {
          name: 'headless',
          type: 'boolean',
          description: '是否以无头模式运行浏览器',
          defaultValue: false
        },
        {
          name: 'incognito',
          type: 'boolean',
          description: '是否使用隐身模式',
          defaultValue: false
        },
        {
          name: 'userAgent',
          type: 'string',
          description: '自定义User-Agent字符串'
        }
      ]
    }
  }

  /**
   * 扫描提取节点
   */
  private scanExtractNode(): NodeTypeInfo {
    return {
      type: 'extract',
      name: '提取数据',
      description: '从页面中提取文本、属性、表格等各种类型的数据',
      category: '数据操作',
      parameters: [
        {
          name: 'selectorType',
          type: 'select',
          description: '元素选择器类型',
          required: true,
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'selector',
          type: 'string',
          description: '元素选择器表达式',
          required: true
        },
        {
          name: 'extractType',
          type: 'select',
          description: '提取数据的类型',
          required: true,
          options: ['text', 'attribute', 'html', 'table', 'list'],
          defaultValue: 'text'
        },
        {
          name: 'attributeName',
          type: 'string',
          description: '要提取的属性名称（当提取类型为attribute时）'
        },
        {
          name: 'variableName',
          type: 'string',
          description: '存储提取数据的变量名称',
          required: true
        },
        {
          name: 'headerSelector',
          type: 'string',
          description: '表格头部选择器（当提取类型为table时）'
        },
        {
          name: 'rowSelector',
          type: 'string',
          description: '表格行选择器（当提取类型为table时）'
        },
        {
          name: 'cellSelector',
          type: 'string',
          description: '表格单元格选择器（当提取类型为table时）'
        },
        {
          name: 'hasHeader',
          type: 'boolean',
          description: '表格是否包含头部（当提取类型为table时）',
          defaultValue: true
        },
        {
          name: 'extractInnerHTML',
          type: 'boolean',
          description: '是否提取HTML内容而不是纯文本',
          defaultValue: false
        },
        {
          name: 'trimContent',
          type: 'boolean',
          description: '是否去除内容前后的空白字符',
          defaultValue: true
        },
        {
          name: 'waitForVisible',
          type: 'boolean',
          description: '是否等待元素可见后再提取',
          defaultValue: true
        }
      ]
    }
  }

  /**
   * 扫描等待节点
   */
  private scanWaitNode(): NodeTypeInfo {
    return {
      type: 'wait',
      name: '等待',
      description: '等待指定时间或等待特定条件满足',
      category: '流程控制',
      parameters: [
        {
          name: 'timeout',
          type: 'number',
          description: '等待时间（毫秒）',
          required: true,
          defaultValue: 3000
        },
        {
          name: 'selector',
          type: 'string',
          description: '等待元素出现的选择器（可选）'
        },
        {
          name: 'selectorType',
          type: 'select',
          description: '选择器类型',
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'waitForVisible',
          type: 'boolean',
          description: '等待元素可见（而不仅仅是存在）',
          defaultValue: true
        }
      ]
    }
  }

  /**
   * 扫描截图节点
   */
  private scanScreenshotNode(): NodeTypeInfo {
    return {
      type: 'screenshot',
      name: '截图',
      description: '对当前页面或指定元素进行截图保存',
      category: '工具操作',
      parameters: [
        {
          name: 'selector',
          type: 'string',
          description: '截图元素选择器（留空则截取整个页面）'
        },
        {
          name: 'selectorType',
          type: 'select',
          description: '选择器类型',
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'fileName',
          type: 'string',
          description: '截图文件名（不包含扩展名）',
          defaultValue: 'screenshot'
        },
        {
          name: 'fullPage',
          type: 'boolean',
          description: '是否截取整个页面（包括滚动区域）',
          defaultValue: false
        },
        {
          name: 'quality',
          type: 'number',
          description: '图片质量（0-100）',
          defaultValue: 90
        }
      ]
    }
  }

  /**
   * 扫描滚动节点
   */
  private scanScrollNode(): NodeTypeInfo {
    return {
      type: 'scroll',
      name: '滚动页面',
      description: '滚动页面到指定位置或元素',
      category: '交互操作',
      parameters: [
        {
          name: 'mouseActionType',
          type: 'select',
          description: '滚动类型',
          required: true,
          options: ['scrollToElement', 'scrollToPosition', 'scrollToTop', 'scrollToBottom'],
          defaultValue: 'scrollToTop'
        },
        {
          name: 'selector',
          type: 'string',
          description: '目标元素选择器（当滚动类型为scrollToElement时）'
        },
        {
          name: 'selectorType',
          type: 'select',
          description: '选择器类型',
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'x',
          type: 'number',
          description: 'X坐标位置（当滚动类型为scrollToPosition时）'
        },
        {
          name: 'y',
          type: 'number',
          description: 'Y坐标位置（当滚动类型为scrollToPosition时）'
        },
        {
          name: 'smooth',
          type: 'boolean',
          description: '是否平滑滚动',
          defaultValue: true
        },
        {
          name: 'waitForScroll',
          type: 'boolean',
          description: '滚动后是否等待',
          defaultValue: true
        }
      ]
    }
  }

  /**
   * 扫描键盘节点
   */
  private scanKeyboardNode(): NodeTypeInfo {
    return {
      type: 'keyboard',
      name: '键盘操作',
      description: '模拟键盘按键和组合键操作',
      category: '交互操作',
      parameters: [
        {
          name: 'keyboardActionType',
          type: 'select',
          description: '键盘操作类型',
          required: true,
          options: ['press', 'combination', 'type'],
          defaultValue: 'press'
        },
        {
          name: 'key',
          type: 'string',
          description: '按键名称或要输入的文本',
          required: true
        },
        {
          name: 'modifiers',
          type: 'string',
          description: '修饰键（如Ctrl、Alt、Shift），多个用+连接'
        },
        {
          name: 'delay',
          type: 'number',
          description: '按键延迟时间（毫秒）',
          defaultValue: 100
        }
      ]
    }
  }

  /**
   * 扫描鼠标节点
   */
  private scanMouseNode(): NodeTypeInfo {
    return {
      type: 'mouse',
      name: '鼠标操作',
      description: '模拟鼠标移动、点击等操作',
      category: '交互操作',
      parameters: [
        {
          name: 'mouseActionType',
          type: 'select',
          description: '鼠标操作类型',
          required: true,
          options: ['moveToElement', 'moveToPosition', 'click', 'doubleClick', 'rightClick'],
          defaultValue: 'moveToElement'
        },
        {
          name: 'selector',
          type: 'string',
          description: '目标元素选择器（当操作类型为moveToElement时）'
        },
        {
          name: 'selectorType',
          type: 'select',
          description: '选择器类型',
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'x',
          type: 'number',
          description: 'X坐标位置'
        },
        {
          name: 'y',
          type: 'number',
          description: 'Y坐标位置'
        },
        {
          name: 'duration',
          type: 'number',
          description: '移动持续时间（毫秒）',
          defaultValue: 1000
        }
      ]
    }
  }

  /**
   * 扫描条件节点
   */
  private scanConditionNode(): NodeTypeInfo {
    return {
      type: 'switch',
      name: '条件判断',
      description: '根据条件进行分支控制，支持元素存在性、文本内容等判断',
      category: '流程控制',
      parameters: [
        {
          name: 'conditionType',
          type: 'select',
          description: '条件类型',
          required: true,
          options: ['elementExists', 'textContains', 'attributeEquals', 'custom'],
          defaultValue: 'elementExists'
        },
        {
          name: 'selector',
          type: 'string',
          description: '元素选择器'
        },
        {
          name: 'selectorType',
          type: 'select',
          description: '选择器类型',
          options: ['css', 'xpath', 'id', 'class', 'name'],
          defaultValue: 'css'
        },
        {
          name: 'expectedValue',
          type: 'string',
          description: '期望值（用于文本或属性比较）'
        },
        {
          name: 'attributeName',
          type: 'string',
          description: '属性名称（当条件类型为attributeEquals时）'
        },
        {
          name: 'customCondition',
          type: 'textarea',
          description: '自定义条件表达式（当条件类型为custom时）'
        }
      ]
    }
  }

  /**
   * 扫描循环节点
   */
  private scanLoopNode(): NodeTypeInfo {
    return {
      type: 'loop',
      name: '循环',
      description: '重复执行指定的操作，支持计数循环、条件循环等',
      category: '流程控制',
      parameters: [
        {
          name: 'loopType',
          type: 'select',
          description: '循环类型',
          required: true,
          options: ['count', 'condition', 'forEach', 'while'],
          defaultValue: 'count'
        },
        {
          name: 'count',
          type: 'number',
          description: '循环次数（当循环类型为count时）',
          defaultValue: 1
        },
        {
          name: 'condition',
          type: 'textarea',
          description: '循环条件表达式（当循环类型为condition或while时）'
        },
        {
          name: 'dataSource',
          type: 'string',
          description: '数据源变量名（当循环类型为forEach时）'
        },
        {
          name: 'itemVariable',
          type: 'string',
          description: '循环项变量名（当循环类型为forEach时）',
          defaultValue: 'item'
        },
        {
          name: 'indexVariable',
          type: 'string',
          description: '索引变量名（当循环类型为forEach时）',
          defaultValue: 'index'
        },
        {
          name: 'maxIterations',
          type: 'number',
          description: '最大迭代次数（防止无限循环）',
          defaultValue: 1000
        }
      ]
    }
  }

  /**
   * 扫描导出节点
   */
  private scanExportNode(): NodeTypeInfo {
    return {
      type: 'export',
      name: '导出数据',
      description: '将提取的数据导出为各种格式的文件',
      category: '数据操作',
      parameters: [
        {
          name: 'exportType',
          type: 'select',
          description: '导出格式',
          required: true,
          options: ['excel', 'csv', 'json', 'pdf', 'word'],
          defaultValue: 'excel'
        },
        {
          name: 'fileName',
          type: 'string',
          description: '文件名（不包含扩展名）',
          required: true
        },
        {
          name: 'dataSource',
          type: 'select',
          description: '数据源类型',
          required: true,
          options: ['variable', 'extract', 'all'],
          defaultValue: 'extract'
        },
        {
          name: 'variableName',
          type: 'string',
          description: '数据源变量名（当数据源类型为variable时）'
        },
        {
          name: 'sheetName',
          type: 'string',
          description: 'Excel工作表名称（当导出格式为excel时）',
          defaultValue: 'Sheet1'
        },
        {
          name: 'delimiter',
          type: 'string',
          description: 'CSV分隔符（当导出格式为csv时）',
          defaultValue: ','
        },
        {
          name: 'includeHeaders',
          type: 'boolean',
          description: '是否包含表头',
          defaultValue: true
        },
        {
          name: 'encoding',
          type: 'select',
          description: '文件编码',
          options: ['utf-8', 'gbk', 'gb2312'],
          defaultValue: 'utf-8'
        },
        {
          name: 'saveMode',
          type: 'select',
          description: '保存模式',
          options: ['auto', 'select', 'overwrite'],
          defaultValue: 'auto'
        }
      ]
    }
  }
}