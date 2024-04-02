


export function stringifyJsonWithCommentBanner(obj: Record<string, any>, banner?: string) {
  const jsonStringWithoutBanner = JSON.stringify(obj, null, 2);

  const jsonStringWithBanner = [
    '// 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
    '// 🛑 DO NOT COMMIT THIS FILE TO SOURCE CONTROL',
    '// 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
    '',
    jsonStringWithoutBanner,
  ].join('\n');

  return jsonStringWithBanner;
}
