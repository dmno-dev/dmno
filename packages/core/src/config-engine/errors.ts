import _ from 'lodash-es';
import kleur from 'kleur';

export class DmnoError extends Error {
  originalError?: Error;
  get isUnexpected() { return !!this.originalError; }

  constructor(err: string | Error) {
    if (_.isError(err)) {
      super(err.message);
      this.originalError = err;
    } else {
      super(err);
    }
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      type: this.name,
      name: this.name,
      message: this.message,
      isUnexpected: this.isUnexpected,
    };
  }
}

export class ConfigLoadError extends DmnoError {
  readonly cleanedStack: Array<string>;
  constructor(err: Error) {
    super(err);

    // remove first line since its the error message
    let stackLines = (err.stack?.split('\n') || []).slice(1);
    stackLines = stackLines.filter((l) => {
      // filter out unimportant lines related to just running/loading
      // we could filter out more of dmno/core code once things stabilize
      if (l.includes(' at ViteNodeRunner.')) return false;
      if (l.includes('core/src/config-loader/loader-executable.ts')) return false;
      return true;
    });


    this.message = `${err.name}: ${err.message}`;



    this.cleanedStack = stackLines || [];
  }
  toJSON() {
    return {
      ...super.toJSON(),
      cleanedStack: this.cleanedStack,
    };
  }
}
export class SchemaError extends DmnoError {}
export class ValidationError extends DmnoError {}
export class CoercionError extends DmnoError {}
export class ResolutionError extends DmnoError {}

export class EmptyRequiredValueError extends ValidationError {
  constructor(val: undefined | null | '') {
    let valStr: string = '';
    if (val === undefined) valStr = 'undefined';
    if (val === null) valStr = 'null';
    if (val === '') valStr = '""';

    super('Value is required but is currently empty');
  }
}
