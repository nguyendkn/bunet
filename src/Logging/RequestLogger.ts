export async function RequestLogger(request: Request, next: () => Promise<Response>): Promise<Response> {
  const start = Date.now()
  const response = await next()
  const duration = Date.now() - start

  console.info(
    `[${new Date().toISOString()}] ${request.method} ${request.url} - ${response.status} (${duration}ms)`
  )

  return response
}