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

export class ConfigraphError extends Error {
  originalError?: Error;
  get isUnexpected() { return !!this.originalError; }

  get type() { return this.name; }


  static defaultIcon = '❌';
  icon: string;

  _isWarning = false;

  constructor(errOrMessage: string | Error, readonly more?: {
    tip?: string | Array<string>,
    err?: Error,
    isWarning?: boolean,
  }) {
    if (_.isError(errOrMessage)) {
      super(errOrMessage.message);
      this.originalError = errOrMessage;
      this.icon = '💥';
    } else { // string
      super(errOrMessage);
      this.originalError = more?.err;
    }
    if (Array.isArray(more?.tip)) more.tip = more.tip.join('\n');
    this.name = this.constructor.name;
    if (more?.isWarning) this.isWarning = true;

    this.icon ||= (this.constructor as any).defaultIcon;
  }

  get tip() {
    if (!this.more?.tip) return undefined;
    if (Array.isArray(this.more.tip)) return this.more.tip.join('\n');
    return this.more.tip;
  }


  set isWarning(w: boolean) {
    this._isWarning = w;
    if (this._isWarning) {
      this.icon = '🧐';
    }
  }
  get isWarning() { return this._isWarning; }

  toJSON() {
    return {
      icon: this.icon,
      type: this.type,
      name: this.name,
      message: this.message,
      isUnexpected: this.isUnexpected,
      ...this.tip && { tip: this.tip },
      ...this.isWarning && { isWarning: this.isWarning },
    };
  }
}

export class ConfigLoadError extends ConfigraphError {
  readonly cleanedStack: Array<string>;
  constructor(err: Error) {
    super(err);

    // remove first line since its the error message
    let stackLines = (err.stack?.split('\n') || []).slice(1);
    stackLines = stackLines.filter((l) => {
      // filter out unimportant lines related to just running/loading
      // we could filter out more of dmno/core code once things stabilize
      //! these are probably not relevant anymore, or needs to move to a plugin layer?
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
export class SchemaError extends ConfigraphError {
  static defaultIcon = '🧰';
}
export class ValidationError extends ConfigraphError {
  static defaultIcon = '❌';
}
export class CoercionError extends ConfigraphError {
  static defaultIcon = '🛑';
}
export class ResolutionError extends ConfigraphError {
  static defaultIcon = '⛔';
  retryable?: boolean = false;
}

export class EmptyRequiredValueError extends ValidationError {
  icon = '❓';
  constructor(_val: undefined | null | '') {
    super('Value is required but is currently empty');
  }
}
