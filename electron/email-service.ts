import nodemailer from 'nodemailer'

export interface EmailOptions {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}

export class EmailService {
  private static instance: EmailService

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  public async sendEmail(options: EmailOptions): Promise<any> {
    try {
      // 创建传输器
      const transporter = nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure, // true for 465, false for other ports
        auth: {
          user: options.user,
          pass: options.pass,
        },
      })

      // 发送邮件
      const info = await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      console.log('邮件发送成功:', info.messageId)
      return { success: true, messageId: info.messageId }
    } catch (error: any) {
      console.error('邮件发送失败:', error)
      return { success: false, error: error.message }
    }
  }
}
