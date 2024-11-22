import kleur from 'kleur';
import _ from 'lodash-es';
import { SerializedConfigItem, SerializedDmnoError } from '../../config-loader/serialization-types';

type ColorMod = Exclude<keyof typeof kleur, 'enabled'>;
type ColorMods = ColorMod | Array<ColorMod>;

function applyMods(str: string, mods?: ColorMods) {
  if (!mods) return str;
  if (_.isArray(mods)) {
    let modStr = str;
    _.each(mods, (mod) => {
      modStr = kleur[mod](modStr);
    });
    return modStr;
  }
  return kleur[mods](str);
}

export function formattedValue(val: any, showType = false) {
  let strVal: string = '';
  let strType: string = '';
  let mods: ColorMods | undefined;
  if (_.isBoolean(val)) {
    strVal = val.toString();
    mods = ['yellow', 'italic'];
    strType = 'boolean';
  } else if (_.isNumber(val)) {
    strVal = val.toString();
    mods = 'yellow';
    strType = 'number';
  } else if (_.isString(val)) {
    strVal = `"${val}"`;
    strType = 'string';
  } else if (_.isPlainObject(val)) {
    // TODO: can definitely make this better...
    strVal = JSON.stringify(val);
    strType = 'object';
  } else if (val === null) {
    strVal = 'null';
    mods = 'gray';
  } else if (val === undefined) {
    strVal = 'undefined';
    mods = 'gray';
  }
  return [
    applyMods(strVal, mods),
    showType && strType ? kleur.gray(` (${strType})`) : '',
  ].join('');
}


export function formatError(err: SerializedDmnoError) {
  let whenStr = '';
  if (err.type === 'SchemaError') {
    whenStr += 'during schema initialization';
  }
  if (err.type === 'ValidationError') {
    whenStr += 'during validation';
  }
  if (err.type === 'CoercionError') {
    whenStr += 'during coercion';
  }
  if (err.type === 'ResolutionError') {
    whenStr += 'during resolution';
  }

  let errStr = `${err.icon} ${err.message}`;
  if (err.isUnexpected) {
    errStr += kleur.gray().italic(`\n   (unexpected error${whenStr ? ` ${whenStr}` : ''})`);
    if ('stack' in err) errStr += err.stack;
  }
  return errStr;
}

export function joinAndCompact(strings: Array<string | number | boolean | undefined | null | false>, joinChar = ' ') {
  return strings.filter((s) => (
    // we'll not filter out empty strings - because it's useful to just add newlines
    s !== undefined && s !== null && s !== false
  )).join(joinChar);
}

const VALIDATION_STATE_COLORS = {
  error: 'red',
  warn: 'yellow',
  valid: 'cyan',
} as const;

export function getItemSummary(item: SerializedConfigItem) {
  const summary: Array<string> = [];
  const icon = item.coercionError?.icon || item.resolutionError?.icon || item?.validationErrors?.[0]?.icon || '✅';
  // item.resolvedValue === undefined ? '✅' : '✅';
  const isSensitive = item.isSensitive;
  const isRequired = item.dataType?.required;
  summary.push(joinAndCompact([
    icon,
    kleur[VALIDATION_STATE_COLORS[item.validationState]](item.key) + (isRequired ? kleur.magenta('*') : ''),

    // kleur.gray(`[type = ${item.type.typeLabel}]`),
    isSensitive && ` 🔐${kleur.italic().gray('sensitive')}`,

    item.useAt ? kleur.italic().gray(`(${item.useAt?.join(', ')})`) : undefined,
  ]));

  summary.push(joinAndCompact([
    kleur.gray('   └'),
    isSensitive ? formattedValue(item._resolvedValue) : formattedValue(item.resolvedValue, false),
    item.isCoerced && (
      kleur.gray().italic('< coerced from ')
      + (isSensitive ? formattedValue(item._resolvedRawValue) : formattedValue(item.resolvedRawValue, false))
    ),
  ]));
  // if (item.resolvedRawValue !== item.resolvedValue) {
  //   summary.push(kleur.gray().italic('   > coerced from ') + formattedValue(item.resolvedRawValue, false));
  // }
  if (item.overrides?.length) {
    const activeOverride = item.overrides[0];
    let overrideNote = kleur.gray().italic('value set via override: ');
    overrideNote += kleur.gray(activeOverride.sourceType);
    if (activeOverride.sourceLabel) overrideNote += kleur.gray(` - ${activeOverride.sourceLabel}`);
    summary.push(`      ${overrideNote}`);
  }

  const errors = _.compact([item.coercionError, item.resolutionError, ...item.validationErrors || []]);
  errors?.forEach((err) => {
    summary.push(kleur[err.isWarning ? 'yellow' : 'red'](`   - ${err.isWarning ? '[WARNING] ' : ''}${err.message}`));
    summary.push(...err.cleanedStack || '');
    if (err.tip) {
      summary.push(...err.tip.split('\n').map((line) => `     ${line}`));
    }
  });

  for (const childItem of _.values(item.children)) {
    const childSummary = getItemSummary(childItem);
    summary.push(childSummary.split('\n').map((l) => `  ${l}`).join('\n'));
  }

  return summary.join('\n');
}
