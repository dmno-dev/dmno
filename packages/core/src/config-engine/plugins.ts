import _ from 'lodash-es';
import Debug from 'debug';
import {
  ConfigPath, DmnoConfigItemBase, DmnoService, DmnoWorkspace, TypeExtendsDefinition,
} from './config-engine';
import { DmnoDataType } from './base-types';
import { ConfigValue, ConfigValueResolver, createResolver } from './resolvers/resolvers';
import { CoercionError, SchemaError, ValidationError } from './errors';
import { SerializedDmnoPlugin, SerializedDmnoPluginInput } from '../config-loader/serialization-types';

const debug = Debug('dmno:plugins');


export type ClassOf<T> = new (...args: Array<any>) => T;

type MarkKeysRequired<R extends Record<any, any>, RequiredKeys extends keyof R> =
  Partial<R>
  & Required<Pick<R, RequiredKeys>>;

// describes a "schema" object where an optional "required" prop can be set to true
type SchemaWithRequiredProp = { [k: string]: any, required?: boolean };
// extracts keys that have `required: true` set on them
type RequiredKeys<
  // note that the Readonly is important here as otherwise true is always treated as a boolean
  S extends Readonly<Record<string, SchemaWithRequiredProp>>,
> = { [K in keyof S]: S[K]['required'] extends true ? K : never }[keyof S];

/** special symbol used to set an plugin input to be filled via type-based injection */
export const InjectPluginInputByType = Symbol('InjectPluginInputByType');

type PluginSchemaItemDefinition = {
  /** is this input required */
  required?: boolean;
  /** description of the input */
  description?: string,
  /** data type of this input */
  extends?: TypeExtendsDefinition,

  // TODO: what other item schema properties do we want?
};

export type DmnoPluginInputSchema = Record<string, PluginSchemaItemDefinition>;

type PluginInputMappingValue<StaticValueType = ConfigValue> =
  ConfigPath |
  typeof InjectPluginInputByType |
  StaticValueType;

export type DmnoPluginClass<ChildClass extends DmnoPlugin = DmnoPlugin> =
  { new (): ChildClass } & typeof DmnoPlugin<ChildClass>;

export const _PluginInputTypesSymbol: unique symbol = Symbol('plugin-input-types');

export type DmnoPluginInputMap<S extends DmnoPluginInputSchema> =
MarkKeysRequired<
Record<keyof S, PluginInputMappingValue | undefined>,
RequiredKeys<S>
>;


export type GetPluginInputTypes<P extends DmnoPlugin> = P[typeof _PluginInputTypesSymbol];

export class DmnoPluginInputItem<ValueType = any> {
  readonly dataType: DmnoDataType;

  schemaError?: SchemaError;

  /** error encountered during coercion step */
  coercionError?: CoercionError;
  /** more details about the validation failure if applicable */
  validationErrors?: Array<ValidationError>;

  /** resolved value _before_ coercion logic applied */
  resolvedRawValue?: ConfigValue;
  resolvedValue?: ValueType;

  isResolved = false;
  resolvingConfigItems?: Array<DmnoConfigItemBase>;

  get resolutionMethod() {
    if (this.typeInjectionEnabled) return 'type';
    if (this.configPath) return 'path';
    if (this.resolvedRawValue) return 'static';
  }

  /** flag to enable type-based injection */
  typeInjectionEnabled = false;
  /** config path to use in order to fill this input */
  configPath?: ConfigPath;


  constructor(readonly key: string, readonly itemSchema: PluginSchemaItemDefinition) {
    // currently the itemSchema is all data-typey stuff... but we may need to pick certain keys out
    // in order to make it compatible with DmnoDataType
    this.dataType = new DmnoDataType(itemSchema, undefined, undefined);
    // not sure if we want to support the same kind of shorthands we do in the shcemea
  }

  /** used to set a static value to resolve this input */
  setStaticValue(val: ValueType) {
    this.typeInjectionEnabled = false;
    this.configPath = undefined;
    this.setValue(val);
  }
  /** used to enable type-based injection to resolve this input */
  enableTypeInjection() {
    this.configPath = undefined;
    this.typeInjectionEnabled = true;
  }
  /** used to set a specific config path to resolve this input */
  setPathInjection(configPath: ConfigPath) {
    this.typeInjectionEnabled = false;
    this.configPath = configPath;
  }

  /** set the value after being resolved  */
  private setValue(val: ValueType) {
    this.resolvedRawValue = val as any; // TODO

    // run coercion
    const coerceResult = this.dataType.coerce(_.cloneDeep(this.resolvedRawValue));
    if (coerceResult instanceof CoercionError) {
      this.coercionError = coerceResult;
    } else {
      this.resolvedValue = coerceResult;
    }
    this.isResolved = true;

    // run validation
    const validationResult = this.dataType?.validate(this.resolvedValue);
    this.validationErrors = validationResult === true ? [] : validationResult;
  }

  attemptResolutionUsingConfigItem(item: DmnoConfigItemBase) {
    // if we were waiting for this item by path, it is now resolved
    if (this.configPath?.path === item.getPath()) {
      debug(`PLUGIN input "${this.key}" resolved by path`, this.configPath.path);
      this.resolvingConfigItems = [item];
      this.setValue(item.resolvedValue as any);
    } else if (this.resolutionMethod === 'type') {
      if (item.type.extendsType(this.dataType.typeFactoryFn)) {
        // TODO: also want to not enable this if type is too primitive
        // or maybe even allow disabling injection?

        debug(`PLUGIN input "${this.key}" resolved by type`, item.type.typeDef.typeLabel);
        if (this.resolvingConfigItems?.length) {
          this.resolvingConfigItems.push(item);
          // TODO - might want to add a details field on our errors to put additional info?
          const paths = _.map(this.resolvingConfigItems, (i) => i.getPath());
          this.schemaError = new SchemaError(`Received multiple values during type-based injection - ${paths.join(', ')}`);
        } else {
          this.resolvingConfigItems = [item];
          this.setValue(item.resolvedValue as any);
        }
      }
    }
  }

  // meant to be called after all possible resolutions could have occurred
  // worst case this can be when the service is done, but ideally would be earlier?
  checkResolutionStatus() {
    // TODO: figure out what does "isResolved" mean

    if (this.configPath && !this.isResolved) {
      this.schemaError = new SchemaError(`Input resolution via path "${this.configPath.path}" failed`);
    } else if (this.resolutionMethod === 'type' && !this.isResolved) {
      this.schemaError = new SchemaError('Input resolution by type-based injection failed');
    }


    if (this.itemSchema.required) {
      if (!this.isResolved) {
        this.schemaError = new SchemaError('Item is required but was not resolved');
      }
      // the input item should already be throwing a validation error for being empty
    }
  }

  get isValid() {
    if (this.schemaError) return false;
    if (this.coercionError) return false;
    if (this.validationErrors?.length) return false;
    return true;
  }

  toJSON(): SerializedDmnoPluginInput {
    return {
      key: this.key,
      resolutionMethod: this.resolutionMethod,
      isValid: this.isValid,
      isResolved: this.isResolved,
      // TODO: in the future we may have an array case so we may want to make this an array
      // but it will likely be a single 90+% of the time...
      mappedToItemPath: this.resolvingConfigItems?.[0]?.getFullPath(),
      resolvedValue: this.resolvedValue,
      coercionError: this.coercionError?.toJSON(),
      schemaError: this.schemaError?.toJSON(),
      validationErrors:
        this.validationErrors?.length
          ? _.map(this.validationErrors, (err) => err.toJSON())
          : undefined,
    };
  }
}

export abstract class DmnoPlugin<
  ChildPlugin extends DmnoPlugin = NoopPlugin,
> {
  constructor(readonly instanceName: string) {
    // see below, we are registering the plugin in a singleton object
    if (allPlugins[instanceName]) {
      throw new SchemaError(`Plugin instance names must be unique! Duplicate name: ${instanceName}`);
    }
    allPlugins[instanceName] = this;

    initializedPluginInstanceNames.push(instanceName);

    // const callStack = new Error('').stack!.split('\n');
    // const pluginDefinitionPath = callStack[2]
    //   .replace(/.*\(/, '')
    //   .replace(/:.*\)/, '');
    // // special case for local dev when we have the plugins symlinked by pnpm
    // if (pluginDefinitionPath.includes('/core/packages/plugins/')) {
    //   const pluginPackageName
    // } else {

    // }
    // console.log(pluginDefinitionPath);
  }

  /** name of the plugin itself - which is the name of the class */
  pluginType = this.constructor.name;
  /** iconify icon name */
  icon?: string;

  static cliPath?: string;

  /**
   * reference back to the service this plugin was initialized in
   * NOTE - when using injection, it will still be the original initializing service
   * */
  initByService?: DmnoService;
  injectedByServices?: Array<DmnoService>;

  /** schema for the inputs this plugin needs - stored on the class */
  protected static readonly inputSchema: DmnoPluginInputSchema;
  /** helper to get the inputSchema from within a instance of the class */
  get inputSchema() {
    const PluginClass = this.constructor as typeof DmnoPlugin;
    return PluginClass.inputSchema;
  }

  /**
   * tracks the status of each input
   * how it will be resolved, status of that resolution, and the resolvedValue
   * */
  readonly inputItems: {
    [K in keyof GetPluginInputTypes<ChildPlugin>]-?:
    // PluginInputStateItem<PluginInputTypes<ChildPlugin>[K]>
    DmnoPluginInputItem<GetPluginInputTypes<ChildPlugin>[K]>
  } = _.mapValues(this.inputSchema, (itemSchema, itemKey) => new DmnoPluginInputItem(itemKey, itemSchema)) as any; // TODO: would be nice to remove this any


  getInputItem<K extends keyof GetPluginInputTypes<ChildPlugin>>(
    key: K,
    // TS wasn't quite happy unless I explicitly added this return type
  ) {
    return this.inputItems[key];
  }

  private _inputsAllResolved = false;
  get inputsAllResolved() { return this._inputsAllResolved; }

  protected setInputMap(
    inputMapping: DmnoPluginInputMap<DmnoPluginClass<ChildPlugin>['inputSchema']
    >,
  ) {
    for (const itemKey in this.inputSchema) {
      // const itemSchema = this.inputSchema[itemKey];
      const val = inputMapping[itemKey];

      if (val instanceof ConfigPath) {
        this.inputItems[itemKey].setPathInjection(val);
      } else if (val === InjectPluginInputByType) {
        this.inputItems[itemKey].enableTypeInjection();
      } else if (val !== undefined && val !== null) {
        // TODO: remove this any
        this.inputItems[itemKey].setStaticValue(val as any);
      }
    }
  }


  /**
   * map of input keys to their generated types
   * this will be filled in via our type auto-generation process
   * and overridden via module augmentation
   * */
  // we use a symbol here so it doesn't show up in autocomplete (it doesn't actually exist)
  // it is just used to type many other things in the class
  [_PluginInputTypesSymbol]: Record<string, any> = {};

  inputValues = new Proxy<GetPluginInputTypes<ChildPlugin>>({}, {
    get: (target, inputKey) => {
      if (_.isSymbol(inputKey)) return;
      return this.inputItems[inputKey]?.resolvedValue;
    },
    // set(target, name, value) {
    //   return true;
    // },
  });


  // TODO: add some kind of hooks system so plugin author can run some logic
  // when each (or all?) inputs are resolved. This would let us for example
  // make an api request to validate that all the settings together are valid?

  attemptInputResolutionsUsingConfigItem(item: DmnoConfigItemBase) {
    for (const inputKey in this.inputItems) {
      this.inputItems[inputKey].attemptResolutionUsingConfigItem(item);
    }
  }

  checkItemsResolutions() {
    for (const inputKey in this.inputItems) {
      this.inputItems[inputKey].checkResolutionStatus();
    }
  }

  get isValid() {
    return _.every(_.values(this.inputItems), (i) => i.isValid);
  }


  resolvers: Array<ConfigValueResolver> = [];
  createResolver(def: Parameters<typeof createResolver>[0]): ReturnType<typeof createResolver> {
    const r = createResolver({
      createdByPlugin: this,
      ...def,
    });
    this.resolvers.push(r);
    return r;
  }

  // private hooks?: {
  //   onInitComplete?: () => Promise<void>;
  // };

  toJSON(): SerializedDmnoPlugin {
    return {
      pluginType: this.pluginType,
      cliPath: (this.constructor as any).cliPath,
      instanceName: this.instanceName,
      isValid: this.isValid,
      initializedInService: this.initByService?.serviceName || '',
      injectedIntoServices: _.map(this.injectedByServices, (s) => s.serviceName),
      inputs: _.mapValues(this.inputItems, (i) => i.toJSON()),
      usedByConfigItemResolverPaths: _.map(this.resolvers, (r) => r.getFullPath()),
    };
  }


  static injectInstance<T extends DmnoPlugin>(
    this: new (...args: Array<any>) => T,
    instanceName: string,
  ) {
    const pluginToInject = allPlugins[instanceName];
    if (!pluginToInject) {
      throw new SchemaError(`Plugin injection failed - no plugin named "${instanceName}" exists`);
    }
    if (!pluginToInject.initByService || pluginToInject.initByService.serviceName !== 'root') {
      throw new SchemaError(`Plugin injection failed for "${instanceName}" - you can only inject plugins from the root`);
    }

    if (!(pluginToInject instanceof this)) {
      throw new SchemaError(`Type of plugin being injected does not match. Requested = ${this.name}, Injected = ${(pluginToInject as any).constructor.name}`);
    }
    injectedPluginInstanceNames.push(instanceName);
    return pluginToInject as T;
  }
}

// TODO: this is a pretty naive approach to capturing the plugins while loading config
// probably should move to something like AsnycLocalStorage to make it more flexible

let allPlugins: Record<string, DmnoPlugin> = {};
let initializedPluginInstanceNames: Array<string> = [];
let injectedPluginInstanceNames: Array<string> = [];

export function beginWorkspaceLoadPlugins(workspace: DmnoWorkspace) {
  allPlugins = workspace.plugins;
}

export function beginServiceLoadPlugins() {
  initializedPluginInstanceNames = [];
  injectedPluginInstanceNames = [];
}
export function finishServiceLoadPlugins(service: DmnoService) {
  service.injectedPlugins = _.values(_.pick(allPlugins, injectedPluginInstanceNames));
  service.ownedPlugins = _.values(_.pick(allPlugins, initializedPluginInstanceNames));

  _.each(injectedPluginInstanceNames, (pName) => {
    allPlugins[pName].injectedByServices ||= [];
    allPlugins[pName].injectedByServices?.push(service);
  });
  _.each(initializedPluginInstanceNames, (pName) => {
    allPlugins[pName].initByService = service;
  });
}

class NoopPlugin extends DmnoPlugin {}
