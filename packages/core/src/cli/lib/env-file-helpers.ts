export function stringifyObjectAsEnvFile(obj: Record<string, any>) {
  return Object.entries(obj)
    .filter(([_key, value]) => value !== undefined) // Exclude undefined values
    .map(([key, value]) => {
      // Handle newlines and quotes by wrapping in double quotes and escaping
      const formattedValue = String(value)
        .replace(/\\/g, '\\\\') // escape backslashes first
        .replace(/\n/g, '\\n') // escape newlines
        .replace(/"/g, '\\"'); // escape double quotes

      return `${key}="${formattedValue}"`;
    }).join('\n');
}
