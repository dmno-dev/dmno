
type ConfigRequiredAtTypes = 'build' | 'boot' | 'run' | 'deploy';


type ConfigContext = any;
type ValueOrValueFromContextFn<T> = T | ((ctx: ConfigContext) => T);


type ConfigSchema = Record<string, ConfigSchemaItem>;
type ConfigSchemaItem = {
  /** short description of what this config item is for */
  summary?: string,
  /** longer description info including details, gotchas, etc... supports markdown  */
  description?: string,

  /** description of the data type itself, rather than the instance */
  typeDescription?: string;
  
  /** link to external documentation */
  externalDocs?: {
    description?: string,
    url: string,
  },

  /** dmno config ui specific options */
  ui?: {
    /** icon to use, see https://icones.js.org/ for available options
     * @example mdi:aws
     */
    icon?: string;

    /** color (any valid css color)
     * @example FF0000
     */
    color?: string;
  },
  
  /** whether this config is sensitive and must be kept secret */
  secret?: ValueOrValueFromContextFn<boolean>;

  required?: ValueOrValueFromContextFn<boolean>;

  /** can this be overridden at all */
  overridable?: boolean

  /** at what time is this value required */
  useAt?: ConfigRequiredAtTypes | ConfigRequiredAtTypes[];

  // TODO: should be DmnoType
  extends?: any;
  
  validate?: ((val: any, ctx: ConfigContext) => boolean),
  asyncValidate?: ((val: any, ctx: ConfigContext) => Promise<boolean>),

  /** import value a env variable with a different name */
  importEnvKey?: string;
  /** export value as env variable with a different name */
  exportEnvKey?: string;

  /** set the value, can be static, or a function, or use helpers */
  value?: ValueOrValueFromContextFn<any>;
  // set using formula
  // set via lookup
  // set by syncing
  // helpers for generation

};

type PickConfigSchema = PickConfigSchemaItem[];
type PickConfigSchemaItem = string | {
  /** which service to pick from, defaults to "root" */
  source?: string;
  /** key(s) to pick, or function that matches against all keys from source */
  key: string | string[] | ((key: string) => boolean),
  
  /** new key name or function to rename key(s) */
  renameKey?: string | ((key: string) => string),
  
  /** function to transform value(s) */
  transformValue?: (value: any) => any,

  // TOOD: also allow setting the value (not transforming)
  // value?: use same value type as above
}

type OutputSchema = Record<string, OutputSchemaItem>;
type OutputSchemaItem = ConfigSchemaItem;

export function defineConfigSchema(opts: {
  // service name
  name?: string,
  // name of parent service (if applicable)
  parent?: string,
  pick?: PickConfigSchema,
  schema: ConfigSchema,
  output?: OutputSchema,
}) {

}

export function defineWorkspaceConfig(schema: ConfigSchema) {

}


type TypeValidationResult = boolean | undefined | void;

type DmnoDataTypeOptions<T = any> = {
  settingsSchema?: T,
  validate?: (val: any, settings?: T) => TypeValidationResult;
  asyncValidate?: (val: any, settings?: T) => Promise<TypeValidationResult>;
  normalize?: (val: any, settings?: T) => any;
} & Omit<ConfigSchemaItem, 'validate' | 'normalize' | 'asyncValidate'>;


export function createDmnoDataType<T>(opts: DmnoDataTypeOptions<T>) {
  return (usageOpts: T) => ({
    validate(val: any) {
      if (!opts.validate) return { valid: true };
      try {
        opts.validate(val, usageOpts as any);
      } catch (err) {
        return { valid: false, message: (err as any).message }
      }
      return { valid: true };
    },
    normalize(val: any) {
      if (!opts.normalize) return val;
      return opts.normalize(val, usageOpts as any);
    },
  });
}
