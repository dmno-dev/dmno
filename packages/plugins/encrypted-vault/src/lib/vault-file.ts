export type VaultFile = {
  version: string,
  keyName: string,
  items: Record<string, {
    encryptedValue: string,
    updatedAt: string,
  }>
};
