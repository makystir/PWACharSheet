/**
 * Portrait Codec — base64 data-URL ↔ Blob conversion utilities.
 *
 * Used by the Portrait Store and Export/Import modules to convert between
 * the legacy base64 representation and the IndexedDB Blob storage format.
 */

/** Pattern matching valid portrait data-URLs (JPEG, PNG, or WebP). */
const PORTRAIT_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Validate that a string is a valid base64 image data-URL.
 *
 * Accepts only `data:image/(jpeg|png|webp);base64,...` with valid base64 characters.
 */
export function isValidPortraitDataUrl(value: string): boolean {
  return PORTRAIT_DATA_URL_RE.test(value);
}

/**
 * Convert a base64 data-URL string to a Blob.
 *
 * Parses the MIME type from the data-URL header, decodes the base64 payload,
 * and returns a Blob with the correct content type.
 *
 * Returns `null` if the input is not a valid portrait data-URL or decoding fails.
 */
export function base64ToBlob(dataUrl: string): Blob | null {
  if (!isValidPortraitDataUrl(dataUrl)) {
    return null;
  }

  try {
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(image\/(?:jpeg|png|webp));base64/);
    if (!mimeMatch || !base64Data) {
      return null;
    }

    const mime = mimeMatch[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Convert a Blob to a base64 data-URL string.
 *
 * Reads the Blob using FileReader and resolves with the full data-URL
 * (e.g. `data:image/png;base64,iVBOR...`).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not produce a string result'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader error'));
    };
    reader.readAsDataURL(blob);
  });
}
