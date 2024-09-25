import graphlib from '@dagrejs/graphlib';

export function getAllPredecessors(graph: graphlib.Graph, nodeId: string) {
  const allPredecessorIds: Record<string, boolean> = {};
  const idsToProcess = graph.predecessors(nodeId) || [];
  while (idsToProcess.length) {
    const nextId = idsToProcess.pop();
    if (!nextId || allPredecessorIds[nextId]) continue;
    allPredecessorIds[nextId] = true;
    idsToProcess.unshift(...graph.predecessors(nextId) || []);
  }
  return Object.keys(allPredecessorIds).reverse();
}
