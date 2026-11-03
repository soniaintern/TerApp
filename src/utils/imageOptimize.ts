import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Optimises a picked/cropped photo for upload:
 * - resizes to a max width of 1280px (receipts/bills stay perfectly readable)
 * - re-encodes as JPEG at 70% quality
 * A 4–6 MB phone photo typically becomes ~200–400 KB here.
 * Returns the new local uri (the file lives in the app cache, not in the
 * user's gallery), or the original uri if optimisation fails.
 */
export async function optimizeImage(uri: string, maxWidth = 1280): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri; // never break the pick flow because of optimisation
  }
}
