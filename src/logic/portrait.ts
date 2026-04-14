/** Maximum portrait file size in bytes (2 MB) */
export const PORTRAIT_MAX_BYTES = 2 * 1024 * 1024;

/** Accepted MIME types for portrait images */
export const PORTRAIT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PortraitValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a portrait file. Checks MIME type first, then size.
 * Returns { valid: true } or { valid: false, error: '...' }.
 */
export function validatePortraitFile(file: File): PortraitValidationResult {
  if (!PORTRAIT_ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be a JPEG, PNG, or WebP image.' };
  }
  if (file.size > PORTRAIT_MAX_BYTES) {
    return { valid: false, error: 'File must be 2 MB or smaller.' };
  }
  return { valid: true };
}

/**
 * Read a File as a Base64 data URL. Wraps FileReader in a Promise.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
