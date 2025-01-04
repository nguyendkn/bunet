import { ScanImplements } from '../Compilers/ScanImplements'
import type { Action } from './Registries'

interface CorsPolicyConfig {
  allowedOrigins: string[]
  allowAnyHeader: boolean
  allowAnyMethod: boolean
}

class CorsPolicy {
  private config: CorsPolicyConfig

  constructor() {
    this.config = {
      allowedOrigins: [],
      allowAnyHeader: false,
      allowAnyMethod: false
    }
  }

  /**
   * Configures allowed origins for this CORS policy.
   * @param origins - The origins to allow.
   */
  WithOrigins(...origins: string[]) {
    this.config.allowedOrigins = origins
    return this // Support chaining
  }

  /**
   * Allows any header in CORS requests.
   */
  AllowAnyHeader() {
    this.config.allowAnyHeader = true
    return this // Support chaining
  }

  /**
   * Allows any HTTP method in CORS requests.
   */
  AllowAnyMethod() {
    this.config.allowAnyMethod = true
    return this // Support chaining
  }

  /**
   * Returns the internal configuration for this policy.
   */
  getConfig() {
    return this.config
  }
}

interface WebApplicationConfig {
  controllers?: boolean
  corsPolicies?: Record<string, CorsPolicyConfig>
}

class WebApplication {
  private static instance: WebApplication
  configs: WebApplicationConfig = {}
  actions: Action[] = [] as Action[]

  private constructor() {}

  static CreateBuilder() {
    if (!WebApplication.instance) {
      WebApplication.instance = new WebApplication()
    }
    return {
      Services: {
        AddControllers: WebApplication.prototype.AddControllers.bind(WebApplication.instance),
        AddCors: WebApplication.prototype.AddCors.bind(WebApplication.instance)
      },
      Build: WebApplication.prototype.Build.bind(WebApplication.instance)
    }
  }

  /**
   * Adds controllers to the service configuration.
   */
  AddControllers() {
    this.configs.controllers = true
    return this // Support chaining
  }

  /**
   * Adds CORS policies to the service configuration.
   * @param options - Function to configure CORS policies.
   */
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
    return this // Support chaining
  }

  /**
   * Builds the application with the specified configurations.
   */
  Build(__dirname: string) {
    if (this.configs.controllers) {
      const { Controllers } = ScanImplements(__dirname, '.ts')
      this.actions = Array.from(Controllers).flatMap((controller) => controller.Actions) as Action[]
    }

    return {
      Run: (port: number) => {
        Bun.serve({
          port,
          fetch: (request: Request) => {
            const origin = request.headers.get('Origin') || ''

            // Check CORS policies
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

              // Find matching route
              const route = this.actions.find((action: Action | undefined) => {
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

              return new Response('Controller logic not implemented', { status: 200 })
            }

            return new Response('Not Found', { status: 404 })
          }
        })

        console.log(`Server is running on port ${port}`)
      }
    }
  }
}

export { WebApplication }
