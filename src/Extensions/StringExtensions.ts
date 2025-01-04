String.prototype.ToUpperCase = function (this: string): string {
  return this.toUpperCase()
}

String.prototype.ToCapitalize = function (this: string): string {
  return this.charAt(0).toUpperCase() + this.slice(1)
}

String.prototype.ParseTo = function <T>(this: string): T {
  return JSON.parse(this) as T;
}