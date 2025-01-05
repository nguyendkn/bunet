import type { Constructor } from '../Dependency/Constructor'
import type { ControllerActionType } from './Registries'
import type { WebApplicationConfig } from '../Configs/WebApplicationConfig'
import { CorsPolicy } from './CorsPolicy'
import { DbContext } from '../Database/DbContext'
import { ScanImplements } from '../Compilers/ScanImplements'
import { ServiceCollection } from '../Dependency/ServiceCollection'
import { type CorsPolicyConfig } from '../Configs/CorsPolicy'
import { SecurityHeaders } from '../Shared/Constants'

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
    console.log('CORS policies added:', corsPolicies)
    return this
  }

  AddDbContext<T extends DbContext>(instance: T) {
    const instanceName = (instance as any).constructor.name
    WebApplication.services.AddDbContext(instanceName, instance)
  }

  AddSingleton(
    token: string | symbol,
    implementation: Constructor,
    ...params: any[]
  ) {
    WebApplication.services.AddSingleton(token, implementation, params)
  }

  AddScoped(
    token: string | symbol,
    implementation: Constructor,
    ...params: any[]
  ) {
    WebApplication.services.AddScoped(token, implementation, params)
  }

  AddTransient(
    token: string | symbol,
    implementation: Constructor,
    ...params: any[]
  ) {
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
            const origin = request.headers.get('Origin') || ''

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

                  return new Response(null, {
                    status: 204,
                    headers
                  })
                }
              }
            }

            if (this.configs.controllers) {
              const { method, url } = request
              const parsedUrl = new URL(url)

              const route = this.actions.find((action: ControllerActionType | undefined) => {
                const actionRoute = action !== undefined ? '/' + action.Controller + action.Route : ''
                return (
                  action !== undefined &&
                  action.Method === method &&
                  parsedUrl.pathname === actionRoute.toLocaleLowerCase()
                )
              })

              if (route) {
                return route.Handler(request)
              }

              return new Response('Controller logic not implemented', {
                status: 200, headers: {
                  ...SecurityHeaders
                }
              })
            }

            return new Response('Not Found', {
              status: 404,
              headers: {
                ...SecurityHeaders
              }
            })
          }
        })

        console.log(`Server is running on port ${port}`)
      }
    }
  }
}

export { WebApplication }
