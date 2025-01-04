import type { ClassDeclaration, SourceFile } from 'ts-morph'
import { Registry, type ControllerActionType, type MethodType } from '../Builder/Registries'

/**
 * Patches the controllers by extracting metadata and registering actions.
 *
 * @param sourceFile - The source file containing the controller class.
 * @param classDeclaration - The class declaration to patch.
 */
export function PatchControllers(sourceFile: SourceFile, classDeclaration: ClassDeclaration) {
  const className = classDeclaration.getName()
  if (!className) return // Ensure the class has a name

  const routeDecorator = classDeclaration.getDecorator('Route')
  if (!routeDecorator) return // Ensure the class has a Route decorator

  const args = routeDecorator.getArguments()
  const controllerRoute = args.length > 0 ? args[0].getText().replace(/['"]/g, '') : '[EMPTY]'

  const resolvedRoute = controllerRoute === '[controller]' ? className.replace(/Controller$/, '') : controllerRoute

  Registry.Controllers.add({
    Name: className,
    Path: sourceFile.getFilePath(),
    Route: resolvedRoute,
    Content: sourceFile.getFullText(),
    SourceFile: sourceFile,
    Actions: PatchActions(sourceFile, classDeclaration, resolvedRoute)
  })
}

/**
 * Extracts actions (HTTP methods) from a controller class.
 *
 * @param sourceFile - The source file containing the controller class.
 * @param classDeclaration - The class declaration to extract actions from.
 * @param controllerRoute - The route of the controller.
 * @returns Array of actions extracted from the controller class.
 */
export function PatchActions(
  sourceFile: SourceFile,
  classDeclaration: ClassDeclaration,
  controllerRoute: string
): ControllerActionType[] {
  const actions: ControllerActionType[] = []
  const className = classDeclaration.getName()
  if (!className) return actions // Ensure the class has a name

  const sourceFilePath = sourceFile.getFilePath()
  const moduleExports = require(sourceFilePath)

  if (!moduleExports[className]) {
    throw new Error(`Class ${className} not found in module ${sourceFilePath}`)
  }

  const instance = new moduleExports[className]()

  // Filter methods with HTTP-related decorators
  classDeclaration.getMethods().forEach((method) => {
    const httpDecorators = method.getDecorators().filter((decorator) => decorator.getName().startsWith('Http'))

    httpDecorators.forEach((decorator) => {
      const methodType = decorator.getName().replace('Http', '').toUpperCase() as MethodType

      const actionRoute = decorator.getArguments()[0]?.getText()?.replace(/['"]/g, '') || ''

      actions.push({
        Name: method.getName(),
        Route: actionRoute,
        Controller: controllerRoute,
        Method: methodType,
        Handler: async (request: Request) => {
          try {
            let body = {}
            // Kiểm tra nếu request có body
            if (request.method !== 'GET' && request.headers.get('Content-Type')?.includes('application/json')) {
              body = await request.json()
            }

            // Gọi phương thức handler của controller
            const result = await instance[method.getName()](body, request)

            // Kiểm tra loại dữ liệu trả về
            if (result instanceof Response) {
              return result // Trả về trực tiếp nếu đã là một đối tượng Response
            }

            // Mặc định chuyển đổi thành JSON
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' }
            })
          } catch (error) {
            console.error(`Error in handler for ${method.getName()}:`, error)
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
      })
    })
  })

  return actions
}

/**
 * Patches the context by extracting metadata and registering actions.
 *
 * @param sourceFile - The source file containing the controller class.
 * @param classDeclaration - The class declaration to patch.
 */
export function PatchDbContexts(sourceFile: SourceFile, classDeclaration: ClassDeclaration) {
  const className = classDeclaration.getName()
  if (!className) return

  Registry.DbContexts.add({
    Name: className,
    Path: sourceFile.getFilePath(),
    Content: sourceFile.getFullText(),
    SourceFile: sourceFile
  })
}
