import * as _ from 'lodash-es';
import Debug from 'debug';

import {
  CoercionError, ValidationError, ResolutionError,
  SchemaError,
} from './errors';

import { ConfigraphBaseTypes, ConfigraphDataType, ConfigraphDataTypeDefinition } from './data-types';
import {
  ConfigValue, ConfigValueResolver,
  ResolverContext,
  resolverCtxAls,
} from './resolvers';

import { ConfigraphEntity } from './entity';
import { NODE_FULL_PATH_SEP } from './common';
import { SerializedConfigraphNode } from './serialization-types';

const debug = Debug('configraph:node');

//! this might be in the wrong place?
export type ConfigValueOverride = {
  sourceType: string;
  icon?: string;
  sourceLabel?: string;

  /** the value of the override */
  value: ConfigValue;
  /** redacted stringified copy of value */
  _value?: string

  /** comments about the item from the file */
  comments?: string
};


export class InvalidChildError extends ValidationError {}
export class WaitingForParentResolutionError extends ResolutionError {
  _retryable = true;
}
export class WaitingForChildResolutionError extends ResolutionError {
  _retryable = true;
}


export type PickedNodeDef<NodeMetadata = unknown> = {
  sourceNode: ConfigraphNode<NodeMetadata>,
  transformValue?: (val: any) => any,
};

export class ConfigraphNode<NodeMetadata = any> {
  readonly type: ConfigraphDataType<NodeMetadata>;

  constructor(
    readonly key: string,
    nodeDef: ConfigraphDataTypeDefinition<NodeMetadata>,
    private parent?: ConfigraphEntity | ConfigraphNode<NodeMetadata>,
  ) {
    // we create a new "inline" type as the last in the chain
    // see note below about linking to type registry
    // TODO: better typing - remove these "as any"s
    this.type = new ConfigraphDataType<NodeMetadata>(
      nodeDef,
      undefined,
    );

    try {
      // console.log(this.type);
      // special handling for object nodes to initialize children
      if (this.type.extendsType(ConfigraphBaseTypes.object)) {
        _.each(this.type.primitiveType.typeDef._children, (childDef, childKey) => {
          this.children[childKey] = new (this.constructor as any)(childKey, childDef, this);
        });
      }
      // TODO: also need to initialize the `itemType` for array and dictionary
      // unless we change how those work altogether...
    } catch (err) {
      this._schemaErrors.push(err instanceof SchemaError ? err : new SchemaError(err as Error));
      debug(err);
    }

    if (this.valueResolver) this.valueResolver.configNode = this;
  }

  overrides: Array<ConfigValueOverride> = [];
  valueFromParent?: ConfigValue;

  get valueResolver(): ConfigValueResolver | undefined {
    return this.type.valueResolver;
  }

  applyOverrideType(overrideTypeDef: ConfigraphDataTypeDefinition<NodeMetadata>) {
    this.type.applyOverrideType(overrideTypeDef);

    // currently the resolver (in some cases) needs to know about the config node it is attached to
    // and this link was previously set up during the node initialization
    // but this locked this node's resolver to the first definition, and did not take overrides into consideration
    // sp we must reset the valueResolver to the latest version
    // TODO: but I would like to remove the need for this altogether!
    // if we still must do something like this, we could move it to the resolver processing step
    if (this.valueResolver) this.valueResolver.configNode = this;

    // NOTE - we are involving the node here and passing it through because of resolver stuff!
  }


  isResolved = false;
  isFullyResolved = false;

  get resolvedRawValue(): ConfigValue | undefined {
    if (this.overrides.length) {
      return this.overrides[0].value;
    }
    if (this.valueFromParent !== undefined) {
      //! might need some special handling here for whether it is set as undefined
      return this.valueFromParent;
    }
    return this.valueResolver?.resolvedValue;
  }


  dependencyResolutionError?: ResolutionError;

  /** error encountered during resolution */
  get resolutionError(): ResolutionError | undefined {
    return this.dependencyResolutionError
      || this.valueResolver?.selfOrChildResolutionError;
  }

  /** resolved value _after_ coercion logic applied */
  resolvedValue?: ConfigValue;

  // not sure if the coercion error should be stored in resolution error or split?
  /** error encountered during coercion step */
  coercionError?: CoercionError;

  /** more details about the validation failure if applicable */
  validationErrors?: Array<ValidationError>;

  _schemaErrors: Array<SchemaError> = [];

  get schemaErrors() {
    return [
      ...this.type.schemaErrors || [],
      ...this._schemaErrors,
    ];
  }

  /** whether the schema itself is valid or not */
  get isSchemaValid(): boolean {
    if (this.schemaErrors?.length) return false;
    return true;
  }

  /** resolved value validation state (error/warning) */
  get validationState(): 'warn' | 'error' | 'valid' {
    if (!this.isSchemaValid) return 'error';
    const errors = _.compact([
      this.coercionError,
      this.resolutionError,
      ...this.validationErrors || [],
    ]);
    if (!errors.length) return 'valid';
    return _.some(errors, (e) => !e.isWarning) ? 'error' : 'warn';
  }

  /** whether the final resolved value is valid or not */
  get isValid() {
    return this.validationState === 'valid' || this.validationState === 'warn';
  }

  children: Record<string, typeof this> = {};
  get flatChildren(): Array<typeof this> {
    if (_.isEmpty(this.children)) return [];
    return _.flatMap(
      _.values(this.children),
      (c) => [
        c,
        ...c.flatChildren,
      ],
    );
  }

  get parentNode(): ConfigraphNode | undefined {
    if (this.parent instanceof ConfigraphNode) {
      return this.parent;
    }
  }

  get parentEntity(): ConfigraphEntity | undefined {
    if (this.parent instanceof ConfigraphEntity) {
      return this.parent;
    } else if (this.parent instanceof ConfigraphNode) {
      return this.parent.parentEntity;
    }
  }

  get path(): string {
    if (this.parent instanceof ConfigraphNode) {
      const parentPath = this.parent.path;
      return `${parentPath}.${this.key}`;
    }
    return this.key;
  }
  get fullPath(): string {
    if (!this.parentEntity?.id) {
      throw new Error('unable to get full path - this item is not attached to a service');
    }
    return `${this.parentEntity.id}${NODE_FULL_PATH_SEP}${this.path}`;
  }

  get dependsOnPathsObj(): Record<string, 'schema' | 'resolution'> {
    return this.valueResolver?.getDependencyMap('active') || {};
  }
  get dependsOnPaths() { return _.keys(this.dependsOnPathsObj); }


  _debug?: Debug.Debugger;
  debug(...args: Parameters<Debug.Debugger>) {
    if (!this._debug) this._debug = debug.extend(this.fullPath);
    this._debug(...args);
  }

  async resolve() {
    // RESET
    //! we'll need more logic to reset properly as dependency values are changing, once we incorporate multi-stage async resolution
    this.dependencyResolutionError = undefined;

    // if this is a child of another node, we need the parent to have resolved its value first, so it can pass down a value
    if (this.parentNode) {
      if (!this.parentNode.isResolved) {
        this.debug('waiting for parent to resolve');
        // we'll bail and expect to come back again later
        //! might want to store some kind of state?/error
        return;
      }
      if (!this.parentNode.isValid) {
        this.debug('parent not valid');
        this.dependencyResolutionError = new ResolutionError('Parent value is invalid');
        return;
      }
      const parentObjectValue: any = this.parentNode.resolvedValue;
      if (this.parentNode.resolvedValue && this.key in parentObjectValue as any) {
        // TODO: probably need to differentiate between being unset and value of undefined
        this.debug('got value from parent');
        this.valueFromParent = parentObjectValue[this.key];
      }
    }


    // now deal with resolution
    // TODO: need to track dependencies used in coerce/validate/etc

    const itemResolverCtx = new ResolverContext((!this.overrides.length && this.valueResolver) || this);
    resolverCtxAls.enterWith(itemResolverCtx);

    if (this.overrides.length) {
      this.debug('using override - marking as resolved');
      this.isResolved = true;
    } else if (this.valueResolver) {
      if (!this.valueResolver.isFullyResolved) {
        this.debug('running node resolver');
        await this.valueResolver.resolve(itemResolverCtx);
        // some errors mean we are waiting for another node to resolve, so we will retry them
        // but most other normal errors we know we are done
        if (this.resolutionError && this.resolutionError.retryable) {
          return;
        } else {
          this.isResolved = true;
        }
      }
    } else {
      this.debug('no resolver - marking as resolved');
      this.isResolved = true;
    }

    // apply coercion logic (for example - parse strings into numbers)
    // NOTE - currently we trigger this if the resolved value was not undefined
    // but we may want to coerce undefined values in some cases as well?
    // need to think through errors + overrides + empty values...
    if (this.resolvedRawValue !== undefined && this.resolvedRawValue !== null) {
      try {
        // TODO: not sure if we want to reuse the resolver context?
        const coerceResult = this.type.coerce(_.cloneDeep(this.resolvedRawValue), itemResolverCtx);
        if (coerceResult instanceof CoercionError) {
          this.coercionError = coerceResult;
        } else {
          this.resolvedValue = coerceResult;
        }
      } catch (err) {
        this.coercionError = new CoercionError(err as Error);
      }
      if (this.coercionError) {
        this.isFullyResolved = true;
        return;
      }
    }

    // special handling for objects - roll up child values into parent
    if (this.type.extendsType(ConfigraphBaseTypes.object)) {
      let waitingForChildCount = 0;
      _.each(this.children, (c) => {
        if (!c.isFullyResolved) waitingForChildCount++;
      });

      if (waitingForChildCount > 0) {
        this.debug('waiting for children');
        // again we just bail and expect to try again later
        return;
      }

      // now roll up the child values into the parent object
      let finalParentObjectValue: any;
      for (const childKey in this.children) {
        const childNode = this.children[childKey];
        if (childNode.resolvedValue !== undefined) {
          finalParentObjectValue ||= {};
          finalParentObjectValue[childKey] = childNode.resolvedValue;
        }
      }
      this.resolvedValue = finalParentObjectValue;
      // special handling to maintain empty object vs undefined
      if (finalParentObjectValue === undefined) {
        if (this.resolvedRawValue && _.isEmpty(this.resolvedRawValue)) {
          this.resolvedValue = {};
        }
      }

      // now do one more pass to check if we have invalid children, and mark the object as invalid
      if (this.resolvedValue !== undefined && this.resolvedValue !== null) {
        const invalidChildCount = _.sumBy(_.values(this.children), (c) => (!c.isValid ? 1 : 0));
        if (invalidChildCount) {
          this.validationErrors = [
            new InvalidChildError(
              invalidChildCount === 1
                ? 'This node contains 1 invalid child'
                : `This node contains ${invalidChildCount} invalid children`,
            ),
          ];
        }
      }
    }

    // run validation logic
    if (!this.validationErrors) {
      const validationResult = this.type.validate(_.cloneDeep(this.resolvedValue), itemResolverCtx);
      this.validationErrors = validationResult === true ? [] : validationResult;
    }

    this.isFullyResolved = true;

    debug(
      `${this.parentEntity?.id}/${this.path} =`,
      JSON.stringify(this.resolvedRawValue),
      JSON.stringify(this.resolvedValue),
      this.isValid ? '✅' : `❌ ${this.validationErrors?.[0]?.message}`,
    );
  }

  get mappedToNodePath() {
    //! This is not exactly right, but it's close
    // what we want to know if a node is mapped _exactly_ to another without transformation (ie inject, configPath)
    // it is currently used for the vault plugin to know what key/path to use when writing the vault key to the .env.local file
    if (this.dependsOnPaths.length === 1) return this.dependsOnPaths[0];
  }

  toCoreJSON(): SerializedConfigraphNode {
    return {
      id: this.fullPath,
      key: this.key,
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
      validationState: this.validationState,
      dataType: this.type.toJSON(),

      resolvedRawValue: this.resolvedRawValue,
      resolvedValue: this.resolvedValue,
      isCoerced: this.resolvedRawValue !== this.resolvedValue,

      isResolved: this.isResolved,
      children: _.mapValues(this.children, (c) => c.toCoreJSON()),

      mappedToNodePath: this.mappedToNodePath,

      resolver: this.valueResolver?.toJSON(),
      overrides: this.overrides,

      schemaErrors: this.schemaErrors?.length
        ? _.map(this.schemaErrors, (err) => err.toJSON())
        : undefined,
      resolutionError: this.resolutionError?.toJSON(),
      coercionError: this.coercionError?.toJSON(),
      validationErrors:
        this.validationErrors?.length
          ? _.map(this.validationErrors, (err) => err.toJSON())
          : undefined,
    };
  }


  // TS type generation customization
  // TODO: probably want to add more options here...
  typeGen?: {
    customLabel?: () => string | undefined;
    customSuffix?: () => string | undefined;
  };
}
