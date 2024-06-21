import kleur from 'kleur';
import _ from 'lodash-es';

// copied these error types from Astro
// and we will try to keep it compatible so we can interact with their error overlay

export type ErrorLocation = {
  file?: string;
  line?: number;
  column?: number;
};

/**
 * Generic object representing an error with all possible data
 * Compatible with both Astro's and Vite's errors
 */
export type ErrorWithMetadata = {
  [name: string]: any;
  name: string;
  title?: string;
  // type?: ErrorTypes; // these are astro's error types
  message: string;
  stack: string;
  hint?: string;
  id?: string;
  frame?: string;
  plugin?: string;
  pluginCode?: string;
  fullCode?: string;
  loc?: ErrorLocation;
  cause?: any;
};

export class DmnoError extends Error {
  originalError?: Error;
  get isUnexpected() { return !!this.originalError; }

  get type() { return this.name; }

  icon = '❌';

  constructor(err: string | Error, readonly more?: {
    tip?: string,
  }) {
    super(_.isError(err) ? err.message : err);
    if (_.isError(err)) {
      this.originalError = err;
      this.icon = '💥';
    } else {
      super(err);
    }
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      icon: this.icon,
      type: this.type,
      name: this.name,
      message: this.message,
      isUnexpected: this.isUnexpected,
      ...this.more,
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
      if (l.includes('core/src/config-loader/config-loader.ts')) return false;
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
export class SchemaError extends DmnoError {
  icon = '🧰';
}
export class ValidationError extends DmnoError {
  icon = '❌';
}
export class CoercionError extends DmnoError {
  icon = '🛑';
}
export class ResolutionError extends DmnoError {
  icon = '⛔';
}

export class EmptyRequiredValueError extends ValidationError {
  icon = '❓';
  constructor(_val: undefined | null | '') {
    super('Value is required but is currently empty');
  }
}
