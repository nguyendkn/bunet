import { type CorsPolicyConfig } from '../Configs/CorsPolicy'

export class CorsPolicy {
  private readonly config: CorsPolicyConfig

  constructor() {
    this.config = {
      allowedOrigins: [],
      allowAnyHeader: false,
      allowAnyMethod: false
    }
  }

  WithOrigins(...origins: string[]) {
    this.config.allowedOrigins = origins
    return this
  }

  AllowAnyHeader() {
    this.config.allowAnyHeader = true
    return this
  }

  AllowAnyMethod() {
    this.config.allowAnyMethod = true
    return this
  }

  getConfig() {
    return this.config
  }
}
