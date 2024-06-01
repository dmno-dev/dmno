// this is an entry-point compiled by tsup
// it is meant to be imported directly by node apps as the first line to load config into DMNO_CONFIG global

import { injectDmnoGlobals as _injectDmnoGlobals } from './dmno-globals-injector';

_injectDmnoGlobals();

export const injectDmnoGlobals = _injectDmnoGlobals;

