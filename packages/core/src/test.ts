import { DmnoBaseTypes } from "./base-types";

console.log('moo');

const myType = DmnoBaseTypes.String({ minLength: 2, maxLength: 5 });


function check(val: string) {
  console.log(`checking value: ${val}`, myType.validate(val));
}

// check('a');
// check('ab');
// check('abcd');
// check('abcdefgh');

function normalize(val: any) {
  console.log('normalizing value', val, myType.normalize(val));
}

// normalize('asdf');
// normalize(123.45);
// normalize(true);
// normalize(null);
// normalize(undefined);
