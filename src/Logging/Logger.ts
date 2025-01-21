import * as fs from 'fs'
import * as path from 'path'

export interface ILogger {
  Information(template: string, ...args: any[]): Promise<void>

  Warn(template: string, ...args: any[]): Promise<void>

  Error(template: string, ...args: any[]): Promise<void>
}

export class Logger implements ILogger {
  private static instance: Logger
  private outputDirectory: string = 'Logs'
  private flushInterval: unknown | null = null
  private maxBufferSize = 100
  private logs: string[] = []

  public static Instance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public async Information(template: string, ...args: any[]) {
    const message = template.Format(args)
    const outputMessage = `[INFO] ${new Date().toISOString()} - ${this.Target()} - ${message}`
    this.logs.push(outputMessage)
    await this.Flush()
  }

  public async Warn(template: string, ...args: any[]) {
    const message = template.Format(args)
    console.warn(`[WARN] ${new Date().toISOString()} - ${this.Target()} - ${message}`)
  }

  public async Error(template: string, ...args: any[]) {
    const message = template.Format(args)
    console.error(`[ERROR] ${new Date().toISOString()} - ${this.Target()} - ${message}`)
  }

  private Target(): string {
    const stack = new Error().stack || ''
    const callerLine = stack.split('\n')[3] || '' // Adjust to find the correct stack line
    const match = callerLine.match(/\((.*):\d+:\d+\)/)
    return match ? match[1] : 'Unknown'
  }

  // Phương thức để ghi log vào file
  private async WriteToLogFile(logMessage: string): Promise<void> {
    const date = new Date()
    const filename = `log-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getHours().toString().padStart(2, '0')}.log`
    const logFilePath = path.join(this.outputDirectory, filename)

    // Đảm bảo thư mục log đã tồn tại
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory)
    }

    // Ghi log vào file (append mode)
    fs.appendFileSync(logFilePath, logMessage + '\n')
  }

  private async Flush(): Promise<void> {
    // Kiểm tra xem bộ đệm có đầy hay không
    if (this.logs.length >= this.maxBufferSize) {
      await this.FlushLogs() // Ghi log nếu bộ đệm đầy
    }

    // Nếu chưa có interval, thiết lập interval để ghi log mỗi phút
    if (this.flushInterval === null) {
      this.flushInterval = setInterval(async () => {
        await this.FlushLogs()
      }, 60000) // Mỗi phút gọi flushLogs()
    }
  }

  // Phương thức ghi log từ bộ đệm ra file
  private async FlushLogs(): Promise<void> {
    if (this.logs.length > 0) {
      const logMessage = this.logs.join('\n')
      await this.WriteToLogFile(logMessage)
      this.logs = [] // Xóa bộ đệm sau khi ghi
    }
  }
}