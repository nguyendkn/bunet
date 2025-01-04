// Import necessary modules
import { CompileConfigs } from './CompileConfigs'
import { ScanImplements } from '../Compilers/ScanImplements'
import type { Action } from './Registries'

/**
 * Represents a Web Application setup and runtime class.
 */
export class WebApplication {
  /**
   * Creates a builder for configuring and running the application.
   * @returns The builder object with configuration and build methods.
   */
  static CreateBuilder() {
    return {
      Services: {
        /**
         * Adds controllers to the service configuration.
         * @returns Additional configuration options.
         */
        AddControllers: () => {
          CompileConfigs.AddControllers.value = true
          return {
            /**
             * Adds JSON options to the controller configuration.
             */
            AddJsonOptions: () => {
              CompileConfigs.AddControllers.AddJsonOptions.value = true
            }
          }
        }
      },

      /**
       * Builds the application with the specified configurations.
       * @param __dirname - The base directory for scanning controllers.
       * @returns An object with a `Run` method to start the server.
       */
      Build: (__dirname: string) => {
        const { Controllers } = ScanImplements(__dirname, '.ts')
        // Map controller actions to routes
        const actions = Array.from(Controllers).flatMap((controller) => controller.Actions)

        return {
          /**
           * Runs the application on the specified port.
           * @param port - The port number to listen on.
           */
          Run: (port: number) => {
            Bun.serve({
              port,
              fetch(request: Request) {
                const { method, url } = request
                const parsedUrl = new URL(url)

                // Find matching route
                const route = actions.find(
                  (action: Action | undefined) =>
                    action !== undefined &&
                    action.Method === method &&
                    parsedUrl.pathname.includes(action.Controller + action.Route)
                );

                // Execute the handler if a route matches
                if (route) {
                  return route.Handler(request)
                }

                // Return 404 if no route matches
                return new Response('Not Found', { status: 404 })
              }
            })

            console.log(`Server is running on port ${port}`)
          }
        }
      }
    }
  }
}
