import 'global.d.ts'
import { DbContext, WebApplication } from '@/bunet/core'
import { AppDbContext } from './Database/AppDbContext'
import { UserService } from './Services/UserService'

const builder = WebApplication.CreateBuilder()
const services = builder.Services
services.AddControllers().AddDbContext(
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
app.Run(3000)
