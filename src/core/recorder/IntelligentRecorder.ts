import { FlowNode, NodeProperties } from '@/types/node-config';
import { v4 as uuidv4 } from 'uuid';

// 录制的操作类型
export enum RecordActionType {
  CLICK = 'click',
  INPUT = 'input',
  NAVIGATE = 'navigate',
  SCROLL = 'scroll',
  KEYBOARD = 'keyboard',
  EXTRACT = 'extract'
}

// 录制的操作数据
export interface RecordAction {
  id: string;
  type: RecordActionType;
  timestamp: number;
  target?: {
    selector: string;
    selectorType: 'css' | 'xpath' | 'id' | 'class' | 'name';
    innerText?: string;
    attributes?: Record<string, string>;
    tagName?: string;
    x?: number;
    y?: number;
  };
  data?: any;
}

// 智能录制器配置
export interface RecorderOptions {
  includeScrollEvents?: boolean;
  includeHoverEvents?: boolean;
  elementSelectorPreference?: 'css' | 'xpath' | 'mixed';
  minTimeBetweenEvents?: number; // 毫秒
  recordMouseMove?: boolean;
  screenshotOnAction?: boolean;
}

export class IntelligentRecorder {
  private isRecording: boolean = false;
  private actions: RecordAction[] = [];
  private startTime: number = 0;
  private browserInfo: {
    url: string;
    title: string;
    userAgent: string;
  } | null = null;
  private options: RecorderOptions;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      includeScrollEvents: false,
      includeHoverEvents: false,
      elementSelectorPreference: 'mixed',
      minTimeBetweenEvents: 50,
      recordMouseMove: false,
      screenshotOnAction: false,
      ...options
    };
  }

  /**
   * 开始录制
   */
  public async startRecording(url: string): Promise<void> {
    if (this.isRecording) {
      throw new Error('已经在录制中');
    }

    this.isRecording = true;
    this.actions = [];
    this.startTime = Date.now();
    
    // 存储浏览器信息
    this.browserInfo = {
      url,
      title: document.title,
      userAgent: navigator.userAgent
    };

    // 通知主进程开始录制
    await window.electronAPI.invoke('recorder:start', url);
  }

  /**
   * 停止录制
   */
  public async stopRecording(): Promise<RecordAction[]> {
    if (!this.isRecording) {
      throw new Error('没有正在进行的录制');
    }

    this.isRecording = false;
    
    // 通知主进程停止录制
    await window.electronAPI.invoke('recorder:stop');
    
    return this.actions;
  }

  /**
   * 添加录制动作
   */
  public addAction(action: Omit<RecordAction, 'id' | 'timestamp'>): void {
    if (!this.isRecording) {
      return;
    }

    const fullAction: RecordAction = {
      id: uuidv4(),
      timestamp: Date.now() - this.startTime,
      ...action
    };

    this.actions.push(fullAction);
  }

  /**
   * 将录制的动作转换为流程节点
   */
  public actionsToFlowNodes(): FlowNode[] {
    if (!this.browserInfo) {
      throw new Error('没有浏览器信息，无法生成流程');
    }

    const nodes: FlowNode[] = [];
    let xPosition = 200;
    let yPosition = 200;
    
    console.log(`生成流程节点, 共${this.actions.length}个操作`);
    
    // 添加开始节点
    const startNode: FlowNode = {
      id: uuidv4(),
      type: 'start',
      x: xPosition,
      y: yPosition,
      text: '开始流程',
      properties: {
        name: '开始流程',
        nodeType: 'start'
      }
    };
    nodes.push(startNode);
    
    // 添加浏览器节点
    yPosition += 100;
    const browserNode: FlowNode = {
      id: uuidv4(),
      type: 'browser',
      x: xPosition,
      y: yPosition,
      text: '打开浏览器',
      properties: {
        name: '打开浏览器',
        nodeType: 'browser',
        actionType: 'goto',
        browserActionType: 'goto',
        url: this.browserInfo.url,
        waitForLoad: true,
        timeout: 30,
        headless: false,
        incognito: false,
        width: 1280,
        height: 800
      }
    };
    nodes.push(browserNode);

    // 上一个节点的ID (用于连接)
    let lastNodeId = browserNode.id;
    
    // 按时间戳排序操作
    const sortedActions = [...this.actions].sort((a, b) => a.timestamp - b.timestamp);
    console.log('排序后的操作:', sortedActions.map(a => a.type));
    
    // 添加动作节点
    for (const action of sortedActions) {
      yPosition += 100;
      console.log(`处理操作: ${action.type}, 时间戳: ${action.timestamp}`);
      
      let node: FlowNode | null = null;
      
      switch (action.type) {
        case RecordActionType.CLICK:
          node = this.createClickNode(action, xPosition, yPosition);
          break;
        case RecordActionType.INPUT:
          node = this.createInputNode(action, xPosition, yPosition);
          break;
        case RecordActionType.NAVIGATE:
          node = this.createNavigateNode(action, xPosition, yPosition);
          break;
        case RecordActionType.SCROLL:
          node = this.createScrollNode(action, xPosition, yPosition);
          break;
        case RecordActionType.KEYBOARD:
          node = this.createKeyboardNode(action, xPosition, yPosition);
          break;
        case RecordActionType.EXTRACT:
          node = this.createExtractNode(action, xPosition, yPosition);
          break;
      }
      
      if (node) {
        console.log(`创建节点: 类型=${node.type}, ID=${node.id}`);
        nodes.push(node);
        lastNodeId = node.id;
      }
    }
    
    // 添加结束节点
    yPosition += 100;
    const endNode: FlowNode = {
      id: uuidv4(),
      type: 'end',
      x: xPosition,
      y: yPosition,
      text: '结束流程',
      properties: {
        name: '结束流程',
        nodeType: 'end'
      }
    };
    nodes.push(endNode);
    
    return nodes;
  }

  /**
   * 获取最佳选择器
   */
  private getBestSelector(target: RecordAction['target']): { selector: string; selectorType: 'css' | 'xpath' | 'id' | 'class' | 'name' } {
    if (!target) {
      return { selector: '', selectorType: 'css' };
    }

    // 根据配置和目标元素情况选择最佳选择器
    if (this.options.elementSelectorPreference === 'css' || this.options.elementSelectorPreference === 'mixed') {
      if (target.attributes?.id) {
        // 返回纯ID值，不添加#前缀
        return { selector: target.attributes.id, selectorType: 'id' };
      }
      
      if (target.attributes?.class) {
        // 简化class选择器，只取第一个类名，不添加.前缀
        const firstClass = target.attributes.class.split(' ')[0];
        if (firstClass) {
          return { selector: firstClass, selectorType: 'class' };
        }
      }
      
      if (target.attributes?.name) {
        // 返回纯name值，不使用[name="值"]格式
        return { selector: target.attributes.name, selectorType: 'name' };
      }
    }
    
    // 使用XPath作为后备
    if (this.options.elementSelectorPreference === 'xpath' || this.options.elementSelectorPreference === 'mixed') {
      if (target.selector && target.selectorType === 'xpath') {
        return { selector: target.selector, selectorType: 'xpath' };
      }
    }

    // 如果以上都没有，则返回元素提供的选择器
    return { 
      selector: target.selector || '', 
      selectorType: target.selectorType || 'css' 
    };
  }

  /**
   * 创建点击节点
   */
  private createClickNode(action: RecordAction, x: number, y: number): FlowNode {
    const { selector, selectorType } = this.getBestSelector(action.target);
    
    // 提取更有意义的点击元素描述
    let elementText = action.target?.innerText || '';
    // 截断过长的文本
    elementText = elementText.length > 15 ? elementText.substring(0, 15) + '...' : elementText;
    // 移除多余的空白字符
    elementText = elementText.trim().replace(/\s+/g, ' ');
    
    // 如果没有文本内容，尝试使用元素的其他属性作为描述
    if (!elementText && action.target?.attributes) {
      const attrs = action.target.attributes;
      if (attrs.id) elementText = `#${attrs.id}`;
      else if (attrs.name) elementText = `[${attrs.name}]`;
      else if (attrs.class) elementText = `.${attrs.class.split(' ')[0]}`;
    }
    
    return {
      id: uuidv4(),
      type: 'click',
      x,
      y,
      text: '点击元素',
      properties: {
        name: elementText ? `点击 ${elementText}` : '点击元素',
        nodeType: 'click',
        actionType: 'click',
        mouseActionType: 'moveToElement',
        selector,
        selectorType,
        waitAfterClick: false,
        clickTimeout: 10000
      }
    };
  }

  /**
   * 创建输入节点
   */
  private createInputNode(action: RecordAction, x: number, y: number): FlowNode {
    const { selector, selectorType } = this.getBestSelector(action.target);
    const inputText = action.data?.text || '';
    
    // 更智能地截断输入文本
    const displayText = inputText.length > 10 ? inputText.substring(0, 10) + '...' : inputText;
    
    return {
      id: uuidv4(),
      type: 'input',
      x,
      y,
      text: '输入文本',
      properties: {
        name: `输入 ${displayText}`,
        nodeType: 'input',
        actionType: 'type',
        keyboardActionType: 'type',
        selector,
        selectorType,
        text: inputText,  // 保留完整输入文本作为属性
        clearFirst: true,
        simulateTyping: true,
        typingDelay: 50,
        waitAfterInput: false,
        waitTimeout: 10000
      }
    };
  }

  /**
   * 创建导航节点
   */
  private createNavigateNode(action: RecordAction, x: number, y: number): FlowNode {
    const url = action.data?.url || '';
    
    // 格式化URL，只保留主要部分
    let displayUrl = url;
    try {
      const urlObj = new URL(url);
      // 只保留域名和路径的一部分，移除查询参数
      displayUrl = `${urlObj.hostname}${urlObj.pathname.slice(0, 15)}${urlObj.pathname.length > 15 ? '...' : ''}`;
    } catch (e) {
      // 如果URL解析失败，使用简单的截断
      displayUrl = url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
    
    return {
      id: uuidv4(),
      type: 'browser',
      x,
      y,
      text: '导航至',
      properties: {
        name: `导航至 ${displayUrl}`,
        nodeType: 'browser',
        actionType: 'goto',
        browserActionType: 'goto',
        url,
        waitForLoad: true,
        timeout: 30
      }
    };
  }

  /**
   * 创建滚动节点
   */
  private createScrollNode(action: RecordAction, x: number, y: number): FlowNode {
    const scrollX = action.data?.x || 0;
    const scrollY = action.data?.y || 0;
    
    return {
      id: uuidv4(),
      type: 'scroll',
      x,
      y,
      text: '滚动页面',
      properties: {
        name: '滚动页面',
        nodeType: 'scroll',
        actionType: 'scrollToPosition',
        mouseActionType: 'scrollToPosition',
        x: scrollX,
        y: scrollY,
        smooth: true,
        waitForScroll: true,
        timeout: 30
      }
    };
  }

  /**
   * 创建键盘节点
   */
  private createKeyboardNode(action: RecordAction, x: number, y: number): FlowNode {
    const key = action.data?.key || '';
    const modifiers = action.data?.modifiers || [];
    
    return {
      id: uuidv4(),
      type: 'keyboard',
      x,
      y,
      text: '键盘操作',
      properties: {
        name: `键盘操作 ${modifiers.length > 0 ? modifiers.join('+') + '+' : ''}${key}`,
        nodeType: 'keyboard',
        actionType: modifiers.length > 0 ? 'combination' : 'press',
        keyboardActionType: modifiers.length > 0 ? 'combination' : 'press',
        key,
        modifiers
      }
    };
  }

  /**
   * 创建提取节点
   */
  private createExtractNode(action: RecordAction, x: number, y: number): FlowNode {
    const { selector, selectorType } = this.getBestSelector(action.target);
    
    return {
      id: uuidv4(),
      type: 'extract',
      x,
      y,
      text: '提取数据',
      properties: {
        name: '提取数据',
        nodeType: 'extract',
        actionType: 'extract',
        extractActionType: 'text',
        selector,
        selectorType,
        extractType: 'text',
        variableName: `extractedData_${Date.now()}`,
        waitForVisible: true,
        timeout: 5000
      }
    };
  }

  /**
   * 设置浏览器信息
   */
  public setBrowserInfo(info: { url: string; title: string; userAgent: string }): void {
    this.browserInfo = info;
  }

  /**
   * 添加已捕获的操作
   */
  public addCapturedAction(action: RecordAction): void {
    this.actions.push(action);
  }
} 