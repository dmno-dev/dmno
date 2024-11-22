import { ConfigraphNode } from '../config-node';
import { SchemaError } from '../errors';
import { createResolver } from '../resolvers';

export function inject(injectOpts?: {
  allowFailure?: boolean,
}) {
  return createResolver({
    label: 'inject',
    icon: 'fluent:swipe-down-24-regular',
    process() {
      if (this.configNode.type.injectable === false) {
        this.configNode.schemaErrors.push(new SchemaError(`Type ${this.configNode.type.typeLabel} is not injectable`));
        return;
      }

      // TODO: should we scan the current entity first? maybe as an option? maybe only if within a nested object node?
      // if we do, we must filter skip the current item!
      const containingEntity = this.configNode.parentEntity!;
      let entityToSearch = containingEntity.parentEntity;
      const matchingNodes: Array<ConfigraphNode> = [];
      while (entityToSearch) {
        for (const nodeToCheck of entityToSearch.flatConfigNodes) {
          // TODO: we'll want to check some graph-level registry of "compatible" types
          if (nodeToCheck.type.extendsType(this.configNode.type.typeFactoryFn)) {
            matchingNodes.push(nodeToCheck);
          }
        }
        // if we've found matches in this entity, we stop going up
        // TODO: is there a case where we want to keep going and collect multiple?
        if (matchingNodes.length > 0) break;

        // TODO: options for how many levels up to search, or otherwise where to stop
        entityToSearch = entityToSearch.parentEntity;
      }

      // if we didn't find anything to inject, we'll add a schema error
      if (!matchingNodes.length) {
        if (!injectOpts?.allowFailure) {
          throw new SchemaError(`Injection failed - unable to find match for type ${this.configNode.type.typeLabel}`);
        }
      // or if we found multiple matches in the same entity
      // (we could add some options around this?)
      } else if (matchingNodes.length > 1) {
        throw new SchemaError(`Injection failed - found multiple matches for type ${this.configNode.type.typeLabel}`);
      } else {
        this.dependsOnPathsObj[matchingNodes[0].fullPath] = 'schema';
      }
    },
    resolve(ctx) {
      // not quite sure about this yet...
      const vals = ctx.getDeclaredDependencyValues();
      return vals[Object.keys(vals)[0]];
    },
  });
}

export function collect(collectOpts?: {}) {
  return createResolver({
    label: 'collect',
    // TODO: toggle icon depending on single/multi?
    icon: 'fluent:double-swipe-up-24-regular',
    process() {
      if (this.configNode.type.injectable === false) {
        throw new SchemaError(`Type ${this.configNode.type.typeLabel} is not injectable`);
      }

      return () => {
        const containingEntity = this.configNode.parentEntity!;
        const entitiesToSearch = [...containingEntity.childEntities];
        const matchingNodes: Array<ConfigraphNode> = [];
        while (entitiesToSearch.length) {
          const entityToSearch = entitiesToSearch.shift()!;
          entitiesToSearch.push(...entityToSearch.childEntities || []);
          // TODO: support nested objects - scan a flattened list instead?
          for (const nodeKey in entityToSearch.configNodes) {
            const nodeToCheck = entityToSearch.configNodes[nodeKey];

            // TODO: we'll want to check some graph-level registry of "compatible" types
            if (nodeToCheck.type.extendsType(this.configNode.type.typeFactoryFn)) {
              matchingNodes.push(nodeToCheck);
            }
          }
          // if we've found matches in this entity, we stop going up
          // TODO: support multiple mode, and we'll need to dedupe
          if (matchingNodes.length > 0) break;

          // TODO: options for how many levels down to search, or otherwise where to stop
        }

        // if we didn't find anything to inject, we'll add a schema error
        if (!matchingNodes.length) {
          throw new SchemaError(`Collect failed - unable to find match for type ${this.configNode.type.typeLabel}`);
          // or if we found multiple matches in the same entity
          // (we could add some options around this?)
        } else if (matchingNodes.length > 1) {
          // TODO: multiple mode will toggle this on/off
          throw new SchemaError(`Collect failed - found multiple matches for type ${this.configNode.type.typeLabel}`);
        } else {
          this.dependsOnPathsObj[matchingNodes[0].fullPath] = 'schema';
        }
      };
    },
    resolve(ctx) {
      // not quite sure about this yet...
      const vals = ctx.getDeclaredDependencyValues();
      return vals[Object.keys(vals)[0]];
    },
  });
}
