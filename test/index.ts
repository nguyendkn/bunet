import 'global.d.ts'
import { bootstrap, Bootstrapped, DbContext, WebApplication } from '@/bunet/core'
import { AppDbContext } from './Database/AppDbContex'

@Bootstrapped()
class Bootstrap {
  constructor() {
    const builder = WebApplication.CreateBuilder()
    builder.Services.AddControllers().AddDbContext(
      DbContext.OnConfiguring(AppDbContext, {
        dialect: 'postgres',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgres',
        database: 'postgres'
      })
    )

    const app = builder.Build(__dirname)
    app.Run(3000)
  }
}
bootstrap(Bootstrap);