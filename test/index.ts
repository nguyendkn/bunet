import 'global.d.ts'
import { DbContext, WebApplication } from '@/bunet/core'
import { AppDbContext } from './Database/AppDbContext'
import { UserService } from './Services/UserService'

const port = Number(process.env.PORT) || 3000
const builder = WebApplication.CreateBuilder()
const services = builder.Services
services.AddOpenTelemetry({
  protocol: 'http',
  host: 'localhost',
  port: port,
  systemMetricsInterval: 6000
}).AddControllers().AddDbContext(
  DbContext.OnConfiguring(AppDbContext, {
    dialect: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres'
  })
)
services.AddSingleton(UserService.name, UserService)

const app = builder.Build(__dirname)
app.Run(port)
