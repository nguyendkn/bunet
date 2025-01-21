import { OpenTelemetry } from '../Tracing/OpenTelemetry'
import { Logger } from './Logger'

export async function RequestLogger(request: Request, next: () => Promise<Response>): Promise<Response> {
  const start = Date.now()
  const response = await next()
  const duration = Date.now() - start
  OpenTelemetry.RecordRequestMetrics(request.url, duration)
  await Logger.Instance().Information(
    `[${new Date().toISOString()}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`
  )

  return response
}
