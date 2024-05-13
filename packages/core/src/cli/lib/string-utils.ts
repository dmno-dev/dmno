export function stringInsert(index: number, str: string, insertStr: string) {
  if (index > 0) return str.substring(0, index) + insertStr + str.substring(index, str.length);
  else return insertStr + str;
}
