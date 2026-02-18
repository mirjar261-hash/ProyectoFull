const normalizeIfAvailable = (input: string): string =>
  typeof input.normalize === 'function' ? input.normalize('NFC') : input;

const stripArtifacts = (input: string): string =>
  input.replace(/\uFEFF/g, '').replace(/\uFFFD/g, '');

export const normalizeUnicodeText = (value: string): string => {
  if (!value) {
    return value;
  }

  let needsDecoding = true;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 255) {
      needsDecoding = false;
      break;
    }
  }

  if (!needsDecoding) {
    return stripArtifacts(normalizeIfAvailable(value));
  }

  try {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index);
    }

    if (typeof TextDecoder === 'undefined') {
      return stripArtifacts(normalizeIfAvailable(value));
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });
    const decoded = decoder.decode(bytes);
    return stripArtifacts(normalizeIfAvailable(decoded));
  } catch {
    return stripArtifacts(normalizeIfAvailable(value));
  }
};

// Quita acentos del texto para comparar sin distinción
export const removeAccents = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
