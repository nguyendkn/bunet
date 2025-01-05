import type { CorsPolicyConfig } from "./CorsPolicy"

export interface WebApplicationConfig {
  controllers?: boolean
  corsPolicies?: Record<string, CorsPolicyConfig>
}
