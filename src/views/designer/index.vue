<template>
  <div class="h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="p-2 flex items-center space-x-2 bg-[#fafafa] bg-opacity-80 backdrop-blur-sm border-b relative z-10">
      <div class="absolute inset-0 bg-grid opacity-10"></div>
      <div class="flex items-center space-x-4 relative">
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

        <el-button-group>
          <el-button 
            :type="isRecording ? 'danger' : 'primary'"
            @click="toggleRecording"
          >
            <el-icon>
              <component :is="isRecording ? 'VideoPause' : 'VideoPlay'" />
            </el-icon>
            {{ isRecording ? '停止录制' : '开始录制' }}
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex-1 flex relative">
      <!-- 左侧工具箱 -->
      <div 
        class="left-toolbox"
        :class="{ 'w-48': !toolsPanelCollapsed, 'w-12': toolsPanelCollapsed }"
      >
        <div class="toolbox-header">
          <span v-show="!toolsPanelCollapsed" class="text-sm">组件面板</span>
          <el-button type="text" @click="toolsPanelCollapsed = !toolsPanelCollapsed">
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
                    class="component-item p-2 rounded cursor-move hover:bg-gray-100"
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
                    class="component-item p-2 rounded cursor-move hover:bg-gray-100"
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
      <div class="flex-1 flex flex-col designer-canvas">
        <div class="flex-1 relative" ref="container">
          <div ref="flowContainer" class="w-full h-full canvas-container"></div>
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
          <el-button type="text" @click="selectedNode = null">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="panel-content p-4">
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

    <!-- 录制预览对话框 -->
    <el-dialog
      v-model="showRecordPreview"
      title="录制结果预览"
      width="80%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="space-y-4">
        <div class="text-sm text-gray-500">
          共录制 {{ recordedActions.length }} 个动作
        </div>

        <el-table :data="recordedActions" style="width: 100%">
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getActionTypeTag(row.type)">
                {{ getActionTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="selector" label="选择器" width="200">
            <template #default="{ row }">
              <span v-if="row.selector">{{ row.selector }}</span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="value" label="值" width="200">
            <template #default="{ row }">
              <span v-if="row.value">{{ row.value }}</span>
              <span v-else-if="row.x !== undefined && row.y !== undefined">
                x: {{ row.x }}, y: {{ row.y }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRecordPreview = false">取消</el-button>
          <el-button type="primary" @click="generateWorkflow">
            生成工作流
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 底部状态栏 -->
    <div class="h-8 border-t flex items-center bg-gray-50">
      <span class="text-sm text-gray-500">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, computed, markRaw, nextTick } from 'vue'
import LogicFlow, { 
  NodeModel,
  RectNode,
  RectNodeModel,
  CircleNode,
  CircleNodeModel,
  BezierEdge,
  BezierEdgeModel
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
  Back,
  Right,
  Monitor,
  Pointer,
  EditPen,
  Search,
  Position,
  Timer,
  PictureRounded,
  ArrowDown,
  Download,
  SwitchButton,
  Setting,
  Refresh,
  CloseBold
} from '@element-plus/icons-vue'
import type { NodeConfigComponent, FlowNode, NodeConfig } from '@/types/node-config'
import type { BaseNodeData, BaseEdgeData } from '@/types/node-config'
import { FlowExecutor } from '@/utils/flow-executor'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RecorderService, type RecordedAction } from '@/services/RecorderService'
import dayjs from 'dayjs'

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

// 类型定义
import type { LogicFlowApi, LogicFlowEvents } from '@/types/node-config'

// 响应式状态
const flowName = ref('')
const activeCategories = ref(['basic', 'control'])
const selectedNode = ref<FlowNode | null>(null)
const canUndo = ref(false)
const canRedo = ref(false)
const flowContainer = ref<HTMLElement | null>(null)
const minimapContainer = ref<HTMLElement | null>(null)
const lf = ref<LogicFlow | null>(null)
const toolsPanelCollapsed = ref(false)
const propertiesPanelCollapsed = ref(false)
const isRunning = ref(false)
const statusText = ref('')

// 录制相关状态
const isRecording = ref(false)
const recordedActions = ref<RecordedAction[]>([])
const showRecordPreview = ref(false)
const recorder = RecorderService.getInstance()

const basicNodes: NodeConfig[] = [
  { type: 'start', name: '开始', icon: 'VideoPlay' },
  { type: 'browser', name: '浏览器', icon: 'Monitor' },
  { type: 'click', name: '点击', icon: 'Pointer' },
  { type: 'input', name: '输入', icon: 'EditPen' },
  { type: 'extract', name: '提取', icon: 'Search' },
  { type: 'keyboard', name: '键盘', icon: 'EditPen' },
  { type: 'mouse', name: '鼠标', icon: 'Position' },
  { type: 'wait', name: '等待', icon: 'Timer' },
  { type: 'screenshot', name: '截图', icon: 'PictureRounded' },
  { type: 'scroll', name: '滚动', icon: 'ArrowDown' },
  { type: 'export', name: '导出', icon: 'Download' },
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
    keyboard: KeyboardConfig,
    mouse: MouseConfig,
    wait: WaitConfig,
    screenshot: ScreenshotConfig,
    scroll: ScrollConfig,
    export: ExportConfig
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
  })

  // 添加节点右键菜单事件
  lf.value.on('node:contextmenu', (data: { data: FlowNode, e: MouseEvent }) => {
    // 阻止默认右键菜单
    data.e.preventDefault()
    
    // 如果是开始或结束节点，不允许删除
    if (data.data.type === 'start' || data.data.type === 'end') {
      ElMessage.warning('开始和结束节点不能删除')
      return
    }

    // 显示确认对话框
    ElMessageBox.confirm('确定要删除该节点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      // 删除节点
      lf.value?.deleteNode(data.data.id)
      selectedNode.value = null
      ElMessage.success('节点已删除')
    }).catch(() => {
      // 取消删除
    })
  })
}

// 自定义普通节点
class CustomNodeModel extends RectNodeModel {
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

// 初始化流程
const initializeFlow = () => {
  if (!lf.value) return;

  try {
    console.log('开始初始化流程...');
    
    // 创建开始节点
    const startNode = lf.value.addNode({
      type: 'start',
      x: 200,
      y: 200,
      text: '开始流程',
      properties: {
        nodeType: 'start'
      }
    });
    console.log('创建开始节点:', startNode);

    // 创建结束节点
    const endNode = lf.value.addNode({
      type: 'end',
      x: 600,
      y: 200,
      text: '结束流程',
      properties: {
        nodeType: 'end'
      }
    });
    console.log('创建结束节点:', endNode);

    // 连接开始和结束节点
    if (startNode && endNode) {
      const edge = lf.value.addEdge({
        type: 'bezier',
        sourceNodeId: startNode.id,
        targetNodeId: endNode.id,
        properties: {}
      });
      console.log('创建连接:', edge);
    }
  } catch (error) {
    console.error('初始化流程失败:', error);
  }
};

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
      adjustNodePosition: true,
      snapline: true,
      style: {
        rect: {
          radius: 5,
        },
        nodeText: {
          fontSize: 14,
          color: '#333',
          overflowMode: 'autoWrap',
        },
        edgeText: {
          fontSize: 12,
          color: '#666',
          background: {
            fill: '#fff'
          }
        },
        edge: {
          type: 'bezier',
          stroke: '#666',
          strokeWidth: 2,
          hoverStroke: '#1890ff',
          selectedStroke: '#1890ff',
          outlineColor: '#fff',
          outlineStroke: 3,
          edgeAnimation: true,
          adjustLineDistance: true,
          draginLimit: false
        }
      }
    });

    lf.value = logicFlow;

    // 注册边的类型
    lf.value.register({
      type: 'bezier',
      view: BezierEdge,
      model: class CustomBezierEdgeModel extends BezierEdgeModel {
        initEdgeData(data: any) {
          super.initEdgeData(data);
          this.strokeWidth = 2;
        }

        getEdgeStyle() {
          const style = super.getEdgeStyle();
          return {
            ...style,
            strokeWidth: this.strokeWidth,
            stroke: '#666',
            strokeDasharray: '',
            hoverStroke: '#1890ff',
            selectedStroke: '#1890ff'
          };
        }

        setProperties(properties: any) {
          super.setProperties(properties);
          if (properties.strokeWidth !== undefined) {
            this.strokeWidth = properties.strokeWidth;
          }
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

    // 初始化开始和结束节点
    initializeFlow();
  } catch (error) {
    console.error('初始化 LogicFlow 失败:', error);
  }
};

// 拖拽开始
const handleDragStart = (event: DragEvent, node: NodeConfig) => {
  if (!event.dataTransfer) return
  console.log(node,'...handleDragStart...');
  event.dataTransfer.setData('application/json', JSON.stringify(node))
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer || !lf.value) return

  const data = event.dataTransfer.getData('application/json')
  if (!data) return

  const node = JSON.parse(data)
  const { clientX, clientY } = event
  // 获取容器的位置信息
  const rect = flowContainer.value?.getBoundingClientRect()
  if (!rect) return

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
    type: node.type,
    x: offsetX,
    y: offsetY,
    text: node.name || '',
    properties: {
      name: node.name,
      nodeType: node.type,
      // 浏览器节点的默认属性
      ...(node.type === 'browser' ? {
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

    // 调整新节点的位置
    nodeConfig.x = targetNode.x
    nodeConfig.y = targetNode.y + 80 + childCount * 60

    // 添加新节点
    const newNode = lf.value.addNode(nodeConfig)

    // 创建连接
    lf.value.addEdge({
      type: 'bezier',
      sourceNodeId: targetNode.id,
      targetNodeId: newNode.id,
      properties: {}
    })

    return
  }

  // 检查是否在边上
  let targetEdge = null
  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.sourceNodeId)
    const targetNode = nodes.find(n => n.id === edge.targetNodeId)
    if (!sourceNode || !targetNode) continue

    const distance = pointToLineDistance(
      offsetX,
      offsetY,
      sourceNode.x,
      sourceNode.y,
      targetNode.x,
      targetNode.y
    )

    if (distance < 20) {
      targetEdge = edge
      break
    }
  }

  // 添加节点
  const newNode = lf.value.addNode(nodeConfig)

  // 如果在边上，创建新的连接
  if (targetEdge) {
    // 删除原来的边
    lf.value.deleteEdge(targetEdge.id)

    // 创建新的边 (源节点到新节点)
    lf.value.addEdge({
      type: 'bezier',
      sourceNodeId: targetEdge.sourceNodeId,
      targetNodeId: newNode.id,
      properties: {}
    })

    // 创建新的边 (新节点到目标节点)
    lf.value.addEdge({
      type: 'bezier',
      sourceNodeId: newNode.id,
      targetNodeId: targetEdge.targetNodeId,
      properties: {}
    })
  }
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
  lf.value.undo()
}

// 重做
const handleRedo = () => {
  if (!lf.value) return
  lf.value.redo()
}

// 保存流程
const handleSave = () => {
  if (!lf.value) return
  const data = lf.value.getGraphData()
  console.log('保存流程:', {
    name: flowName.value,
    data
  })
}

// 运行流程
const handleRun = async () => {
  if (!lf.value) return
  try {
    const data = lf.value.getGraphData()
    await flowExecutor.start(data.nodes)
  } catch (error: any) {
    ElMessage.error(`运行出错: ${error.message}`)
  }
}

// 停止流程
const handleStop = async () => {
  await flowExecutor.stop()
}

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

// 切换录制状态
const toggleRecording = async () => {
  try {
    if (!isRecording.value) {
      // 开始录制
      await recorder.startRecording()
      isRecording.value = true
    } else {
      // 停止录制
      const nodes = await recorder.stopRecording()
      isRecording.value = false
      recordedActions.value = recorder.getRecordedActions()
      showRecordPreview.value = true

      // 如果有节点生成，则添加到流程图中
      if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
          lf.value?.addNode(node)
        })
      }
    }
  } catch (error) {
    console.error('录制操作失败:', error)
    ElMessage.error('录制操作失败')
  }
}

// 生成工作流
const generateWorkflow = () => {
  showRecordPreview.value = false
  ElMessage.success('工作流生成成功')
}

// 获取动作类型标签
const getActionTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    click: '点击',
    input: '输入',
    scroll: '滚动',
    keypress: '按键',
    mouseMove: '移动'
  }
  return typeMap[type] || type
}

// 获取动作类型标签样式
const getActionTypeTag = (type: string): string => {
  const typeMap: Record<string, string> = {
    click: 'primary',
    input: 'success',
    scroll: 'warning',
    keypress: 'info',
    mouseMove: ''
  }
  return typeMap[type] || ''
}

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')
}

// 生命周期钩子
onMounted(() => {
  if (!flowContainer.value) return;
  
  // 初始化 LogicFlow
  initLogicFlow();

  // 添加事件监听
  if (flowContainer.value) {
    flowContainer.value.addEventListener('dragover', handleDragOver)
    flowContainer.value.addEventListener('drop', handleDrop)
  }
});

onUnmounted(() => {
  if (lf.value) {
    // lf.value.destroy();
  }
  if (flowContainer.value) {
    flowContainer.value.removeEventListener('dragover', handleDragOver)
    flowContainer.value.removeEventListener('drop', handleDrop)
  }
});
</script>

<style lang="postcss" scoped>
.designer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  cursor: move;
  transition: background-color 0.2s;
}

.component-item:hover {
  background-color: #f3f4f6;
}

.custom-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.lf-element-selected .custom-node {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.bg-grid {
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 24px 24px;
}

.left-toolbox {
  border-right: 1px solid #e5e7eb;
  background-color: white;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.toolbox-header {
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
}

.toolbox-content {
  flex: 1;
  overflow-y: auto;
}

.properties-panel {
  border-left: 1px solid #e5e7eb;
  background-color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease-in-out;
}

.panel-header {
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.designer-canvas {
  flex: 1;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
}
</style>
