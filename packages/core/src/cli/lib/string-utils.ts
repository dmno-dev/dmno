export function stringInsert(index: number, str: string, insertStr: string) {
  if (index > 0) return str.substring(0, index) + insertStr + str.substring(index, str.length);
  else return insertStr + str;
}



export function getMaxLength(strings: Array<string>, extraBuffer = 4) {
  let max = 0;
  for (let i = 0; i < strings.length; i++) {
    if (strings[i].length > max) max = strings[i].length;
  }
  if (max) max += extraBuffer;
  return max;
}
