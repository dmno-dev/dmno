export const isSubshell = () => (process.env.BASH_SUBSHELL && process.env.BASH_SUBSHELL !== '0') || false;
