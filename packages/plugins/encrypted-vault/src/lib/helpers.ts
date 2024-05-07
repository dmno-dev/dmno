// TODO: move to core
export function splitFullResolverPath(fullResolverPath: string) {
  const [serviceName, itemAndResolverPath] = fullResolverPath.split('!');
  const [itemPath, resolverBranchIdPath] = itemAndResolverPath.split('#');
  return { serviceName, itemPath, resolverBranchIdPath };
}
