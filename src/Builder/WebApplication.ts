import type { Constructor } from '../Dependency/Constructor'
import type { ControllerActionType } from './Registries'
import type { WebApplicationConfig } from '../Configs/WebApplicationConfig'
import { CorsPolicy } from './CorsPolicy'
import { DbContext } from '../Database/DbContext'
import { ScanImplements } from '../Compilers/ScanImplements'
import { ServiceCollection } from '../Dependency/ServiceCollection'
import { type CorsPolicyConfig } from '../Configs/CorsPolicy'
import { SecurityHeaders } from '../Shared/Constants'
import { RequestLogger, Logger } from '../Logging'
import { OpenTelemetry } from '../Tracing/OpenTelemetry'
import type { PrometheusConfigs } from '../Configs/PrometheusConfigs'

class WebApplication {
  private static instance: WebApplication
  private static services: ServiceCollection
  configs: WebApplicationConfig = {}
  actions: ControllerActionType[] = [] as ControllerActionType[]
  context: DbContext = {} as DbContext

  private constructor() {
  }

  static CreateBuilder() {
    if (!WebApplication.instance) {
      WebApplication.instance = new WebApplication()
      WebApplication.services = new ServiceCollection()
    }
    return {
      Services: {
        AddOpenTelemetry: WebApplication.prototype.AddOpenTelemetry.bind(WebApplication.instance),
        AddControllers: WebApplication.prototype.AddControllers.bind(WebApplication.instance),
        AddCors: WebApplication.prototype.AddCors.bind(WebApplication.instance),
        AddDbContext: WebApplication.prototype.AddDbContext.bind(WebApplication.instance),
        AddSingleton: WebApplication.prototype.AddSingleton.bind(WebApplication.instance),
        AddScoped: WebApplication.prototype.AddScoped.bind(WebApplication.instance),
        AddTransient: WebApplication.prototype.AddTransient.bind(WebApplication.instance)
      },
      Build: WebApplication.prototype.Build.bind(WebApplication.instance)
    }
  }

  AddOpenTelemetry(prometheus: PrometheusConfigs) {
    OpenTelemetry.Initialize(prometheus)
    return this
  }

  AddControllers() {
    this.configs.controllers = true
    return this
  }

  AddCors(options: (cors: { AddPolicy: (name: string, configure: (policy: CorsPolicy) => void) => void }) => void) {
    const corsPolicies: Record<string, CorsPolicyConfig> = {}
    options({
      AddPolicy: (name, configure) => {
        const policy = new CorsPolicy()
        configure(policy)
        corsPolicies[name] = policy.getConfig()
      }
    })
    this.configs.corsPolicies = corsPolicies
    Logger.Information('CORS policies added: {0}', JSON.stringify(corsPolicies))
    return this
  }

  AddDbContext<T extends DbContext>(instance: T) {
    const instanceName = (instance as any).constructor.name
    WebApplication.services.AddDbContext(instanceName, instance)
  }

  AddSingleton(token: string | symbol, implementation: Constructor, ...params: any[]) {
    WebApplication.services.AddSingleton(token, implementation, params)
  }

  AddScoped(token: string | symbol, implementation: Constructor, ...params: any[]) {
    WebApplication.services.AddScoped(token, implementation, params)
  }

  AddTransient(token: string | symbol, implementation: Constructor, ...params: any[]) {
    WebApplication.services.AddTransient(token, implementation, params)
  }

  Build(__dirname: string) {
    ServiceCollection.instance = WebApplication.services
    if (this.configs.controllers) {
      const { Controllers } = ScanImplements(__dirname, '.ts')
      this.actions = Array.from(Controllers).flatMap((controller) => controller.Actions) as ControllerActionType[]
    }

    return {
      Run: (port: number) => {
        Bun.serve({
          port,
          fetch: (request: Request) => {
            const tracer = OpenTelemetry.GetTracer()
            const span = tracer.startSpan('HTTP Request', {
              attributes: {
                method: request.method,
                url: request.url
              }
            })

            OpenTelemetry.RecordMetric('http_requests_total', 'Total HTTP requests', 1)

            return OpenTelemetry.RunInContext(span, async () => {
              return RequestLogger(request, async () => {
                const origin = request.headers.get('Origin') || ''

                // CORS logic
                if (this.configs.corsPolicies) {
                  for (const [policyName, policyConfig] of Object.entries(this.configs.corsPolicies)) {
                    if (policyConfig.allowedOrigins.includes(origin) || policyConfig.allowedOrigins.includes('*')) {
                      const headers: Record<string, string> = {
                        'Access-Control-Allow-Origin': origin
                      }

                      if (policyConfig.allowAnyHeader) {
                        headers['Access-Control-Allow-Headers'] = '*'
                      }
                      if (policyConfig.allowAnyMethod) {
                        headers['Access-Control-Allow-Methods'] = '*'
                      }

                      span.setStatus(OpenTelemetry.OkStatus())
                      span.end()
                      return new Response(null, {
                        status: 204,
                        headers
                      })
                    }
                  }
                }

                // Controller logic
                if (this.configs.controllers) {
                  const { method, url } = request
                  const parsedUrl = new URL(url)

                  const route = this.actions.find((action: ControllerActionType | undefined) => {
                    const actionRoute =
                      action !== undefined ? '/' + action.Controller + action.Route : ''
                    return (
                      action !== undefined &&
                      action.Method === method &&
                      parsedUrl.pathname === actionRoute.toLocaleLowerCase()
                    )
                  })

                  if (route) {
                    span.setStatus(OpenTelemetry.OkStatus())
                    span.end()
                    return route.Handler(request)
                  }

                  span.setStatus(OpenTelemetry.ErrorStatus('Controller logic not implemented'))
                  span.end()
                  return new Response('Controller logic not implemented', {
                    status: 200,
                    headers: {
                      ...SecurityHeaders
                    }
                  })
                }

                span.setStatus(OpenTelemetry.ErrorStatus('Not Found'))
                span.end()
                return new Response('Not Found', {
                  status: 404,
                  headers: {
                    ...SecurityHeaders
                  }
                })
              })
            })
          }
        })

        Logger.Information('Server is running on port {0}', port)
      }
    }
  }
}

export { WebApplication }
