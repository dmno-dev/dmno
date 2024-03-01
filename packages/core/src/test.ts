/* eslint-disable no-console */


import { DmnoBaseTypes } from './base-types';
import { DmnoConfigItem } from './config-engine';

const testItem = new DmnoConfigItem('test1', {
  extends: DmnoBaseTypes.string({ minLength: 2, maxLength: 5 }),
});



console.log('Validation tests --------------');

function check(val: string) {
  console.log(`checking value: ${val}`, testItem.validate(val));
}

check('a');
check('ab');
check('abcd');
check('abcdefgh');


console.log('\n\nNormalization tests --------------');

function normalize(val: any) {
  console.log('normalizing value', val, `"${testItem.normalize(val)}"`);
}

normalize('asdf');
normalize(123.45);
normalize(true);
normalize({ foo: 1 });
normalize(null);
normalize(undefined);
