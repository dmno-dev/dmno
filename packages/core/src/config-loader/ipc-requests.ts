export type ConfigLoaderRequestMap = {
  'get-resolved-config': {
    payload: { service?: string, packageName?: string },
    response: { configValues: Record<string, any> },
  },
  'generate-types': {
    payload: { service?: string, packageName?: string },
    response: { tsSrc: string },
  }
};

type ConfigLoaderRequest = {
  [K in keyof ConfigLoaderRequestMap]: (
    { key: K } & ConfigLoaderRequestMap[K]
  )
}[keyof ConfigLoaderRequestMap];
