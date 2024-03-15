/* eslint-disable no-console */
import kleur from 'kleur';
import { DmnoBaseTypes, createDmnoDataType } from './config-engine/base-types';



const MyCustomUrl = createDmnoDataType({
  extends: DmnoBaseTypes.url({ prependProtocol: true }),
});

const MyUrlInstance = MyCustomUrl();

console.log(MyUrlInstance.coerce('GOOGLE.com'));

console.log('is MyCustomUrl?', MyUrlInstance.isType(MyCustomUrl));
console.log('is url?', MyUrlInstance.isType(DmnoBaseTypes.url));
console.log('is string?', MyUrlInstance.isType(DmnoBaseTypes.string));
console.log('is number?', MyUrlInstance.isType(DmnoBaseTypes.number));

console.log('extends MyCustomUrl?', MyUrlInstance.extendsType(DmnoBaseTypes.url));
console.log('extends url?', MyUrlInstance.extendsType(DmnoBaseTypes.url));
console.log('extends string?', MyUrlInstance.extendsType(DmnoBaseTypes.string));
console.log('extends number?', MyUrlInstance.extendsType(DmnoBaseTypes.number));


const sType = DmnoBaseTypes.string({
  minLength: 2,
  maxLength: 5,
});

function checkValid(val: any) {
  const result = sType.validate(val);
  console.log('Check valid', val, result === true ? kleur.green('VALID!') : kleur.red(`ERROR: ${result[0]?.message}`));
}

checkValid('a');
checkValid('aa');
checkValid('aaaaa');
checkValid('aaaaaa');
checkValid('aaaaaaaaaaaa');
