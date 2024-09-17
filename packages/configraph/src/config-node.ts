import _ from 'lodash-es';
import Debug from 'debug';

import {
  CoercionError, ValidationError, ResolutionError,
} from './errors';

import {
  ConfigraphBaseTypes, ConfigraphDataType, ConfigraphDataTypeDefinitionOrShorthand,
} from './data-types';
import {
  ConfigValue, ConfigValueResolver, createdPickedValueResolver,
  ResolverContext,
} from './resolvers';

import { ConfigraphEntity } from './entity';
import { ConfigraphDataTypeDefinition, SerializedConfigraphNode } from '.';

const debug = Debug('configraph:node');

//! this might be in the wrong place?
export type ConfigValueOverride = {
  /** the value of the override */
  value: ConfigValue;

  /** comments about the item from the file */
  comments?: string

  // TODO: this will get more complex, as env files can be in different levels of the project
  /** where does the value come from */
  source: string;
  /**
   * some overrides apply only in certan envs, for example if coming from `.env.production` */
  envFlag?: string;
};


export class InvalidChildError extends ValidationError {}
export class WaitingForParentResolutionError extends ResolutionError {
  retryable = true;
}
export class WaitingForChildResolutionError extends ResolutionError {
  retryable = true;
}


export type PickedNodeDef<NodeMetadata = unknown> = {
  sourceNode: ConfigraphNode<NodeMetadata>,
  transformValue?: (val: any) => any,
};

//! probably want to add a restriction on node keys?
// config item keys are all checked against this regex
// currently it must start with a letter (to make it a valid js property)
// and can only contain letters, number, and underscore
// we may want to restrict "__" if we use that as the nesting separator for env var overrides?
const VALID_ITEM_KEY_REGEX = /^[a-z]\w+$/i;


export class ConfigraphNode<NodeMetadata = any> {
  /** full chain of items up to the actual config item */
  readonly pickFromNode?: ConfigraphNode<NodeMetadata>;

  readonly type: ConfigraphDataType<unknown, NodeMetadata>;

  constructor(
    readonly key: string,
    defOrShorthand:
    ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata> | PickedNodeDef<NodeMetadata>,
    private parent?: ConfigraphEntity | ConfigraphNode<NodeMetadata>,
  ) {
    // deal with picked items
    if (_.isObject(defOrShorthand) && 'sourceNode' in defOrShorthand) {
      const pickDef = defOrShorthand;
      this.pickFromNode = pickDef.sourceNode;

      // TODO: will need to deal with overriding some parts of the type
      // and probably need to clone / extend it
      this.type = this.pickFromNode.type as any;
      if (this.pickFromNode.children) {
        _.each(this.pickFromNode.children, (sourceChild, childKey) => {
          this.children[childKey] = new (this.constructor as any)(sourceChild.key, { sourceNode: sourceChild }, this);
        });
      }

      // this may end up following up multiple picked + transformed parents
      this.valueResolver = createdPickedValueResolver(this.pickFromNode, pickDef.transformValue);
      this.valueResolver.configNode = this;

      return;
    }


    // similar logic that the data types uses when handling extends
    // except we always create a new "inline" type as the last in the chain
    // see note below about linking to type registry
    let typeDef: ConfigraphDataTypeDefinition;
    if (_.isString(defOrShorthand)) {
      if (!ConfigraphBaseTypes[defOrShorthand]) {
        throw new Error(`found invalid parent (string) in extends chain - "${defOrShorthand}"`);
      } else {
        typeDef = { extends: ConfigraphBaseTypes[defOrShorthand]({}) };
      }
    } else if (_.isFunction(defOrShorthand)) {
      // in this case, we have no settings to pass through, so we pass an empty object
      const shorthandFnResult = defOrShorthand({});
      if (!ConfigraphDataType.checkInstanceOf(shorthandFnResult)) {
        // TODO: put this in schema error instead?
        console.log(ConfigraphDataType, shorthandFnResult);
        throw new Error('invalid schema as result of fn shorthand');
      } else {
        typeDef = { extends: shorthandFnResult };
      }
    } else if (ConfigraphDataType.checkInstanceOf(defOrShorthand)) {
      // TODO: without proper instanceof check, we must resort to `as any`
      typeDef = { extends: defOrShorthand as any };
    } else if (_.isObject(defOrShorthand)) {
      typeDef = defOrShorthand;
    } else {
      // TODO: put this in schema error instead?
      throw new Error('invalid item schema');
    }
    this.type = new ConfigraphDataType<NodeMetadata>(
      typeDef,
      undefined as any, // TODO: better typing here
      undefined,
      // link back to the "type registry" connected to the graph root
      // so that we know the shape of the metadata
      this.parentEntity?.graphRoot?.defaultDataTypeRegistry,
    );

    try {
      // console.log(this.type);
      // special handling for object nodes to initialize children
      if (this.type.extendsType(ConfigraphBaseTypes.object)) {
        _.each(this.type.primitiveType.typeInstanceOptions.children, (childDef, childKey) => {
          this.children[childKey] = new (this.constructor as any)(childKey, childDef, this);
        });
      }
      // TODO: also need to initialize the `itemType` for array and dictionary
      // unless we change how those work altogether...
    } catch (err) {
      this.schemaError = err as Error;
      debug(err);
    }

    this.valueResolver = this.type.valueResolver;
    if (this.valueResolver) this.valueResolver.configNode = this;
  }

  readonly schemaError?: Error;

  overrides: Array<ConfigValueOverride> = [];
  valueFromParent?: ConfigValue;

  valueResolver?: ConfigValueResolver;

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

  get schemaErrors() {
    return this.type.schemaErrors;
  }

  /** whether the schema itself is valid or not */
  get isSchemaValid(): boolean | undefined {
    if (this.schemaErrors?.length) return false;
    return true;
  }

  /** whether the final resolved value is valid or not */
  get isValid(): boolean | undefined {
    if (!this.isSchemaValid) return false;
    if (this.coercionError) return false;
    if (this.validationErrors && this.validationErrors?.length > 0) return false;
    if (this.resolutionError) return false;
    return true;
  }

  children: Record<string, typeof this> = {};

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

  //! previous impl that has key overriding
  // getPath(respectImportOverride = false): string {
  //   const itemKey = (respectImportOverride && this.type.importEnvKey) || this.key;
  //   if (this.parent instanceof DmnoConfigItemBase) {
  //     const parentPath = this.parent.getPath(respectImportOverride);
  //     return `${parentPath}.${itemKey}`;
  //   }
  //   return itemKey;
  // }
  // getFullPath(respectImportOverride = false): string {
  //   if (!this.parentEntity?.id) {
  //     throw new Error('unable to get full path - this item is not attached to a service');
  //   }
  //   return `${this.parentEntity.id}!${this.getPath(respectImportOverride)}`;
  // }

  getPath(): string {
    if (this.parent instanceof ConfigraphNode) {
      const parentPath = this.parent.getPath();
      return `${parentPath}.${this.key}`;
    }
    return this.key;
  }
  getFullPath(): string {
    if (!this.parentEntity?.id) {
      throw new Error('unable to get full path - this item is not attached to a service');
    }
    return `${this.parentEntity.id}!${this.getPath()}`;
  }

  get dependsOnPathsObj(): Record<string, 'schema' | 'resolution'> {
    return this.valueResolver?.getDependencyMap('active') || {};
  }
  get dependsOnPaths() { return _.keys(this.dependsOnPathsObj); }


  _debug?: Debug.Debugger;
  debug(...args: Parameters<Debug.Debugger>) {
    if (!this._debug) this._debug = debug.extend(this.getFullPath());
    this._debug(...args);
  }

  async resolve() {
    //! not quite sure about this - currently the entity is orchestrating resolution order
    //! we'll need more logic to reset this when dependency values change
    // if (this.isFullyResolved) return;

    // RESET
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

    // TODO: might want to skip resolution if we have overrides present?
    const itemResolverCtx = new ResolverContext(this.valueResolver || this);
    if (this.valueResolver) {
      if (!this.valueResolver.isFullyResolved) {
        await this.valueResolver.resolve(itemResolverCtx);
        this.isResolved = true;
        if (this.resolutionError) return;
      }
    } else {
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
      `${this.parentEntity?.id}/${this.getPath()} = `,
      JSON.stringify(this.resolvedRawValue),
      JSON.stringify(this.resolvedValue),
      this.isValid ? '✅' : `❌ ${this.validationErrors?.[0]?.message}`,
    );
  }

  toCoreJSON(): SerializedConfigraphNode {
    return {
      key: this.key,
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
      dataType: this.type.toJSON(),

      resolvedRawValue: this.resolvedRawValue,
      resolvedValue: this.resolvedValue,
      isResolved: this.isResolved,
      children: _.mapValues(this.children, (c) => c.toCoreJSON()),

      resolver: this.valueResolver?.toJSON(),
      // overrides: this.overrides,

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
