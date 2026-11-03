import { Platform } from 'react-native';

export interface FormFilePart {
  uri: string;
  type: string;
  name: string;
}

/**
 * Appends a file part to a FormData in a way both native and web accept.
 * - Native: RN FormData understands {uri, type, name} objects natively.
 * - Web (browser fetch): {uri,...} gets stringified as "[object Object]",
 *   so we fetch the blob and append a real File instead.
 * Returns the effective filename (may differ from `name` on web).
 */
export async function appendFormFile(
  form: FormData,
  field: string,
  part: FormFilePart,
): Promise<string | undefined> {
  if (Platform.OS !== 'web') {
    form.append(field, part as any);
    return part.name;
  }
  try {
    const res = await fetch(part.uri);
    const blob = await res.blob();
    const safeName = part.name || `file-${Date.now()}.jpg`;
    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
    const file = new File([blob], safeName, { type: blob.type || part.type || 'image/jpeg' });
    form.append(field, file);
    return file.name;
  } catch {
    // Fallback: append as string — better than nothing if blob fetch fails
    form.append(field, part.name);
    return undefined;
  }
}
