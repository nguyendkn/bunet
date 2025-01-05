import { ApiController, ControllerBase, HttpPost, Route } from '@/bunet/core'

@ApiController()
@Route('[controller]')
export class FileController extends ControllerBase {
  @HttpPost('/upload')
  async Upload(_: any, request: Request) {
    const formData = await request.formData()
    const file = formData.get('file')

    if (file && file instanceof File) {
      const filePath = `./uploads/${file.name}`
      const fileBytes = await file.arrayBuffer()

      // Ghi file lên hệ thống
      await Bun.write(filePath, new Uint8Array(fileBytes))

      return new Response(
        JSON.stringify({
          success: true,
          message: `File uploaded successfully as ${filePath}`
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ error: 'No file uploaded' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
