import { WebApplication } from '@bunet/core'

const builder = WebApplication.CreateBuilder()
builder.Services.AddControllers()

const app = builder.Build(__dirname)
app.Run(3000)