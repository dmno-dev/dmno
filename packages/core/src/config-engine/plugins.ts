import _, { isSymbol } from 'lodash-es';
import { input } from '@inquirer/prompts';
import {
  ConfigItemDefinition, ConfigPath, DmnoConfigItemBase, ResolverContext, TypeExtendsDefinition,
} from './config-engine';
import { DmnoDataType, DmnoDataTypeFactoryFn } from './base-types';
import { ConfigValue, ConfigValueResolver } from './resolvers/resolvers';

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
  /** data type of this input */
  extends?: TypeExtendsDefinition,
};

export type DmnoPluginInputSchema = Record<string, PluginSchemaItemDefinition>;

type PluginInputStateItem<ResolvedValueType = ConfigValue> = {
  // key: string;
  path?: ConfigPath;
  resolvedValue?: ResolvedValueType | undefined | null;
  isResolved?: boolean;
  // should be able to infer this from other data but just tracking for now
  method?: 'path' | 'injection-by-type' | 'static';
};

type PluginInputMappingValue<StaticValueType = ConfigValue> =
  ConfigPath |
  typeof InjectPluginInputByType |
  StaticValueType;

export type DmnoPluginClass<ChildClass extends DmnoPlugin = DmnoPlugin> =
  { new (): ChildClass } & ChildClass;

export const _PluginInputTypes: unique symbol = Symbol('plugin-input-types');

export type DmnoPluginInputMap<S extends DmnoPluginInputSchema, InputTypes = unknown> =
MarkKeysRequired<
Record<keyof S, PluginInputMappingValue<InputTypes> | undefined>,
RequiredKeys<S>
>;


type PluginInputTypes<P extends DmnoPlugin> = P[typeof _PluginInputTypes];

// export abstract class DmnoPlugin<
// // InputSchema extends DmnoPluginInputSchema = any,
// // InputTypes extends { [k in keyof InputSchema]?: any } = any,
// > {

export abstract class DmnoPlugin<
  ChildPlugin extends DmnoPlugin = NoopPlugin,
> {
  /** schema for the inputs this plugin needs - stored on the class */
  protected static readonly inputSchema: DmnoPluginInputSchema;
  /** helper to get the inputSchema from within a instance of the class */
  get inputSchema() {
    const PluginClass = this.constructor as typeof DmnoPlugin;
    return PluginClass.inputSchema;
  }

  // static init<P extends DmnoPlugin>(
  //   this: DmnoPluginClass<P>,
  //   inputs: DmnoPluginClass<P>['inputSchema'],
  // ): P {
  //   const PluginClass = this.constructor as any;
  //   return new PluginClass();
  // }
  // constructor(inputs: DmnoPluginInputMap<typeof OnePasswordDmnoPlugin.inputSchema>) {
  //   super();
  //   this.setInputMap(inputs);
  // }

  /**
   * tracks the status of each input
   * how it will be resolved, status of that resolution, and the resolvedValue
   * */
  private inputState: {
    [K in keyof PluginInputTypes<ChildPlugin>]: PluginInputStateItem<PluginInputTypes<ChildPlugin>[K]>
  } = _.mapValues(this.inputSchema, () => ({})) as any;


  getInputState<K extends keyof PluginInputTypes<ChildPlugin>>(
    key: K,
    // TS wasn't quite happy unless I explicitly added this return type
  ): PluginInputStateItem<PluginInputTypes<ChildPlugin>[K]> {
    return this.inputState[key];
  }

  private _inputsAllResolved = false;
  get inputsAllResolved() { return this._inputsAllResolved; }

  protected setInputMap(
    inputMapping: DmnoPluginInputMap<DmnoPluginClass<ChildPlugin>['inputSchema']
    // inputMapping: DmnoPluginInputMap<DmnoPluginClass<P>['inputSchema']
    >,
  ) {
    for (const itemKey in this.inputSchema) {
      // const itemSchema = this.inputSchema[itemKey];
      this.setInputValue(itemKey, inputMapping[itemKey] as any);
    }
  }

  setInputValue<
    K extends keyof PluginInputTypes<ChildPlugin>,
  >(
    key: K,
    inputValueOrMapping?: ConfigPath | typeof InjectPluginInputByType | PluginInputTypes<ChildPlugin>[K],
  ) {
    // if no mapping, we'll at least initialize an object here
    // so we can later store an error on it
    if (inputValueOrMapping === undefined) {
      this.inputState[key] = {
        isResolved: false,
      };

    // this input will be filled using a config path within the service it was initialized in
    } else if (inputValueOrMapping instanceof ConfigPath) {
      this.inputState[key] = {
        path: inputValueOrMapping,
        isResolved: false,
        method: 'path',
      };

    // user is opting into auto-injection of the value based on its type
    } else if (inputValueOrMapping === InjectPluginInputByType) {
      this.inputState[key] = {
        isResolved: false,
        method: 'injection-by-type',
      };

    // otherwise we assume a value was passed in, so we store the value and mark it as resolved
    } else {
      this.inputState[key] = {
        resolvedValue: inputValueOrMapping,
        isResolved: true,
        method: 'static',
      };
    }
  }




  /**
   * map of input keys to their generated types
   * this will be filled in via our type auto-generation process
   * and overridden via module augmentation
   * */
  // we use a symbol here so it doesn't show up in autocomplete (it doesn't actually exist)
  // it is just used to type many other things in the class
  [_PluginInputTypes]: Record<string, any> = {};

  inputValues = new Proxy<PluginInputTypes<ChildPlugin>>({}, {
    get: (target, inputKey) => {
      if (_.isSymbol(inputKey)) return;
      return this.inputState[inputKey]?.resolvedValue;
    },
    set(target, name, value) {
      return true;
    },
  });


  // TODO: add some kind of hooks system so plugin author can run some logic
  // when each (or all?) inputs are resolved. This would let us for example
  // make an api request to validate that all the settings together are valid?

  checkIfResolvedConfigItemResolvesInput(item: DmnoConfigItemBase) {
    const inputSchema = this.inputSchema;

    const PLUGIN_NAME = this.constructor.name;

    for (const inputKey in inputSchema) {
      const inputSchemaItem = inputSchema[inputKey];

      const inputMappingState = this.inputState[inputKey];

      // normally users will call setInputMap which will fill all inputs
      if (!inputMappingState) return;

      // if we were waiting for this item by path, it is now resolved
      if (inputMappingState?.path?.path === item.getPath()) {
        console.log(`${PLUGIN_NAME}: input "${inputKey}" resolved by path`, item.resolvedValue);
        inputMappingState.resolvedValue = item.resolvedValue as any;
        inputMappingState.isResolved = true;

      // check if there was no input value and the type matches
      } else if (
        inputMappingState.method === 'injection-by-type'
        && !inputMappingState.isResolved
        // beacuse extends can be a few forms, here we are narrowing it down to something like `extends: SomeCustomType`
        // so we know its just a raw type itself
        && inputSchemaItem.extends
        && !_.isString(inputSchemaItem.extends)
        && _.isFunction(inputSchemaItem.extends)
      ) {
        // console.log(inputSchemaItem.extends().)

        // note - this is all very fragile and making specific assumptions
        // so will need to be made more flexible...

        // currently I'm assuming the item is an inline defined type
        // which "extends" our type in question

        // console.log(item.type.parentType?.typeDef.typeLabel, inputSchemaItem.extends({}).typeDef.typeLabel);

        // here we check if that parent type extends the type from the input schema

        // we'll also want to make this only apply if it's not a primitive type
        // and apply some "auto-inject" option to enable/disable
        // potentially that should be toggle-able on the datatype AND on the input

        if (item.type.parentType?.extendsType(inputSchemaItem.extends)) {
          console.log(`${PLUGIN_NAME}: input "${inputKey}" resolved by type`, item.type.parentType.typeDef.typeLabel);

          inputMappingState.isResolved = true;
          inputMappingState.resolvedValue = item.resolvedValue as any;
        }
      }
    }
  }
}


// export function createDmnoPlugin<Resolvers extends { [fnName: string]: (...args: Array<any>) => ConfigValueResolver }>(
//   opts: {
//     inputSchema?: Record<string, PluginSchemaItemDefinition>,
//     resolvers: Resolvers,
//   }) {
//   return {
//     init() {
//       return { ...opts.resolvers };
//     },

//   };
// }
// class DmnoPluginInternal<Inputs> {

// }



// TODO: this is a pretty naive approach to capturing the plugins while loading config
// probably should move to something like AsnycLocalStorage to create a more flexible

let injectablePlugins: Record<string, DmnoPlugin> = {};
let currentPlugins: Record<string, DmnoPlugin> = {};
let processingRootConfig = false;

export function startPluginRegistration(isRoot = false) {
  processingRootConfig = isRoot;
  currentPlugins = {};
  // return a reference so the loader executable can have a reference to all the plugins after loading a service
  return currentPlugins;
}
export function finishPluginRegistration() {
  if (processingRootConfig) {
    injectablePlugins = currentPlugins;
    processingRootConfig = false;
  }
}

export function registerPlugin<T extends DmnoPlugin>(plugin: T) : T;
export function registerPlugin<T extends DmnoPlugin>(name: string, plugin: T): T;
export function registerPlugin<T extends DmnoPlugin>(nameOrPlugin: string | T, pluginOrUndefined?: T) {
  const name = _.isString(nameOrPlugin) ? nameOrPlugin : undefined;
  const plugin = _.isString(nameOrPlugin) ? pluginOrUndefined! : nameOrPlugin;

  const injectionName = _.compact([plugin.constructor.name, name]).join('/');
  currentPlugins[injectionName] = plugin;

  return plugin;
}


export function injectPlugin<T extends DmnoPlugin>(pluginClass: ClassOf<T>) : T;
export function injectPlugin<T extends DmnoPlugin>(name: string, pluginClass: ClassOf<T>): T;
export function injectPlugin<T extends DmnoPlugin>(
  nameOrPluginClass: string | ClassOf<T>,
  pluginClassOrUndefined?: ClassOf<T>,
) {
  const name = _.isString(nameOrPluginClass) ? nameOrPluginClass : undefined;
  const pluginClass = _.isString(nameOrPluginClass) ? pluginClassOrUndefined! : nameOrPluginClass;

  const injectionName = _.compact([pluginClass.name, name]).join('/');

  const pluginToInject = injectablePlugins[injectionName];
  // console.log('try to inject plugin', injectionName, injectablePlugins, pluginToInject ? 'FOUND!' : 'not found :(');
  if (!pluginToInject) {
    throw new Error(`Unable to inject plugin ${injectionName}`);
  }

  return pluginToInject as T;
}

class NoopPlugin extends DmnoPlugin {}
