import kleur from 'kleur';
import _ from 'lodash-es';
import { SerializedDmnoError } from '../../config-loader/serialization-types';

type ColorMod = Exclude<keyof typeof kleur, 'enabled'>;
type ColorMods = ColorMod | Array<ColorMod>;

function applyMods(str: string, mods?: ColorMods) {
  if (!mods) return str;
  if (_.isArray(mods)) {
    let k: any = kleur;
    _.each(mods, (mod) => {
      k = k[mod]();
    });
    return k(str);
  }
  return kleur[mods](str);
}

export function formattedValue(val: any, showType = false) {
  let strVal: string = '';
  let strType: string = '';
  let mods: ColorMods | undefined;
  if (_.isBoolean(val)) {
    strVal = val.toString();
    mods = 'yellow';
    strType = 'boolean';
  }
  if (_.isNumber(val)) {
    strVal = val.toString();
    mods = 'yellow';
    strType = 'number';
  }
  if (_.isString(val)) {
    strVal = `"${val}"`;
    strType = 'string';
  }
  if (val === null) {
    strVal = 'null';
    mods = 'gray';
  }
  if (val === undefined) {
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
  let icon = '❌';
  if (err.type === 'ValidationError') {
    whenStr += 'during validation';
    icon = '❌';
  }
  if (err.type === 'CoercionError') {
    whenStr += 'during coercion';
    icon = '🛑';
  }
  if (err.type === 'ResolutionError') {
    whenStr += 'during resolution';
    icon = '⛔';
  }

  if (err.isUnexpected) icon = '💥';

  let errStr = `${icon} ${err.message}`;
  if (err.isUnexpected) {
    errStr += kleur.gray().italic(`\n   (unexpected error${whenStr ? ` ${whenStr}` : ''})`);
    errStr += err.stack;
  }
  return errStr;
}
