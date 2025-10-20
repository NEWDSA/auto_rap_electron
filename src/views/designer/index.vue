<template>
  <div class="flex flex-col h-full">
    <!-- 顶部工具栏 -->
    <div class="p-2 flex items-center space-x-2 bg-[#fafafa] bg-opacity-80 backdrop-blur-sm border-b relative z-10">
      <div class="absolute inset-0 opacity-10 bg-grid"></div>
      <div class="flex relative items-center space-x-4">
        <el-button-group>
          <el-button type="primary" @click="handleSave">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button 
            type="success" 
            :loading="isRunning" 
            @click="handleRun"
            v-if="!isRunning"
          >
            <el-icon><VideoPlay /></el-icon>
            运行
          </el-button>
          <el-button 
            type="danger" 
            @click="handleStop"
            v-else
          >
            <el-icon><VideoPause /></el-icon>
            停止
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />
        
        <!-- 添加智能录制按钮 -->
        <el-button type="primary" @click="showRecorder = true">
          <el-icon><VideoCamera /></el-icon>
          智能录制
        </el-button>
        
        <!-- 添加 AI 助手按钮 -->
        <el-button type="success" @click="showAIAssistant = true">
          <el-icon><Cpu /></el-icon>
          AI 助手
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex relative flex-1">
      <!-- 左侧工具箱 -->
      <div 
        class="left-toolbox"
        :class="{ 'w-48': !toolsPanelCollapsed, 'w-12': toolsPanelCollapsed }"
      >
        <div class="toolbox-header">
          <span v-show="!toolsPanelCollapsed" class="text-sm">组件面板</span>
          <el-button link @click="toolsPanelCollapsed = !toolsPanelCollapsed">
            <el-icon>
              <component :is="toolsPanelCollapsed ? 'ArrowRight' : 'ArrowLeft'" />
            </el-icon>
          </el-button>
        </div>
        
        <div class="toolbox-content" v-show="!toolsPanelCollapsed">
          <div class="p-2">
            <el-collapse v-model="activeCategories">
              <el-collapse-item title="基础组件" name="basic">
                <template #title>
                  <el-icon><Tools /></el-icon>
                  <span>基础组件</span>
                </template>
                <div class="space-y-1">
                  <div
                    v-for="node in basicNodes"
                    :key="node.type"
                    class="p-2 rounded cursor-move component-item hover:bg-gray-100"
                    draggable="true"
                    @dragstart="handleDragStart($event, node)"
                  >
                    <el-icon><component :is="node.icon" /></el-icon>
                    <span class="ml-2">{{ node.name }}</span>
                  </div>
                </div>
              </el-collapse-item>
              
              <el-collapse-item title="控制组件" name="control">
                <template #title>
                  <el-icon><Operation /></el-icon>
                  <span>控制组件</span>
                </template>
                <div class="space-y-1">
                  <div
                    v-for="node in controlNodes"
                    :key="node.type"
                    class="p-2 rounded cursor-move component-item hover:bg-gray-100"
                    draggable="true"
                    @dragstart="handleDragStart($event, node)"
                  >
                    <el-icon><component :is="node.icon" /></el-icon>
                    <span class="ml-2">{{ node.name }}</span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>


          </div>
        </div>
      </div>

      <!-- 中间画布区域 -->
      <div class="flex flex-col flex-1 designer-canvas">
        <div class="relative flex-1" ref="container">
          <div ref="flowContainer" class="w-full h-full canvas-container"></div>
          <!-- 拖拽时的高亮圆点覆盖层 -->
          <div 
            v-if="isDragging"
            ref="dragOverlay"
            class="absolute inset-0 z-10 pointer-events-none"
          >
            <div
              v-for="dot in highlightDots"
              :key="dot.edgeId"
              class="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
              :style="{
                left: dot.x + 'px',
                top: dot.y + 'px'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div 
        v-if="selectedNode"
        class="properties-panel"
        :class="{ 'w-64': !propertiesPanelCollapsed, 'w-0': propertiesPanelCollapsed }"
      >
        <div class="panel-header">
          <span class="text-sm">属性设置</span>
          <el-button link @click="selectedNode = null">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="p-4 panel-content">
          <el-form label-position="top">
            <el-form-item label="节点名称">
              <el-input 
                v-model="selectedNode.properties.name"
                @change="handleNodePropertyChange('name')"
              />
            </el-form-item>

            <component
              v-if="nodeConfigComponent"
              :is="nodeConfigComponent"
              :node="selectedNode"
              @update="handleNodePropertyChange"
            />
          </el-form>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="flex items-center h-8 bg-gray-50 border-t">
      <span class="text-sm text-gray-500">{{ statusText }}</span>
    </div>
  </div>
  
  <!-- 智能录制组件 -->
  <IntelligentRecorder 
    v-model:visible="showRecorder" 
    @generate-flow="handleGenerateFlow"
  />
  
  <!-- AI 助手组件 -->
  <AIAssistant
    v-model="showAIAssistant"
    @generate-flow="handleGenerateFlow"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, computed, markRaw, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import LogicFlow, { 
  NodeModel,
  RectNode,
  RectNodeModel,
  CircleNode,
  CircleNodeModel,
  PolylineEdge,
  PolylineEdgeModel
} from '@logicflow/core'
import { DndPanel, MiniMap, Control, SelectionSelect } from '@logicflow/extension'
import '@logicflow/core/dist/style/index.css'
import '@logicflow/extension/lib/style/index.css'
import { 
  Document, 
  ArrowLeft, 
  ArrowRight, 
  VideoPlay, 
  VideoPause,
  Remove,
  CirclePlus,
  FullScreen,
  CircleClose,
  Close,
  Tools,
  Operation,
  RefreshLeft,
  RefreshRight,
  VideoCamera,
  Cpu,
  Key
} from '@element-plus/icons-vue'
import type { NodeConfigComponent, FlowNode, NodeConfig } from '@/types/node-config'
import type { BaseNodeData, BaseEdgeData } from '@/types/node-config'
import { FlowExecutor } from '@/utils/flow-executor'
import { ElMessage, ElMessageBox } from 'element-plus'
import { systemControl } from '@/services/system-control'

// 导入节点配置组件
import BrowserConfig from '@/components/node-configs/BrowserConfig.vue'
import ClickConfig from '@/components/node-configs/ClickConfig.vue'
import InputConfig from '@/components/node-configs/InputConfig.vue'
import ConditionConfig from '@/components/node-configs/ConditionConfig.vue'
import LoopConfig from '@/components/node-configs/LoopConfig.vue'
import ExtractConfig from '@/components/node-configs/ExtractConfig.vue'
import KeyboardConfig from '@/components/node-configs/KeyboardConfig.vue'
import MouseConfig from '@/components/node-configs/MouseConfig.vue'
import WaitConfig from '@/components/node-configs/WaitConfig.vue'
import ScreenshotConfig from '@/components/node-configs/ScreenshotConfig.vue'
import ScrollConfig from '@/components/node-configs/ScrollConfig.vue'
import ExportConfig from '@/components/node-configs/ExportConfig.vue'
import CaptchaConfig from '@/components/node-configs/CaptchaConfig.vue'
import PowerConfig from '@/components/node-configs/PowerConfig.vue'

// 类型定义
import type { LogicFlowApi, LogicFlowEvents } from '@/types/node-config'

// 导入智能录制组件
import IntelligentRecorder from '@/components/recorder/IntelligentRecorder.vue'
// 导入 AI 助手组件
import AIAssistant from '@/components/ai-assistant/AIAssistant.vue'

// 响应式状态
const flowName = ref('')
const activeCategories = ref(['basic', 'control'])
const selectedNode = ref<FlowNode | null>(null)
const canUndo = ref(false)
const canRedo = ref(false)
const flowContainer = ref<HTMLElement | null>(null)
const minimapContainer = ref<HTMLElement | null>(null)
const lf = ref<InstanceType<typeof LogicFlow> | null>(null)
const toolsPanelCollapsed = ref(false)
const propertiesPanelCollapsed = ref(false)
const isRunning = ref(false)
const statusText = ref('')
const showRecorder = ref(false)
const showAIAssistant = ref(false)
const isDragging = ref(false)
const highlightDots = ref<Array<{x: number, y: number, edgeId: string}>>([])
const dragOverlay = ref<HTMLElement | null>(null)
const customNodeCount = ref(0)

// 流程执行器实例
const flowExecutor = new FlowExecutor()

// 路由对象
const route = useRoute()

const basicNodes: NodeConfig[] = [
  { type: 'start', name: '开始', icon: 'VideoPlay' },
  { type: 'browser', name: '浏览器', icon: 'Monitor' },
  { type: 'click', name: '点击', icon: 'Pointer' },
  { type: 'input', name: '输入', icon: 'EditPen' },
  { type: 'extract', name: '提取', icon: 'Search' },
  { type: 'captcha', name: '验证码识别', icon: 'Key' },
  { type: 'keyboard', name: '键盘', icon: 'EditPen' },
  { type: 'mouse', name: '鼠标', icon: 'Position' },
  { type: 'wait', name: '等待', icon: 'Timer' },
  { type: 'screenshot', name: '截图', icon: 'PictureRounded' },
  { type: 'scroll', name: '滚动', icon: 'DArrowDown' },
  { type: 'export', name: '导出', icon: 'Download' },
  { type: 'power', name: '系统电源', icon: 'SwitchButton' },
  { type: 'end', name: '结束', icon: 'VideoPause' }
]

const controlNodes: NodeConfig[] = [
  { type: 'switch', name: '条件', icon: 'SwitchButton' },
  { type: 'loop', name: '循环', icon: 'RefreshRight' }
]

// 获取节点配置组件
const nodeConfigComponent = computed(() => {
  if (!selectedNode.value) return null

  const componentMap = {
    browser: BrowserConfig,
    click: ClickConfig,
    input: InputConfig,
    switch: ConditionConfig,
    loop: LoopConfig,
    extract: ExtractConfig,
    captcha: CaptchaConfig,
    keyboard: KeyboardConfig,
    mouse: MouseConfig,
    wait: WaitConfig,
    screenshot: ScreenshotConfig,
    scroll: ScrollConfig,
    export: ExportConfig,
    power: PowerConfig
  } as const

  const component = componentMap[selectedNode.value.type as keyof typeof componentMap]
  return component ? markRaw(component) as NodeConfigComponent : null
})

// 添加事件注册方法
const registerEvents = () => {
  if (!lf.value) return

  lf.value.on('element:click', (data: { data: FlowNode }) => {
    selectedNode.value = data.data
  })

  lf.value.on('blank:click', () => {
    selectedNode.value = null
  })

  lf.value.on('history:change', (data: { undoAble: boolean, redoAble: boolean }) => {
    canUndo.value = data.undoAble
    canRedo.value = data.redoAble
    // 不再自动确保初始流程节点
  })

  // 删除节点时保护（右键菜单删除）
  lf.value.on('node:contextmenu', (data) => {
    data.e.preventDefault()
    if (data.data.type === 'start' || data.data.type === 'end') {
      ElMessage.warning('不能删除开始或结束节点')
      return
    }
    ElMessageBox.confirm('确定要删除该节点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      lf.value?.deleteNode(data.data.id)
      customNodeCount.value--
      selectedNode.value = null
      ElMessage.success('节点已删除')
    }).catch(() => {})
  })
}

// 自定义普通节点
class CustomNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data);
    this.width = 180;
    this.height = 40;
    this.radius = 4;
    
    // 设置节点文本
    if (typeof data.text === 'string') {
      this.text.value = data.text;
    } else if (data.properties?.name) {
      const name = data.properties.name;
      this.text.value = name.length > 25 ? name.substring(0, 25) + '...' : name;
    } else {
      this.text.value = '';
    }
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    return {
      ...style,
      fill: '#fff',
      stroke: '#409eff',
      strokeWidth: 2
    };
  }

  getTextStyle() {
    const style = super.getTextStyle();
    return {
      ...style,
      fontSize: 12,
      lineHeight: 1.2,
      overflowMode: 'autoWrap',
      textAlign: 'center',
      textBaseline: 'middle'
    };
  }

  // 允许节点拖拽
  isAllowMove() {
    return true;
  }
}

class CustomNode extends RectNode {
  getShape() {
    const { model } = this.props;
    const { width, height, radius } = model;
    const style = model.getNodeStyle();
    
    return h('rect', {
      ...style,
      width,
      height,
      x: -width / 2,
      y: -height / 2,
      rx: radius,
      ry: radius
    });
  }
}

// 初始化流程 - 已移除自动创建节点逻辑
// 现在所有节点都需要用户手动拖拽添加

// 注册节点
const registerNodes = () => {
  if (!lf.value) return;

  try {
    console.log('开始注册节点...');
    
    // 注册开始节点
    lf.value.register({
      type: 'start',
      view: RectNode,
      model: class StartNodeModel extends RectNodeModel {
        initNodeData(data: any) {
          super.initNodeData(data);
          this.width = 80;
          this.height = 40;
          this.radius = 20;
        }

        getNodeStyle() {
          const style = super.getNodeStyle();
          return {
            ...style,
            fill: '#e1f3d8',
            stroke: '#67c23a',
            strokeWidth: 2
          };
        }

        // 允许节点拖拽
        isAllowMove() {
          return true;
        }
      }
    });

    // 注册结束节点
    lf.value.register({
      type: 'end',
      view: RectNode,
      model: class EndNodeModel extends RectNodeModel {
        initNodeData(data: any) {
          super.initNodeData(data);
          this.width = 80;
          this.height = 40;
          this.radius = 20;
        }

        getNodeStyle() {
          const style = super.getNodeStyle();
          return {
            ...style,
            fill: '#fde2e2',
            stroke: '#f56c6c',
            strokeWidth: 2
          };
        }

        // 允许节点拖拽
        isAllowMove() {
          return true;
        }
      }
    });

    // 注册其他节点
    const registerNodeConfig = (node: NodeConfig) => {
      // 跳过已注册的开始和结束节点
      if (node.type === 'start' || node.type === 'end') return;
      
      try {
        lf.value?.register({
          type: node.type,
          view: RectNode,
          model: class extends RectNodeModel {
            initNodeData(data: any) {
              super.initNodeData(data);
              this.width = 120;
              this.height = 40;
              this.radius = 4;
              
              // 设置节点文本
              if (typeof data.text === 'string') {
                this.text.value = data.text;
              } else if (data.properties?.name) {
                this.text.value = data.properties.name;
              } else {
                this.text.value = '';
              }

              // 初始化浏览器节点的默认属性
              if (node.type === 'browser' && !data.properties) {
                data.properties = {
                  actionType: 'goto',
                  waitForLoad: true,
                  timeout: 30,
                  headless: false,
                  incognito: false,
                  width: 1280,
                  height: 800
                };
              }
              
              // 初始化验证码节点的默认属性
              if (node.type === 'captcha' && !data.properties) {
                data.properties = {
                  provider: 'dama2',
                  apiKey: '',
                  captchaType: 'normal',
                  source: 'screenshot',
                  selector: '',
                  variableName: 'captcha_result',
                  autoInput: false,
                  timeout: 30,
                  retryCount: 3,
                  onFailure: 'stop'
                };
              }
            }

            getNodeStyle() {
              const style = super.getNodeStyle();
              return {
                ...style,
                fill: '#fff',
                stroke: '#409eff',
                strokeWidth: 2
              };
            }

            // 允许节点拖拽
            isAllowMove() {
              return true;
            }
          }
        });
        console.log(`注册节点完成: ${node.type}`);
      } catch (error) {
        console.error(`注册节点失败: ${node.type}`, error);
      }
    };

    // 注册所有基础节点
    basicNodes.forEach(registerNodeConfig);
    // 注册所有控制节点
    controlNodes.forEach(registerNodeConfig);
  } catch (error) {
    console.error('注册节点失败:', error);
  }
};

// 初始化 LogicFlow
const initLogicFlow = async () => {
  if (!flowContainer.value) return;

  try {
    const logicFlow = new LogicFlow({
      container: flowContainer.value,
      grid: true,
      plugins: [DndPanel, MiniMap, Control, SelectionSelect],
      nodeTextEdit: false,
      edgeTextEdit: false,
      nodeTextDraggable: false,
      edgeTextDraggable: false,
      adjustNodePosition: false,
      snapline: true,
      allowMoveNode: true,
      allowMoveEdge: true,
      allowReconnect: true,
      allowAppendTo: true,
      edgeType: 'polyline', // 使用折线边，更适合垂直布局
      overlapMode: 1, // 边的重叠模式
      keyboard: {
        enabled: true
      },
      adjustEdge: true, // 允许调整边
      style: {
        rect: {
          radius: 5,
          strokeWidth: 2,
        },
        nodeText: {
          fontSize: 12,
          color: '#333',
          overflowMode: 'autoWrap',
          lineHeight: 1.2,
          padding: 5,
          maxWidth: 170, // 限制最大宽度
        },
        edgeText: {
          fontSize: 12,
          color: '#666',
          background: {
            fill: '#fff'
          }
        },
        edge: {
          type: 'polyline',
          stroke: '#666',
          strokeWidth: 2,
          hoverStroke: '#1890ff',
          selectedStroke: '#1890ff',
          outlineColor: '#fff',
          outlineStroke: 3,
          edgeAnimation: true,
          adjustLineDistance: true,
          draginLimit: true,
          allowReconnect: true,
          allowAppendTo: true
        }
      }
    });

    lf.value = logicFlow;

    // 注册折线边类型，适合垂直布局
    lf.value.register({
      type: 'polyline',
      view: PolylineEdge,
      model: class CustomPolylineEdgeModel extends PolylineEdgeModel {
        initEdgeData(data: any) {
          super.initEdgeData(data);
          this.strokeWidth = 2;
        }

        getEdgeStyle() {
          const style = super.getEdgeStyle();
          return {
            ...style,
            strokeWidth: 2,
            stroke: '#666',
            strokeDasharray: '',
            hoverStroke: '#1890ff',
            selectedStroke: '#1890ff'
          };
        }
        
        // 配置垂直布局的折线点
        getEdgePointPath() {
          const { startPoint, endPoint } = this;
          const points = [];
          
          // 起点
          points.push(`${startPoint.x},${startPoint.y}`);
          
          // 中间点 - 垂直布局
          const midY = (startPoint.y + endPoint.y) / 2;
          points.push(`${startPoint.x},${midY}`);
          points.push(`${endPoint.x},${midY}`);
          
          // 终点
          points.push(`${endPoint.x},${endPoint.y}`);
          
          return points;
        }

        setProperties(properties: any) {
          super.setProperties(properties);
          if (properties.strokeWidth !== undefined) {
            this.strokeWidth = properties.strokeWidth;
          }
        }

        // 启用边的拖拽和修改
        isAllowMoveEdge() {
          return true;
        }
        
        // 允许调整边的锦点
        isAllowAdjustStartAndEnd() {
          return true;
        }

        isAllowAppendTo() {
          return true;
        }

        isAllowConnected() {
          return true;
        }

        isAllowMove() {
          return true;
        }

        updateStartPoint(point: { x: number; y: number }) {
          super.updateStartPoint(point);
          this.initEdgeData(this);
        }

        updateEndPoint(point: { x: number; y: number }) {
          super.updateEndPoint(point);
          this.initEdgeData(this);
        }
      }
    });

    // 注册节点
    registerNodes();
    
    // 设置默认边类型为 polyline
    lf.value.setDefaultEdgeType('polyline');
    
    // 启用手动连接模式
    // 允许从节点的锦点拖拽出连接线
    lf.value.on('anchor:dragstart', ({ data, nodeModel }) => {
      console.log('开始拖拽连接线', data);
    });
    
    lf.value.on('anchor:drop', ({ data, nodeModel }) => {
      console.log('放下连接线', data);
    });

    // 事件监听
    registerEvents();

    // 初始化小地图
    if (minimapContainer.value) {
      lf.value.extension.miniMap.init({
        container: minimapContainer.value,
        width: 192,
        height: 128
      });
    }

    // 渲染
    await nextTick();
    lf.value.render();

    // 初始化时创建开始和结束节点
    ensureInitialFlow()
  } catch (error) {
    console.error('初始化 LogicFlow 失败:', error);
  }
};

// 拖拽开始
const handleDragStart = (event: DragEvent, node: NodeConfig) => {
  if (!event.dataTransfer) return
  console.log(node,'...handleDragStart...');
  event.dataTransfer.setData('application/json', JSON.stringify(node))
  isDragging.value = true
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  
  if (!isDragging.value || !flowContainer.value) return

  const rect = flowContainer.value.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const offsetY = event.clientY - rect.top

  // 更新高亮圆点位置
  updateHighlightDots(offsetX, offsetY)
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  highlightDots.value = []
  
  if (!event.dataTransfer || !lf.value) {
    return
  }

  const data = event.dataTransfer.getData('application/json')
  if (!data) {
    return
  }

  const dragNode = JSON.parse(data)
  const { clientX, clientY } = event
  // 获取容器的位置信息
  const rect = flowContainer.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  // 计算相对于容器的坐标
  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top

  // 获取鼠标位置下的节点
  const point = {
    x: offsetX,
    y: offsetY
  }

  // 获取图数据
  const graphData = lf.value.getGraphData()
  const nodes = graphData.nodes || []
  const edges = graphData.edges || []

  // 检查是否在节点上
  let targetNode = null
  for (const node of nodes) {
    const { x, y, width = 120, height = 40 } = node
    // 检查点是否在节点范围内
    if (
      point.x >= x - width / 2 &&
      point.x <= x + width / 2 &&
      point.y >= y - height / 2 &&
      point.y <= y + height / 2
    ) {
      targetNode = node
      break
    }
  }

  // 创建节点数据
  const nodeConfig = {
    type: dragNode.type,
    x: offsetX,
    y: offsetY,
    text: dragNode.name || '',
    properties: {
      name: dragNode.name,
      nodeType: dragNode.type,
      parentId: undefined,
      // 浏览器节点的默认属性
      ...(dragNode.type === 'browser' ? {
        actionType: 'goto',
        waitForLoad: true,
        timeout: 30,
        headless: false,
        incognito: false,
        width: 1280,
        height: 800
      } : {})
    }
  }

  // 如果目标是循环节点
  if (targetNode && targetNode.type === 'loop') {
    // 设置父节点ID
    nodeConfig.properties.parentId = targetNode.id

    // 获取当前循环节点的子节点数量
    const childCount = nodes.filter(n => n.properties.parentId === targetNode.id).length

    // 调整新节点的位置 - 竖向排列
    nodeConfig.x = 400 // 固定X坐标
    nodeConfig.y = targetNode.y + 100 + childCount * 150 // 进一步增大间距

    // 添加新节点
    const newNode = lf.value.addNode(nodeConfig)
    // 不再自动创建连接，用户需要手动连接

    return
  }

  // 检查是否在连接线上
  let targetEdge = null
  const highlightedEdgeId = getHighlightedEdgeId(offsetX, offsetY)
  if (highlightedEdgeId) {
    targetEdge = edges.find(edge => edge.id === highlightedEdgeId) || null
  }

  // 如果在连接线上，将节点放在鼠标位置的投影点
  if (targetEdge) {
    const sourceNode = nodes.find(n => n.id === targetEdge.sourceNodeId)
    const targetNode = nodes.find(n => n.id === targetEdge.targetNodeId)
    
    if (sourceNode && targetNode) {
      // 计算鼠标在连接线上的投影点
      const projectionPoint = getProjectionPointOnLine(
        offsetX,
        offsetY,
        sourceNode.x,
        sourceNode.y,
        targetNode.x,
        targetNode.y
      )
      nodeConfig.x = projectionPoint.x
      nodeConfig.y = projectionPoint.y
    }
  }

  // 添加节点
  const newNode = lf.value.addNode(nodeConfig)
  if (nodeConfig.type !== 'start' && nodeConfig.type !== 'end') {
    customNodeCount.value++
  }
  
  // 自动延伸连接线：将新节点插入到开始和结束节点之间
  // 重新获取最新的图数据
  const latestGraphData = lf.value.getGraphData()
  const latestNodes = latestGraphData.nodes || []
  const latestEdges = latestGraphData.edges || []
  const startNode2 = latestNodes.find((n: any) => n.type === 'start')
  const endNode2 = latestNodes.find((n: any) => n.type === 'end')
  
  if (startNode2 && endNode2 && newNode.id !== startNode2.id && newNode.id !== endNode2.id) {
    // 计算中间节点的数量（不包括开始、结束和新添加的节点）
    const middleNodes = latestNodes.filter((n: any) => 
      n.type !== 'start' && 
      n.type !== 'end' && 
      n.id !== newNode.id
    )
    
    // 根据节点数量自动调整位置
    const nodeSpacing = 100 // 节点之间的间距
    const startY = startNode2.y
    
    // 将新节点放置在合适的位置
    const newNodeY = startY + (middleNodes.length + 1) * nodeSpacing
    // 更新节点模型的位置（包括文本）
    const nodeModel = lf.value.getNodeModelById(newNode.id)
    if (nodeModel) {
      nodeModel.x = startNode2.x
      nodeModel.y = newNodeY
      // 更新文本位置
      if (nodeModel.text) {
        nodeModel.text.x = startNode2.x
        nodeModel.text.y = newNodeY
      }
    }
    
    // 移动结束节点到更下方
    const endNodeY = startY + (middleNodes.length + 2) * nodeSpacing
    const endNodeModel = lf.value.getNodeModelById(endNode2.id)
    if (endNodeModel) {
      endNodeModel.x = startNode2.x
      endNodeModel.y = endNodeY
      // 更新文本位置
      if (endNodeModel.text) {
        endNodeModel.text.x = startNode2.x
        endNodeModel.text.y = endNodeY
      }
    }
    
    // 查找开始到结束的直接连接
    const directEdge = latestEdges.find((e: any) => 
      e.sourceNodeId === startNode2.id && e.targetNodeId === endNode2.id
    )
    
    if (directEdge) {
      // 删除直接连接
      lf.value.deleteEdge(directEdge.id)
      
      // 创建新的连接：start -> newNode -> end
      lf.value.addEdge({
        type: 'polyline',
        sourceNodeId: startNode2.id,
        targetNodeId: newNode.id,
        properties: {}
      })
      
      lf.value.addEdge({
        type: 'polyline',
        sourceNodeId: newNode.id,
        targetNodeId: endNode2.id,
        properties: {}
      })
    } else {
      // 如果没有直接连接，找到链的末端并连接
      const toEndEdges = latestEdges.filter((e: any) => e.targetNodeId === endNode2.id)
      if (toEndEdges.length > 0) {
        // 删除原来到结束节点的边
        lf.value.deleteEdge(toEndEdges[0].id)
        const lastNodeId = toEndEdges[0].sourceNodeId
        
        // 连接 lastNode -> newNode -> end
        lf.value.addEdge({
          type: 'polyline',
          sourceNodeId: lastNodeId,
          targetNodeId: newNode.id,
          properties: {}
        })
        
        lf.value.addEdge({
          type: 'polyline',
          sourceNodeId: newNode.id,
          targetNodeId: endNode2.id,
          properties: {}
        })
      }
    }
  }

}

// 计算鼠标在连接线上的投影点
const getProjectionPointOnLine = (
  mouseX: number,
  mouseY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const A = mouseX - x1
  const B = mouseY - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  // 限制投影点在线段范围内
  param = Math.max(0, Math.min(1, param))
  
  const projX = x1 + param * C
  const projY = y1 + param * D
  
  return { x: projX, y: projY }
}

// 更新高亮圆点位置
const updateHighlightDots = (offsetX: number, offsetY: number) => {
  if (!lf.value) return

  const graphData = lf.value.getGraphData()
  const nodes = graphData.nodes || []
  const edges = graphData.edges || []
  const dots: Array<{x: number, y: number, edgeId: string}> = []

  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId)
    const targetNode = nodes.find(n => n.id === edge.targetNodeId)
    if (!sourceNode || !targetNode) continue

    // 计算点到连接线的距离
    const distance = pointToLineDistance(
      offsetX,
      offsetY,
      sourceNode.x,
      sourceNode.y,
      targetNode.x,
      targetNode.y
    )

    // 如果距离小于25px，在鼠标位置的投影点显示圆点
    if (distance < 25) {
      const projectionPoint = getProjectionPointOnLine(
        offsetX,
        offsetY,
        sourceNode.x,
        sourceNode.y,
        targetNode.x,
        targetNode.y
      )
      
      dots.push({
        x: projectionPoint.x,
        y: projectionPoint.y,
        edgeId: edge.id
      })
    }
  }

  highlightDots.value = dots
}

// 获取当前高亮的连接线ID
const getHighlightedEdgeId = (offsetX: number, offsetY: number): string | null => {
  if (!lf.value) return null

  const graphData = lf.value.getGraphData()
  const nodes = graphData.nodes || []
  const edges = graphData.edges || []

  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId)
    const targetNode = nodes.find(n => n.id === edge.targetNodeId)
    if (!sourceNode || !targetNode) continue

    // 计算点到连接线的距离
    const distance = pointToLineDistance(
      offsetX,
      offsetY,
      sourceNode.x,
      sourceNode.y,
      targetNode.x,
      targetNode.y
    )

    // 如果距离小于25px，认为鼠标在连接线上
    if (distance < 25) {
      return edge.id
    }
  }

  return null
}

// 计算点到线段的距离
const pointToLineDistance = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = x - xx
  const dy = y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

// 更新节点名称
const updateNodeName = () => {
  if (!lf.value || !selectedNode.value) return
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })
}

// 更新节点属性
const handleNodePropertyChange = (key: string) => {
  console.log(key,'...内容变更...')
  console.log(selectedNode.value.properties,'..rrrr...')
  if (!lf.value || !selectedNode.value) return
  
  // 更新节点属性
  lf.value.setProperties(selectedNode.value.id, {
    ...selectedNode.value.properties
  })

  // 如果是名称变更，同时更新节点文本
  if (key === 'name') {
    lf.value.updateText(selectedNode.value.id, selectedNode.value.properties.name)
  }
}

// 撤销
const handleUndo = () => {
  if (!lf.value) return
  if (customNodeCount.value > 0) {
    const graphData = lf.value.getGraphData()
    const nodes = graphData.nodes || []
    const lastCustomNode = [...nodes].reverse().find(n => n.type !== 'start' && n.type !== 'end')
    if (lastCustomNode) {
      lf.value.deleteNode(lastCustomNode.id)
      customNodeCount.value--
    }
  }
  // customNodeCount为0时，不做任何操作
}

// 重做
const handleRedo = () => {
  if (!lf.value) return
  lf.value.redo()
  // 不再自动确保初始流程节点
}

// 检查两个节点之间是否有路径
const checkPath = (startId: string, endId: string, edges: any[]): boolean => {
  const visited = new Set<string>()
  const queue = [startId]
  
  while (queue.length > 0) {
    const currentId = queue.shift()!
    
    if (currentId === endId) {
      return true
    }
    
    if (visited.has(currentId)) {
      continue
    }
    
    visited.add(currentId)
    
    // 找到所有从当前节点出发的边
    const outgoingEdges = edges.filter((e: any) => e.sourceNodeId === currentId)
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.targetNodeId)) {
        queue.push(edge.targetNodeId)
      }
    }
  }
  
  return false
}

// 保证画布上始终有开始节点、结束节点和它们之间的连接线
const ensureInitialFlow = () => {
  if (!lf.value) return
  const graphData = lf.value.getGraphData()
  let nodes = graphData.nodes || []
  let edges = graphData.edges || []

  // 查找开始节点和结束节点
  let startNode = nodes.find((n: any) => n.type === 'start')
  let endNode = nodes.find((n: any) => n.type === 'end')

  // 如果没有开始节点，添加一个
  if (!startNode) {
    startNode = lf.value.addNode({
      type: 'start',
      x: 400,
      y: 150,
      text: '开始',
      properties: { 
        nodeType: 'start',
        name: '开始'
      }
    })
  }
  
  // 如果没有结束节点，添加一个
  if (!endNode) {
    endNode = lf.value.addNode({
      type: 'end',
      x: 400,
      y: 250,
      text: '结束',
      properties: { 
        nodeType: 'end',
        name: '结束'
      }
    })
  }

  // 确保开始和结束节点之间有连接线
  const hasDirectEdge = edges.some((e: any) => 
    e.sourceNodeId === startNode.id && e.targetNodeId === endNode.id
  )
  
  if (!hasDirectEdge && startNode && endNode) {
    lf.value.addEdge({
      type: 'polyline',
      sourceNodeId: startNode.id,
      targetNodeId: endNode.id,
      properties: {}
    })
  }
}

// 保存流程
const handleSave = async () => {
  if (!lf.value) return
  
  try {
    // 获取流程数据
    const data = lf.value.getGraphData()
    
    // 如果没有流程名称，提示用户输入
    if (!flowName.value) {
      const { value } = await ElMessageBox.prompt('请输入流程名称', '保存流程', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValidator: (value) => !!value.trim(),
        inputErrorMessage: '流程名称不能为空'
      })
      flowName.value = value
    }
    
    // 保存到数据库
    const result = await window.electronAPI.invoke('save-configuration', flowName.value, JSON.stringify(data))
    
    if (result && result.success) {
      ElMessage.success('保存成功')
    } else {
      throw new Error(result?.error || '保存失败')
    }
  } catch (error: any) {
    if (error.message !== 'cancel') {
      ElMessage.error(`保存失败: ${error.message}`)
    }
  }
}

// 运行流程
const handleRun = async () => {
  if (!lf.value) return
  
  try {
    // 检查许可证是否允许执行任务 - 暂时注释掉
    // const { licenseService } = await import('@/services/license-service')
    // const canExecute = licenseService.canExecuteTask()
    
    // if (!canExecute.allowed) {
    //   ElMessage.error(canExecute.message || '无法运行流程')
    //   return
    // }
    
    const data = lf.value.getGraphData()
    
    // 检查节点数量限制 - 暂时注释掉
    // const nodeCount = data.nodes.length
    // const canUseNodes = licenseService.canUseNodes(nodeCount)
    
    // if (!canUseNodes.allowed) {
    //   ElMessage.error(canUseNodes.message || '节点数量超出限制')
    //   return
    // }
    
    await flowExecutor.start(data.nodes)
    
    // 记录任务执行 - 暂时注释掉
    // licenseService.recordExecution()
  } catch (error: any) {
    ElMessage.error(`运行出错: ${error.message}`)
  }
}

// 停止流程
const handleStop = async () => {
  await flowExecutor.stop()
}

// 系统电源控制快捷方法（与设置页保持一致的确认交互）
const doPowerAction = async (fn: () => Promise<{ success: boolean; error?: string }>, confirmText: string) => {
  try {
    await ElMessageBox.confirm(confirmText, '请确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  const res = await fn()
  if (!res.success) {
    ElMessage.error(res.error || '操作失败')
  }
}

const confirmShutdown = (force: boolean) => doPowerAction(() => systemControl.shutdown(force), `确定要${force ? '强制' : ''}关机吗？`)
const confirmRestart = (force: boolean) => doPowerAction(() => systemControl.restart(force), `确定要${force ? '强制' : ''}重启吗？`)
const lockScreen = () => doPowerAction(() => systemControl.lock(), '确定要锁定屏幕吗？')
const sleep = () => doPowerAction(() => systemControl.sleep(), '确定要让电脑进入睡眠吗？')

// 视图控制方法
const handleZoomIn = () => {
  if (!lf.value) return
  const zoomInfo = lf.value.getTransform()
  lf.value.setTransform({ ...zoomInfo, scale: zoomInfo.scale * 1.1 })
}

const handleZoomOut = () => {
  if (!lf.value) return
  const zoomInfo = lf.value.getTransform()
  lf.value.setTransform({ ...zoomInfo, scale: zoomInfo.scale * 0.9 })
}

const handleFitView = () => {
  if (!lf.value) return
  lf.value.resetTransform()
  lf.value.focusOn()
}

// 生命周期钩子
onMounted(async () => {
  await nextTick();
  await initLogicFlow();
  
  // 检查是否有任务ID参数，如果有则加载该任务
  const taskId = route.query.id
  if (taskId) {
    await loadFlowFromDatabase(Number(taskId))
  }
  
  if (flowContainer.value) {
    flowContainer.value.addEventListener('dragover', handleDragOver)
    flowContainer.value.addEventListener('drop', handleDrop)
  }
});

onUnmounted(() => {
  // 清理状态
  isDragging.value = false
  highlightDots.value = []
  
  if (lf.value) {
    // lf.value.destroy();
  }
  if (flowContainer.value) {
    flowContainer.value.removeEventListener('dragover', handleDragOver)
    flowContainer.value.removeEventListener('drop', handleDrop)
  }
});

// 处理流程生成
const handleGenerateFlow = (nodes: any[]) => {
  if (!lf.value) {
    console.error('LogicFlow实例未初始化，无法生成流程');
    ElMessage.error('设计器未准备好，请刷新页面重试');
    return;
  }
  
  try {
    console.log('设计器收到节点数据，节点数:', nodes.length);
    
    // 清空当前画布 - 使用正确的API
    if (typeof lf.value.clearData !== 'function') {
      console.log('使用替代方法清空画布');
      const graphData = lf.value.getGraphData();
      // 删除所有节点
      if (graphData.nodes) {
        graphData.nodes.forEach((node: any) => {
          lf.value?.deleteNode(node.id);
        });
      }
    } else {
      lf.value.clearData();
    }
    
    // 添加所有节点
    for (const node of nodes) {
      console.log('添加节点:', node.type, node.id);
      lf.value.addNode(node);
    }
    
    // 创建连接线 - 按顺序连接所有节点
    for (let i = 0; i < nodes.length - 1; i++) {
      lf.value.addEdge({
        type: 'polyline',
        sourceNodeId: nodes[i].id,
        targetNodeId: nodes[i + 1].id,
        properties: {}
      });
    }
    
    // 自动适应视图 - 使用正确的API
    if (typeof lf.value.fitView !== 'function') {
      console.log('使用替代方法适应视图');
      lf.value.resetTransform && lf.value.resetTransform();
      lf.value.focusOn && lf.value.focusOn();
    } else {
      lf.value.fitView();
    }
    
    ElMessage.success('智能录制流程已生成');
  } catch (error) {
    console.error('生成流程失败:', error);
    ElMessage.error(`生成流程失败: ${(error as Error).message}`);
  }
}

// 从数据库加载流程
const loadFlowFromDatabase = async (id: number) => {
  if (!lf.value) return
  
  try {
    statusText.value = '正在加载流程...'
    
    // 从数据库获取流程配置
    const result = await window.electronAPI.invoke('get-configuration', id)
    
    if (result && result.success && result.data) {
      // 设置流程名称
      flowName.value = result.data.name
      
      // 解析流程数据
      const flowData = JSON.parse(result.data.content)
      
      // 清空当前画布 - 使用正确的API
      if (typeof lf.value.clearData !== 'function') {
        console.log('使用替代方法清空画布');
        const graphData = lf.value.getGraphData();
        // 删除所有节点
        if (graphData.nodes) {
          graphData.nodes.forEach((node: any) => {
            lf.value?.deleteNode(node.id);
          });
        }
      } else {
        lf.value.clearData()
      }
      
      // 加载流程数据
      if (typeof lf.value.render === 'function') {
        lf.value.render(flowData)
      } else {
        console.error('无法加载流程数据：LogicFlow实例缺少render方法');
        throw new Error('无法加载流程数据');
      }
      
      statusText.value = `已加载流程: ${flowName.value}`
      ElMessage.success('流程加载成功')
    } else {
      throw new Error(result?.error || '加载失败')
    }
  } catch (error: any) {
    statusText.value = '加载流程失败'
    ElMessage.error(`加载流程失败: ${error.message}`)
  }
}

// 拦截批量删除和快捷键删除
if (lf.value) {
  lf.value.on('delete:node', (data: { nodes: any[] }) => {
    // 过滤掉开始、结束节点
    data.nodes = data.nodes.filter(n => n.type !== 'start' && n.type !== 'end')
    if (data.nodes.length > 0) {
      customNodeCount.value -= data.nodes.length
    }
    if (data.nodes.length === 0) {
      ElMessage.warning('开始节点和结束节点不能删除')
    }
  })
  lf.value.on('delete:edge', (data: { edges: any[] }) => {
    // 允许删除连接线，但删除后检查是否需要重新连接开始和结束节点
    setTimeout(() => {
      if (!lf.value) return
      const graphData = lf.value.getGraphData()
      const nodes = graphData.nodes || []
      const edges = graphData.edges || []
      const startNode = nodes.find((n: any) => n.type === 'start')
      const endNode = nodes.find((n: any) => n.type === 'end')
      
      // 如果开始和结束节点都存在，但它们之间没有任何路径，则添加直接连接
      if (startNode && endNode) {
        const hasPath = checkPath(startNode.id, endNode.id, edges)
        if (!hasPath) {
          lf.value.addEdge({
            type: 'polyline',
            sourceNodeId: startNode.id,
            targetNodeId: endNode.id,
            properties: {}
          })
        }
      }
    }, 100)
  })
}
</script>

<style lang="postcss" scoped>
.designer-container {
  @apply h-full flex flex-col;
  --header-height: 64px;
  --footer-height: 32px;
  --toolbar-height: 44px;
}

.component-item {
  @apply flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors;
}

.custom-node {
  @apply flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700;
}

:deep(.lf-element-selected) .custom-node {
  @apply ring-2 ring-blue-500;
}

:deep(.el-collapse) {
  @apply border-0;
}

:deep(.el-collapse-item__header) {
  @apply bg-transparent border-0 font-medium;
}

:deep(.el-collapse-item__content) {
  @apply p-0 border-0;
}

.bg-grid {
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 24px 24px;
}

/* 左侧工具箱 */
.left-toolbox {
  @apply border-r bg-white flex flex-col transition-all duration-300;
  height: calc(100vh - var(--header-height) - var(--toolbar-height) - var(--footer-height));

  .toolbox-header {
    @apply p-2 border-b flex items-center justify-between;
    height: 40px;
  }

  .toolbox-content {
    @apply flex-1 overflow-y-auto;
    height: calc(100% - 40px);
  }
}

/* 右侧属性面板 */
.properties-panel {
  @apply border-l bg-white flex flex-col;
  height: calc(100vh - var(--header-height) - var(--toolbar-height) - var(--footer-height));
  transition: width 0.3s ease-in-out;

  .panel-header {
    @apply p-2 border-b flex items-center justify-between;
    height: 40px;
  }

  .panel-content {
    @apply flex-1 overflow-y-auto;
    height: calc(100% - 40px);
  }
}

/* 中间画布区域 */
.designer-canvas {
  @apply flex-1 relative;
  height: calc(100vh - var(--header-height) - var(--toolbar-height) - var(--footer-height));
  
  .canvas-container {
    @apply w-full h-full;
  }
}

/* 底部状态栏样式 */
.status-bar {
  @apply h-8 border-t flex items-center bg-gray-50;
  
  .status-text {
    @apply text-sm text-gray-500;
  }
}
</style>
