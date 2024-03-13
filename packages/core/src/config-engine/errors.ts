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
