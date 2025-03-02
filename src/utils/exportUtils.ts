import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle } from 'docx'
import { jsPDF } from 'jspdf'
// 正确导入和使用jspdf-autotable
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

export interface ExportOptions {
  type: 'excel' | 'csv' | 'json' | 'docx' | 'pdf' | 'image' | 'txt'
  fileName: string
  sheetName?: string
  encoding?: string
  includeHeaders?: boolean
  delimiter?: string
  saveMode?: 'auto' | 'select'
  savePath?: string
  title?: string
  pageSize?: 'A4' | 'A3' | 'Letter'
  imageFormat?: 'png' | 'jpeg'
}

const defaultOptions: ExportOptions = {
  type: 'excel',
  fileName: 'export',
  sheetName: 'Sheet1',
  encoding: 'utf-8',
  includeHeaders: true,
  delimiter: ',',
  saveMode: 'auto',
  pageSize: 'A4',
  imageFormat: 'png'
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
          // 根据导出类型确定默认扩展名
          let defaultExtension = '';
          switch (type) {
            case 'excel': 
              defaultExtension = 'xlsx'; 
              break;
            case 'docx': 
              defaultExtension = 'docx'; 
              break;
            case 'pdf': 
              defaultExtension = 'pdf'; 
              break;
            case 'image': 
              defaultExtension = finalOptions.imageFormat || 'png'; 
              break;
            case 'txt': 
              defaultExtension = 'txt'; 
              break;
            case 'csv': 
              defaultExtension = 'csv'; 
              break;
            case 'json': 
              defaultExtension = 'json'; 
              break;
            default: 
              defaultExtension = 'xlsx';
          }
          
          const selectedPath = await window.electronAPI.invoke('dialog:showSaveDialog', {
            fileName: `${fileName}.${defaultExtension}`,
            exportType: type,
            imageFormat: finalOptions.imageFormat
          })
          
          console.log('选择的保存路径:', selectedPath)
          
          if (!selectedPath) {
            console.log('用户取消了保存')
            return // 用户取消了保存
          }

          switch (type) {
            case 'excel':
              return await this.exportToExcel(data, finalOptions, selectedPath)
            case 'docx':
              return await this.exportToDocx(data, finalOptions, selectedPath)
            case 'pdf':
              return await this.exportToPdf(data, finalOptions, selectedPath)
            case 'image':
              return await this.exportToImage(data, finalOptions, selectedPath)
            case 'txt':
              return await this.exportToText(data, finalOptions, selectedPath)
            case 'csv':
              return await this.exportToCSV(data, finalOptions, selectedPath)
            case 'json':
              return await this.exportToJSON(data, finalOptions, selectedPath)
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
        let defaultExtension = '';
        switch (type) {
          case 'excel': 
            defaultExtension = 'xlsx'; 
            break;
          case 'docx': 
            defaultExtension = 'docx'; 
            break;
          case 'pdf': 
            defaultExtension = 'pdf'; 
            break;
          case 'image': 
            defaultExtension = finalOptions.imageFormat || 'png'; 
            break;
          case 'txt': 
            defaultExtension = 'txt'; 
            break;
          case 'csv': 
            defaultExtension = 'csv'; 
            break;
          case 'json': 
            defaultExtension = 'json'; 
            break;
          default: 
            defaultExtension = 'xlsx';
        }
        
        const pathSeparator = savePath.includes('\\') ? '\\' : '/'; // 根据路径格式判断分隔符
        let fullPath = `${savePath}${pathSeparator}${fileName}.${defaultExtension}`;
        
        console.log('完整的文件保存路径:', fullPath);
        
        switch (type) {
          case 'excel':
            return await this.exportToExcel(data, finalOptions, fullPath)
          case 'docx':
            return await this.exportToDocx(data, finalOptions, fullPath)
          case 'pdf':
            return await this.exportToPdf(data, finalOptions, fullPath)
          case 'image':
            return await this.exportToImage(data, finalOptions, fullPath)
          case 'txt':
            return await this.exportToText(data, finalOptions, fullPath)
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
        case 'docx':
          return await this.exportToDocxAuto(data, finalOptions)
        case 'pdf':
          return await this.exportToPdfAuto(data, finalOptions)
        case 'image':
          return await this.exportToImageAuto(data, finalOptions)
        case 'txt':
          return await this.exportToTextAuto(data, finalOptions)
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
    // 直接发送ArrayBuffer，避免使用Buffer
    await window.electronAPI.invoke('fs:writeFile', savePath, buffer, { encoding: 'binary' })
    return { success: true }
  }

  private static async exportToCSV(data: any[], options: ExportOptions, savePath: string) {
    const csv = Papa.unparse(data, {
      delimiter: options.delimiter,
      header: options.includeHeaders
    })

    // 文本内容直接传递，无需转换为Buffer
    await window.electronAPI.invoke('fs:writeFile', savePath, csv, { encoding: options.encoding })
    return { success: true }
  }

  private static async exportToJSON(data: any[], options: ExportOptions, savePath: string) {
    const json = JSON.stringify(data, null, 2)
    // 文本内容直接传递，无需转换为Buffer
    await window.electronAPI.invoke('fs:writeFile', savePath, json, { encoding: options.encoding })
    return { success: true }
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

  // ----- Word导出实现 -----
  static async exportToDocx(data: any[], options: ExportOptions, filePath?: string) {
    try {
      console.log('开始导出Word文档...')
      
      // 生成docx文档
      const output = await this.generateDocxBuffer(data, options)
      
      if (filePath) {
        // 通过主进程写入文件
        console.log('通过主进程保存Word文件到:', filePath)
        
        // 在浏览器环境中，output应该是Blob
        if (typeof window !== 'undefined' && window.document) {
          if (output instanceof Blob) {
            // 转换Blob为ArrayBuffer
            const arrayBuffer = await output.arrayBuffer()
            // 发送到主进程进行保存
            await window.electronAPI.invoke('fs:writeFile', filePath, arrayBuffer, { encoding: 'binary' })
          } else {
            throw new Error('浏览器环境中，输出应为Blob类型')
          }
        } 
        // 在Node环境中，output应该是Buffer
        else {
          await window.electronAPI.invoke('fs:writeFile', filePath, output, { encoding: 'binary' })
        }
        
        return { success: true }
      } else {
        // 使用浏览器保存
        console.log('使用浏览器保存Word文件')
        // 确保output是Blob
        if (output instanceof Blob) {
          this.saveAs(output, `${options.fileName}.docx`)
        } else {
          // 如果不是Blob，尝试转换
          const blob = new Blob([output as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
          this.saveAs(blob, `${options.fileName}.docx`)
        }
        return { success: true }
      }
    } catch (error) {
      console.error('导出Word文档失败:', error)
      throw error
    }
  }
  
  // 生成docx文档buffer或blob
  private static async generateDocxBuffer(data: any[], options: ExportOptions): Promise<Buffer | Blob> {
    const { title = '导出数据', includeHeaders = true } = options
    
    // 为文档准备所有部分
    const sections = [];
    
    // 添加标题部分
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 36, // 18pt
            }),
          ],
          spacing: {
            after: 200,
          },
        })
      ],
    });
    
    // 如果数据是对象数组，创建表格
    if (data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0])
      const rows: TableRow[] = []
      
      // 添加表头
      if (includeHeaders) {
        rows.push(
          new TableRow({
            children: headers.map(header => 
              new TableCell({
                children: [new Paragraph(header)],
                shading: {
                  fill: "F2F2F2",
                },
              })
            ),
          })
        )
      }
      
      // 添加数据行
      data.forEach(item => {
        rows.push(
          new TableRow({
            children: headers.map(key => 
              new TableCell({
                children: [new Paragraph(String(item[key] || ''))],
              })
            ),
          })
        )
      })
      
      // 创建表格并添加到新的部分
      const table = new Table({
        rows,
        width: {
          size: 100,
          type: "pct",
        },
      });
      
      // 添加表格到第二个部分
      sections.push({
        children: [table],
      });
    } else {
      // 如果是简单数组，直接添加段落到第二个部分
      const paragraphs = data.map(item => new Paragraph(String(item)));
      
      // 添加段落到第二个部分
      sections.push({
        children: paragraphs,
      });
    }
    
    // 创建文档
    const doc = new Document({
      sections: sections,
    });
    
    // 检测运行环境
    // 如果是浏览器环境，使用toBlob
    if (typeof window !== 'undefined' && window.document) {
      return await Packer.toBlob(doc);
    } 
    // 如果是Node环境，使用toBuffer
    else {
      return await Packer.toBuffer(doc);
    }
  }
  
  static async exportToDocxAuto(data: any[], options: ExportOptions) {
    // 使用浏览器导出
    try {
      // 在浏览器环境下，应该返回Blob
      const output = await this.generateDocxBuffer(data, options)
      // 确保输出是Blob
      if (output instanceof Blob) {
        this.saveAs(output, `${options.fileName}.docx`)
      } else {
        // 如果是Buffer，转换为Blob
        const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        this.saveAs(blob, `${options.fileName}.docx`)
      }
      return { success: true }
    } catch (error) {
      console.error('浏览器导出Word文档失败:', error)
      throw error
    }
  }

  // ----- PDF导出实现 -----
  static async exportToPdf(data: any[], options: ExportOptions, filePath?: string) {
    try {
      console.log('开始导出PDF...')
      
      // 生成PDF
      const pdfBlob = await this.generatePdfBlob(data, options)
      
      if (filePath) {
        // 通过主进程写入文件
        console.log('通过主进程保存PDF文件到:', filePath)
        const arrayBuffer = await pdfBlob.arrayBuffer()
        // 不使用Buffer.from，而是直接发送ArrayBuffer
        await window.electronAPI.invoke('fs:writeFile', filePath, arrayBuffer, { encoding: 'binary' })
        return { success: true }
      } else {
        // 使用浏览器保存
        console.log('使用浏览器保存PDF文件')
        this.saveAs(pdfBlob, `${options.fileName}.pdf`)
        return { success: true }
      }
    } catch (error) {
      console.error('导出PDF失败:', error)
      throw error
    }
  }
  
  // 生成PDF Blob
  private static async generatePdfBlob(data: any[], options: ExportOptions): Promise<Blob> {
    const { title = '导出数据', pageSize = 'A4', includeHeaders = true } = options
    
    console.log('正在生成PDF，使用Canvas绘制方式支持中文...');
    
    try {
      // 1. 创建临时DOM元素
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px';  // 设置一个合适的宽度
      container.style.background = '#ffffff';
      container.style.padding = '20px';
      container.style.fontFamily = 'Arial, "Microsoft YaHei", sans-serif';  // 使用支持中文的字体
      
      // 2. 添加标题
      const titleElement = document.createElement('h2');
      titleElement.textContent = title;
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '20px';
      titleElement.style.fontSize = '20px';
      titleElement.style.fontWeight = 'bold';
      container.appendChild(titleElement);
      
      // 3. 创建表格
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.border = '1px solid #ccc';
      table.style.fontSize = '14px';
      
      // 添加表头或内容
      if (data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0]);
        
        // 添加表头
        if (includeHeaders) {
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          
          headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.border = '1px solid #ccc';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f2f2f2';
            th.style.fontWeight = 'bold';
            headerRow.appendChild(th);
          });
          
          thead.appendChild(headerRow);
          table.appendChild(thead);
        }
        
        // 添加表体
        const tbody = document.createElement('tbody');
        data.forEach(row => {
          const tr = document.createElement('tr');
          
          headers.forEach(key => {
            const td = document.createElement('td');
            td.textContent = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            tr.appendChild(td);
          });
          
          tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
      } else {
        // 如果是简单数组
        const tbody = document.createElement('tbody');
        
        data.forEach(item => {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.textContent = String(item);
          td.style.border = '1px solid #ccc';
          td.style.padding = '8px';
          tr.appendChild(td);
          tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
      }
      
      container.appendChild(table);
      document.body.appendChild(container);
      
      // 4. 使用html2canvas将DOM元素转为Canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,  // 提高清晰度
        logging: false,
        useCORS: true
      });
      
      // 5. 移除临时DOM元素
      document.body.removeChild(container);
      
      // 6. 创建PDF并添加Canvas图像
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4宽度 (mm)
      const pageHeight = 297; // A4高度 (mm)
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // 创建PDF实例
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize.toLowerCase()
      });
      
      // 计算页数并添加图像
      let heightLeft = imgHeight;
      let position = 0;
      
      // 添加第一页
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 如果内容超过一页，添加新页
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // 7. 返回PDF Blob
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF生成错误:', error);
      
      // 创建一个包含错误信息的简单PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize.toLowerCase()
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('导出PDF时发生错误，请尝试其他导出格式', 10, 10);
      doc.setFontSize(10);
      doc.text('错误详情: ' + (error instanceof Error ? error.message : String(error)), 10, 20);
      
      return doc.output('blob');
    }
  }
  
  static async exportToPdfAuto(data: any[], options: ExportOptions) {
    // 使用浏览器导出
    try {
      const pdfBlob = await this.generatePdfBlob(data, options)
      this.saveAs(pdfBlob, `${options.fileName}.pdf`)
      return { success: true }
    } catch (error) {
      console.error('浏览器导出PDF失败:', error)
      throw error
    }
  }

  // ----- 图片导出实现 -----
  static async exportToImage(data: any[], options: ExportOptions, filePath?: string) {
    try {
      console.log('开始导出图片...')
      
      // 创建用于图片生成的表格
      const imageBlob = await this.generateImageBlob(data, options)
      
      if (filePath) {
        // 通过主进程写入文件
        console.log('通过主进程保存图片文件到:', filePath)
        const arrayBuffer = await imageBlob.arrayBuffer()
        // 不使用Buffer.from，而是直接发送ArrayBuffer
        await window.electronAPI.invoke('fs:writeFile', filePath, arrayBuffer, { encoding: 'binary' })
        return { success: true }
      } else {
        // 使用浏览器保存
        console.log('使用浏览器保存图片文件')
        this.saveAs(imageBlob, `${options.fileName}.${options.imageFormat}`)
        return { success: true }
      }
    } catch (error) {
      console.error('导出图片失败:', error)
      throw error
    }
  }
  
  // 生成图片Blob
  private static async generateImageBlob(data: any[], options: ExportOptions): Promise<Blob> {
    const { imageFormat = 'png', title = '导出数据', includeHeaders = true } = options
    
    // 创建临时表格用于导出
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.background = 'white'
    tempDiv.style.padding = '20px'
    tempDiv.style.fontFamily = 'Arial, sans-serif'
    
    // 添加标题
    const titleElement = document.createElement('h2')
    titleElement.textContent = title
    titleElement.style.marginBottom = '15px'
    tempDiv.appendChild(titleElement)
    
    // 创建表格
    const table = document.createElement('table')
    table.style.borderCollapse = 'collapse'
    table.style.width = '100%'
    table.style.border = '1px solid #ddd'
    
    // 如果数据是对象数组，创建表格
    if (data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0])
      
      // 添加表头
      if (includeHeaders) {
        const thead = document.createElement('thead')
        const headerRow = document.createElement('tr')
        
        headers.forEach(header => {
          const th = document.createElement('th')
          th.textContent = header
          th.style.border = '1px solid #ddd'
          th.style.padding = '8px'
          th.style.backgroundColor = '#f2f2f2'
          th.style.textAlign = 'left'
          headerRow.appendChild(th)
        })
        
        thead.appendChild(headerRow)
        table.appendChild(thead)
      }
      
      // 添加数据行
      const tbody = document.createElement('tbody')
      
      data.forEach(item => {
        const row = document.createElement('tr')
        
        headers.forEach(key => {
          const td = document.createElement('td')
          td.textContent = String(item[key] || '')
          td.style.border = '1px solid #ddd'
          td.style.padding = '8px'
          row.appendChild(td)
        })
        
        tbody.appendChild(row)
      })
      
      table.appendChild(tbody)
    } else {
      // 如果是简单数组，直接添加行
      const tbody = document.createElement('tbody')
      
      data.forEach(item => {
        const row = document.createElement('tr')
        const td = document.createElement('td')
        td.textContent = String(item)
        td.style.border = '1px solid #ddd'
        td.style.padding = '8px'
        row.appendChild(td)
        tbody.appendChild(row)
      })
      
      table.appendChild(tbody)
    }
    
    tempDiv.appendChild(table)
    document.body.appendChild(tempDiv)
    
    try {
      // 使用html2canvas捕获表格为图片
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: 'white',
        scale: 2, // 提高图片质量
      })
      
      // 转换为blob
      const mimeType = imageFormat === 'png' ? 'image/png' : 'image/jpeg'
      const quality = imageFormat === 'png' ? undefined : 0.9 // jpeg质量
      
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('无法创建图片Blob'))
            }
          },
          mimeType,
          quality
        )
      })
    } finally {
      // 清理临时DOM元素
      document.body.removeChild(tempDiv)
    }
  }
  
  static async exportToImageAuto(data: any[], options: ExportOptions) {
    // 使用浏览器导出
    try {
      const imageBlob = await this.generateImageBlob(data, options)
      this.saveAs(imageBlob, `${options.fileName}.${options.imageFormat}`)
      return { success: true }
    } catch (error) {
      console.error('浏览器导出图片失败:', error)
      throw error
    }
  }

  // ----- 文本导出实现 -----
  static async exportToText(data: any[], options: ExportOptions, filePath?: string) {
    try {
      console.log('开始导出文本文件...')
      
      const content = this.formatDataForText(data, options)
      
      if (filePath) {
        // 通过主进程写入文件
        console.log('通过主进程保存文本文件到:', filePath)
        // 文本内容直接传递，无需转换为Buffer
        await window.electronAPI.invoke('fs:writeFile', filePath, content, { encoding: options.encoding })
        return { success: true }
      } else {
        // 使用浏览器保存
        console.log('使用浏览器保存文本文件')
        // 浏览器端保存文本文件
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        this.saveAs(blob, `${options.fileName}.txt`)
        return { success: true }
      }
    } catch (error) {
      console.error('导出文本文件失败:', error)
      throw error
    }
  }
  
  // 将数据格式化为文本
  private static formatDataForText(data: any[], options: ExportOptions): string {
    // 将数据转换为文本格式
    if (!Array.isArray(data) || data.length === 0) {
      return '无数据'
    }
    
    let content = ''
    
    // 如果有标题，添加标题
    if (options.title) {
      content += options.title + '\n\n'
    }
    
    // 如果数据是对象数组，则尝试将其转换为更可读的文本格式
    if (typeof data[0] === 'object') {
      // 添加表头
      if (options.includeHeaders) {
        const headers = Object.keys(data[0])
        content += headers.join('\t') + '\n'
        content += headers.map(() => '--------').join('\t') + '\n'
      }
      
      // 添加数据行
      data.forEach(item => {
        const row = Object.values(item).map(value => 
          value === null || value === undefined ? '' : String(value)
        ).join('\t')
        content += row + '\n'
      })
    } else {
      // 如果是简单数组，直接每行一个元素
      content = data.map(item => String(item)).join('\n')
    }
    
    return content
  }
  
  static async exportToTextAuto(data: any[], options: ExportOptions) {
    return this.exportToText(data, options)
  }

  static saveAs(blob: Blob, filename: string) {
    saveAs(blob, filename)
  }
} 