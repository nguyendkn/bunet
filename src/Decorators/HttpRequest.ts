function FromQuery(paramName: string) {
  return function(target: any, propertyKey: string | symbol, parameterIndex: number) {
    if (!target.__queryParams) {
      target.__queryParams = {}
    }
    target.__queryParams[propertyKey] = target.__queryParams[propertyKey] || []
    target.__queryParams[propertyKey][parameterIndex] = paramName
  }
}

function FromBody() {
  return function(target: any, propertyKey: string | symbol, parameterIndex: number) {
    if (!target.__bodyParams) {
      target.__bodyParams = {}
    }
    target.__bodyParams[propertyKey] = parameterIndex
  }
}