import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'

export interface ExportOptions {
  type: 'excel' | 'csv' | 'json'
  fileName?: string
  sheetName?: string
  encoding?: string
  includeHeaders?: boolean
  delimiter?: string
  saveMode?: 'auto' | 'select'
  savePath?: string
}

const defaultOptions: ExportOptions = {
  type: 'excel',
  fileName: 'export',
  sheetName: 'Sheet1',
  encoding: 'utf-8',
  includeHeaders: true,
  delimiter: ',',
  saveMode: 'auto'
}

export class ExportUtils {
  static async selectSaveDirectory(): Promise<string | null> {
    if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
      console.error('无法使用文件夹选择功能：electronAPI不可用')
      return null
    }
    
    try {
      console.log('打开文件夹选择对话框')
      const directoryPath = await window.electronAPI.invoke('dialog:showOpenDirectoryDialog')
      
      if (!directoryPath) {
        console.log('用户取消了文件夹选择')
        return null
      }
      
      console.log('选择的文件夹路径:', directoryPath)
      return directoryPath
    } catch (error) {
      console.error('选择文件夹失败:', error)
      return null
    }
  }

  static async exportData(data: any[], options: Partial<ExportOptions> = {}) {
    const finalOptions = { ...defaultOptions, ...options }
    const { type, fileName, saveMode, savePath } = finalOptions

    console.log(`开始导出数据: 保存模式=${saveMode}, 类型=${type}, 文件名=${fileName}`)

    try {
      // 检查electronAPI是否存在
      const electronAPIExists = window.electronAPI && typeof window.electronAPI.invoke === 'function';
      console.log('electronAPI是否存在:', electronAPIExists);
      
      // 当选择手动选择保存位置时，必须使用对话框
      if (saveMode === 'select' && electronAPIExists) {
        // 使用 Electron 对话框选择保存路径
        console.log('使用对话框选择保存路径')
        try {
          const defaultExtension = type === 'excel' ? 'xlsx' : type;
          const savePath = await window.electronAPI.invoke('dialog:showSaveDialog', {
            fileName: `${fileName}.${defaultExtension}`
          })
          
          console.log('选择的保存路径:', savePath)
          
          if (!savePath) {
            console.log('用户取消了保存')
            return // 用户取消了保存
          }

          switch (type) {
            case 'excel':
              return await this.exportToExcel(data, finalOptions, savePath)
            case 'csv':
              return await this.exportToCSV(data, finalOptions, savePath)
            case 'json':
              return await this.exportToJSON(data, finalOptions, savePath)
            default:
              throw new Error(`不支持的导出类型: ${type}`)
          }
        } catch (error) {
          console.error('保存对话框错误:', error)
          // 如果对话框出错，自动切换到浏览器保存模式
          console.log('切换到浏览器保存模式')
        }
      }
      // 使用自动保存模式，且有有效的预设路径
      else if (saveMode === 'auto' && savePath && typeof savePath === 'string' && savePath.trim() !== '' && electronAPIExists) {
        console.log('使用预设保存路径进行导出:', savePath);
        
        // 计算完整的文件路径（目录路径 + 文件名 + 扩展名）
        const defaultExtension = type === 'excel' ? 'xlsx' : type;
        const pathSeparator = savePath.includes('\\') ? '\\' : '/'; // 根据路径格式判断分隔符
        let fullPath = `${savePath}${pathSeparator}${fileName}.${defaultExtension}`;
        
        console.log('完整的文件保存路径:', fullPath);
        
        switch (type) {
          case 'excel':
            return await this.exportToExcel(data, finalOptions, fullPath)
          case 'csv':
            return await this.exportToCSV(data, finalOptions, fullPath)
          case 'json':
            return await this.exportToJSON(data, finalOptions, fullPath)
          default:
            throw new Error(`不支持的导出类型: ${type}`)
        }
      }
      
      // 如果以上条件都不满足，使用浏览器的 saveAs 方法自动保存
      console.log('使用浏览器自动保存')
      switch (type) {
        case 'excel':
          return await this.exportToExcelAuto(data, finalOptions)
        case 'csv':
          return await this.exportToCSVAuto(data, finalOptions)
        case 'json':
          return await this.exportToJSONAuto(data, finalOptions)
        default:
          throw new Error(`不支持的导出类型: ${type}`)
      }
    } catch (error) {
      console.error('导出过程中出错:', error)
      throw error
    }
  }

  private static async exportToExcel(data: any[], options: ExportOptions, savePath: string) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(options.sheetName)

    // 如果数据是数组的数组，直接添加
    if (Array.isArray(data[0])) {
      worksheet.addRows(data)
    } else {
      // 如果数据是对象数组，提取表头和数据
      if (options.includeHeaders) {
        const headers = Object.keys(data[0])
        worksheet.addRow(headers)
      }
      
      data.forEach(item => {
        worksheet.addRow(Object.values(item))
      })
    }

    // 设置列宽自适应
    worksheet.columns.forEach(column => {
      column.width = 15
    })

    const buffer = await workbook.xlsx.writeBuffer()
    await window.electronAPI.invoke('fs:writeFile', savePath, buffer)
  }

  private static async exportToCSV(data: any[], options: ExportOptions, savePath: string) {
    const csv = Papa.unparse(data, {
      delimiter: options.delimiter,
      header: options.includeHeaders
    })

    await window.electronAPI.invoke('fs:writeFile', savePath, csv)
  }

  private static async exportToJSON(data: any[], options: ExportOptions, savePath: string) {
    const json = JSON.stringify(data, null, 2)
    await window.electronAPI.invoke('fs:writeFile', savePath, json)
  }

  // 以下是使用浏览器自动保存的方法
  private static async exportToExcelAuto(data: any[], options: ExportOptions) {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(options.sheetName)

      // 如果数据是数组的数组，直接添加
      if (Array.isArray(data[0])) {
        worksheet.addRows(data)
      } else {
        // 如果数据是对象数组，提取表头和数据
        if (options.includeHeaders) {
          const headers = Object.keys(data[0])
          worksheet.addRow(headers)
        }
        
        data.forEach(item => {
          worksheet.addRow(Object.values(item))
        })
      }

      // 设置列宽自适应
      worksheet.columns.forEach(column => {
        column.width = 15
      })

      console.log('生成Excel数据完成，准备创建Blob')
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      console.log('创建Blob完成，准备调用saveAs')
      const fileName = `${options.fileName || 'export'}.xlsx`
      console.log('保存文件名:', fileName)
      saveAs(blob, fileName)
      console.log('saveAs调用完成')
    } catch (error) {
      console.error('Excel自动保存失败:', error)
      throw error
    }
  }

  private static async exportToCSVAuto(data: any[], options: ExportOptions) {
    try {
      console.log('生成CSV数据开始')
      const csv = Papa.unparse(data, {
        delimiter: options.delimiter,
        header: options.includeHeaders
      })
      console.log('生成CSV数据完成，准备创建Blob')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      
      console.log('创建Blob完成，准备调用saveAs')
      const fileName = `${options.fileName || 'export'}.csv`
      console.log('保存文件名:', fileName)
      saveAs(blob, fileName)
      console.log('saveAs调用完成')
    } catch (error) {
      console.error('CSV自动保存失败:', error)
      throw error
    }
  }

  private static async exportToJSONAuto(data: any[], options: ExportOptions) {
    try {
      console.log('生成JSON数据开始')
      const json = JSON.stringify(data, null, 2)
      console.log('生成JSON数据完成，准备创建Blob')
      
      const blob = new Blob([json], { type: 'application/json' })
      
      console.log('创建Blob完成，准备调用saveAs')
      const fileName = `${options.fileName || 'export'}.json`
      console.log('保存文件名:', fileName)
      saveAs(blob, fileName)
      console.log('saveAs调用完成')
    } catch (error) {
      console.error('JSON自动保存失败:', error)
      throw error
    }
  }
} 