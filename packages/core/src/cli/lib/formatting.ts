import kleur from 'kleur';
import _ from 'lodash-es';
import { outdent } from 'outdent';
import { SerializedConfigItem, SerializedDmnoError } from '../../config-loader/serialization-types';
import { DmnoError } from '../../config-engine/errors';
import { DmnoConfigItemBase } from '../../config-engine/config-engine';

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
    s !== undefined && s !== null && s !== false
  )).join(joinChar);
}

export function getItemSummary(item: SerializedConfigItem) {
  const summary: Array<string> = [];
  const icon = item.coercionError?.icon || item.resolutionError?.icon || item?.validationErrors?.[0]?.icon || '✅';
  // item.resolvedValue === undefined ? '✅' : '✅';
  const isSensitive = item.dataType?.sensitive;
  const isRequired = item.dataType?.required;
  summary.push(joinAndCompact([
    icon,
    kleur[item.isValid ? 'cyan' : 'red'](item.key) + (isRequired ? kleur.magenta('*') : ''),

    // kleur.gray(`[type = ${item.type.typeLabel}]`),
    isSensitive && ` 🔐${kleur.italic().gray('sensitive')}`,
  ]));

  summary.push(joinAndCompact([
    kleur.gray('   └'),
    isSensitive && item.resolvedValue
      // TODO: this logic should probably not live here...
      ? `"${item.resolvedValue.toString().substring(0, 2)}${kleur.bold('▒'.repeat(10))}"` // ░▒▓
      : formattedValue(item.resolvedValue, false),
    // item.resolvedRawValue !== item.resolvedValue && kleur.gray().italic('(coerced)'),

    // TODO: redact rawValue if sensitive?
    !_.isEqual(item.resolvedRawValue, item.resolvedValue)
      && (kleur.gray().italic('< coerced from ') + formattedValue(item.resolvedRawValue, false)),
  ]));
  // if (item.resolvedRawValue !== item.resolvedValue) {
  //   summary.push(kleur.gray().italic('   > coerced from ') + formattedValue(item.resolvedRawValue, false));
  // }

  const errors = _.compact([item.coercionError, item.resolutionError, ...item.validationErrors || []]);
  errors?.forEach((err) => {
    summary.push(kleur.red(`   - ${err.message}`));
  });
  return summary.join('\n');
}
