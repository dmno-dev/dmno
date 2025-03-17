declare module 'emailvalid' {
  interface EmailValidationOptions {
    allowFreemail?: boolean;
    whitelist?: Array<string>;
    blacklist?: Array<string>;
    allowDisposable?: boolean;
  }

  interface ValidationResult {
    email: string;
    domain: string;
    valid: boolean;
    errors: Array<string>;
    typo: string;
  }

  export default class EmailValidation {
    constructor(options?: EmailValidationOptions);
    check(email: string): ValidationResult;
    blacklist(email: string): void;
    whitelist(email: string): void;
    setOptions(options: EmailValidationOptions): void;
  }
}
