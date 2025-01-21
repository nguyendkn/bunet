String.prototype.ToUpperCase = function (this: string): string {
  return this.toUpperCase()
}

String.prototype.ToCapitalize = function (this: string): string {
  return this.charAt(0).toUpperCase() + this.slice(1)
}

String.prototype.ParseTo = function <T>(this: string): T {
  return JSON.parse(this) as T
}

String.prototype.Format = function (this: string, ...args: any[]) {
  return this.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== 'undefined' ? args[index] : match
  })
}