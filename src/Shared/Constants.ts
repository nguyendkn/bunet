export const SecurityHeaders: Record<string, string> = {
  'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\';',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-XSS-Protection': '1; mode=block',
  'X-Powered-By': 'CSmart'
}

export const ReservedKeywords = [
  'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch',
  'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally',
  'float', 'for', 'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof',
  'int', 'interface', 'let', 'long', 'native', 'new', 'null', 'package', 'private',
  'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized',
  'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void',
  'volatile', 'while', 'with', 'yield'
]