import * as os from 'os'
import { type PrometheusConfigs, Logger } from '@/bunet/core'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { networkInterfaces } from 'os'
import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api'

export class OpenTelemetry {
  private static tracerProvider: NodeTracerProvider
  private static tracerInstance: ReturnType<typeof trace.getTracer>
  private static prometheusExporter: PrometheusExporter
  private static meterProvider: MeterProvider

  // Initialize OpenTelemetry
  static Initialize(configs: PrometheusConfigs) {
    if (!configs.host || !configs.port || !configs.protocol) {
      throw new Error('Missing required Prometheus configurations (host, port, protocol).')
    }

    // Initialize Prometheus Exporter
    this.prometheusExporter = new PrometheusExporter({})

    // Start Prometheus metrics server
    this.prometheusExporter
      .startServer()
      .then(() => {
        Logger.Information(
          'Prometheus metrics server running at {0}://{1}:{2}/metrics',
          configs.protocol,
          configs.host,
          configs.port
        )
      })
      .catch((error) => {
        Logger.Error('Failed to start Prometheus server:', error)
      })

    // Initialize MeterProvider and attach PrometheusExporter
    this.meterProvider = new MeterProvider({
      readers: [this.prometheusExporter]
    })

    // Initialize NodeTracerProvider with BatchSpanProcessor for better performance
    this.tracerProvider = new NodeTracerProvider()
    const exporter = new ConsoleSpanExporter()
    const batchProcessor = new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 50,
      scheduledDelayMillis: 5000
    })
    this.tracerProvider = new NodeTracerProvider({
      spanProcessors: [batchProcessor]
    })
    this.ConfigureTracerProvider(exporter)

    // Store tracer instance
    this.tracerInstance = trace.getTracer('web-application')

    // Record system metrics periodically
    setInterval(() => {
      this.RecordSystemMetrics()
    }, configs.systemMetricsInterval || 60000) // Default interval is 1 minute
  }

  static ConfigureTracerProvider(config: any = {}) {
    const propagator = config.propagator || new W3CTraceContextPropagator()
    const contextManager = config.contextManager || new AsyncHooksContextManager()

    this.tracerProvider.register({
      propagator,
      contextManager
    })
  }

  // Get the tracer instance
  static GetTracer() {
    if (!this.tracerInstance) {
      throw new Error('OpenTelemetry not initialized. Call OpenTelemetry.Initialize() first.')
    }
    return this.tracerInstance
  }

  // Run a function within a span context
  static RunInContext(span: Span, fn: () => Promise<Response>): Promise<Response> {
    if (!span) {
      throw new Error('Invalid span provided.')
    }
    return context.with(trace.setSpan(context.active(), span), fn)
  }

  // Return OK status for a span
  static OkStatus() {
    return { code: SpanStatusCode.OK }
  }

  // Return Error status for a span
  static ErrorStatus(message: string) {
    return { code: SpanStatusCode.ERROR, message }
  }

  // Record custom metrics
  static RecordMetric(name: string, description: string, value: number) {
    const meter = this.meterProvider.getMeter('custom-metrics')
    const counter = meter.createCounter(name, {
      description
    })
    counter.add(value)
  }

  // Collect system metrics: CPU, RAM, Disk I/O, Network I/O
  static RecordSystemMetrics() {
    const meter = this.meterProvider.getMeter('system-metrics')

    // CPU Usage
    const cpuUsage = os.loadavg()[0]
    const cpuCounter = meter.createCounter('system_cpu_usage', {
      description: 'CPU load average over 1 minute'
    })
    cpuCounter.add(cpuUsage)

    // RAM Usage
    const ramUsage = process.memoryUsage().rss / (1024 * 1024) // In MB
    const ramCounter = meter.createCounter('system_ram_usage', {
      description: 'RAM usage in MB'
    })
    ramCounter.add(ramUsage)

    // Network I/O
    const nets = networkInterfaces()
    let totalData = 0
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        totalData += net.address.length // Simulate using IP address length
      }
    }
    const networkCounter = meter.createCounter('system_network_io', {
      description: 'Network I/O data'
    })
    networkCounter.add(totalData)
  }

  // Record request metrics: number of requests and response time
  static RecordRequestMetrics(endpoint: string, responseTime: number) {
    if (!endpoint) {
      throw new Error('Invalid endpoint provided.')
    }

    const meter = this.meterProvider.getMeter('request-metrics')
    const requestCounter = meter.createCounter('http_request_count', {
      description: `Number of requests to ${endpoint}`
    })
    requestCounter.add(1)

    const responseTimeHistogram = meter.createHistogram('http_response_time', {
      description: 'Response time in milliseconds'
    })
    responseTimeHistogram.record(responseTime)
  }
}
