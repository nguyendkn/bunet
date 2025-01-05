import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import type { PrometheusConfigs } from '../Configs/PrometheusConfigs'
import { Logger } from '../Logging'

export class OpenTelemetry {
  private static tracerProvider: NodeTracerProvider
  private static tracerInstance: ReturnType<typeof trace.getTracer>
  private static prometheusExporter: PrometheusExporter
  private static meterProvider: MeterProvider

  static Initialize(prometheus: PrometheusConfigs) {
    // Tạo Prometheus Exporter
    this.prometheusExporter = new PrometheusExporter({
      // Tùy chọn, bạn có thể thêm các tham số cấu hình khác tại đây
    })

    // Tự khởi động server Prometheus
    this.prometheusExporter
      .startServer()
      .then(() => {
        Logger.Information('Prometheus metrics server running at {0}://{1}:{2}/metrics', prometheus.protocol, prometheus.host, prometheus.port)
      })
      .catch((error) => {
        Logger.Error('Failed to start Prometheus server:', error)
      })

    // Khởi tạo MeterProvider và gắn PrometheusExporter
    this.meterProvider = new MeterProvider({
      // PrometheusExporter tự động thu thập metrics thông qua HTTP server
    })

    // Tạo NodeTracerProvider
    this.tracerProvider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
    })

    this.tracerProvider.register()

    // Lưu instance của tracer
    this.tracerInstance = trace.getTracer('web-application')
  }

  static GetTracer() {
    if (!this.tracerInstance) {
      throw new Error('OpenTelemetry not initialized. Call OpenTelemetry.initialize() first.')
    }
    return this.tracerInstance
  }

  static RunInContext(span: Span, fn: () => Promise<Response>): Promise<Response> {
    return context.with(trace.setSpan(context.active(), span), fn)
  }

  static OkStatus() {
    return { code: SpanStatusCode.OK }
  }

  static ErrorStatus(message: string) {
    return { code: SpanStatusCode.ERROR, message }
  }

  // Ghi nhận custom metrics
  static RecordMetric(name: string, description: string, value: number) {
    const meter = this.meterProvider.getMeter('custom-metrics')
    const counter = meter.createCounter(name, {
      description
    })
    counter.add(value)
  }
}
