import * as _ from 'lodash-es';

import { ConfigraphDataType } from './data-types';
import { createResolver, DependencyNotResolvedResolutionError } from './resolvers';
import { ConfigraphNode } from './config-node';
import { SchemaError } from './errors';
import { templateContextAls } from './entity-template';

// special new data type that will delegate calls back to the original "picked" data type
export class PickedDataType extends ConfigraphDataType {
  private _templateRootId: string | undefined;

  private _templateRootEntityId: string = '';
  private _templateRootBaseId: string = '';

  constructor(
    private _pickFromEntityId?: string,
    private _pickFromPath?: string,
  ) {
    super({});

    // use ALS to get the current executing template so we can adjust relative paths
    const templateContext = templateContextAls.getStore();
    if (templateContext?.baseId) {
      this._templateRootBaseId = templateContext.baseId;
      if (templateContext?.rootRelativeId) {
        this._templateRootEntityId = `${templateContext.baseId}${templateContext.rootRelativeId}`;
      }
    }

    // track whether this pick was defined within a template or not
    // as it will help us re-map entity the ID if necessary
  }

  get pickFromEntityId() { return this._pickFromEntityId; }
  get pickFromPath() { return this._pickFromPath; }

  pickFromNode: ConfigraphNode | undefined;

  finishInit(pickToNode: ConfigraphNode) {
    if (!pickToNode.parentEntity) {
      throw new Error('error initializing picked node - no parent entity found');
    }

    // console.log('finish pick init', pickToNode.fullPath);
    // console.log(this._templateRootBaseId, this._templateRootEntityId);

    const graphRoot = pickToNode.parentEntity.graphRoot;

    // default to graph root if no entity ID is specified
    if (!this._pickFromEntityId) {
      this._pickFromEntityId = this._templateRootEntityId || pickToNode.parentEntity?.graphRoot.rootEntity.id;
    } else {
      if (this._templateRootBaseId) {
        this._pickFromEntityId = `${this._templateRootBaseId}${this._pickFromEntityId}`;
      }
    }
    // default to picking using the same key
    // TODO: what about nested paths?
    if (!this._pickFromPath) {
      this._pickFromPath = pickToNode.key;
    }


    if (!this._pickFromEntityId || !this._pickFromPath) {
      throw new Error('error initializing picked node');
    }

    if (!graphRoot.entitiesById[this._pickFromEntityId]) {
      this._schemaErrors.push(new SchemaError(`invalid entity id to pick from: ${this._pickFromEntityId}`));
      return;
    }

    const pickFromNode = graphRoot.getNode(this._pickFromEntityId, this._pickFromPath);
    if (!pickFromNode) {
      this._schemaErrors.push(new SchemaError(`invalid path to pick from: ${this._pickFromEntityId} > ${this._pickFromPath}`));
      return;
    }
    if (pickFromNode === pickToNode) {
      this._schemaErrors.push(new SchemaError('node cannot pick itself'));
      return;
    }


    if (isNodePickingFromNode(pickFromNode, pickToNode)) {
      this._schemaErrors.push(new SchemaError('pick cycle detected!'));
      return;
    }

    this.pickFromNode = pickFromNode;

    // now we just point the parent of this type to the original with a special resolver
    this.parentType = new ConfigraphDataType({
      extends: pickFromNode.type,
      value: createdPickedValueResolver(pickFromNode),
    });

    // we must wire up the value resolver to the current node
    // which is normally is done earlier for non picked nodes
    this.parentType.valueResolver!.configNode = pickToNode;

    // TODO: need to add copies of child nodes if object
  }
}

function isNodePickingFromNode(node: ConfigraphNode, possibleSourceNode: ConfigraphNode) {
  let currentType = node.type;
  while (currentType) {
    if (
      currentType instanceof PickedDataType
      && currentType.pickFromNode === possibleSourceNode
    ) return true;

    // walk up the chain
    if (!currentType.parentType) break;
    currentType = currentType.parentType;

    // TODO: will need to deal with override types - especially once we can pick within templates
  }
  return false;
}

type PickSettings = { entityId?: string, path?: string };
export function pick(entityId?: string, pickFromPath?: string): PickedDataType;
export function pick(opts: PickSettings): PickedDataType;
export function pick(entityIdOrObj?: string | PickSettings, pickFromPath?: string): PickedDataType {
  if (_.isString(entityIdOrObj)) {
    return new PickedDataType(entityIdOrObj, pickFromPath);
  } else {
    return new PickedDataType(entityIdOrObj?.entityId, entityIdOrObj?.path);
  }
}

export function createdPickedValueResolver(
  sourceNode: ConfigraphNode,
  valueTransform?: ((val: any) => any),
) {
  return createResolver({
    icon: 'mdi:content-duplicate',
    label: 'picked value',
    process() {
      this.dependsOnPathsObj[sourceNode.fullPath] = 'schema';
    },
    async resolve() {
      // since we handle resolution of services in the right order
      // we can assume the picked value will be resolved already (if it was possible at all)
      if (!sourceNode.isResolved) {
        throw new DependencyNotResolvedResolutionError('picked value has not been resolved yet');
      }

      if (valueTransform) {
        return valueTransform(sourceNode.resolvedValue);
      } else {
        return sourceNode.resolvedValue;
      }
    },
  });
}

