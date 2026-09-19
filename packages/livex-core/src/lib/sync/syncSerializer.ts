export function computeSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function serializeDomainPayload(domainKey: string, data: any): { json: string; hash: string } {
  try {
    const json = JSON.stringify(data || {});
    const hash = computeSimpleHash(json);
    return { json, hash };
  } catch (err) {
    return { json: '{}', hash: '0' };
  }
}
