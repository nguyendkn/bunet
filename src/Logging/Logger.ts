export class Logger {
  static Information(template: string, ...args: any[]) {
    const message = this.Format(template, ...args);
    console.log(`[INFO] ${new Date().toISOString()} - ${this.Target()} - ${message}`);
  }

  static Warn(template: string, ...args: any[]) {
    const message = this.Format(template, ...args)
    console.warn(`[WARN] ${new Date().toISOString()} - ${this.Target()} - ${message}`)
  }

  static Error(template: string, ...args: any[]) {
    const message = this.Format(template, ...args)
    console.error(`[ERROR] ${new Date().toISOString()} - ${this.Target()} - ${message}`)
  }

  private static Format(template: string, ...args: any[]): string {
    return template.replace(/{(\d+)}/g, (match, index) => {
      return typeof args[index] !== 'undefined' ? args[index] : match
    })
  }

  private static Target(): string {
    const stack = new Error().stack || ''
    const callerLine = stack.split('\n')[3] || '' // Adjust to find the correct stack line
    const match = callerLine.match(/\((.*):\d+:\d+\)/)
    return match ? match[1] : 'Unknown'
  }
}