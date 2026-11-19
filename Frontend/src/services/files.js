import { API_ORIGIN } from './api';

/**
 * Returns a fully-qualified URL for a file.
 * Handles full URLs (Cloudinary, external), API paths (/api/v1/files/...),
 * and raw storage relative paths.
 *
 * @param {string|null|undefined} fileUrl
 * @returns {string}
 */
export function fileHref(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  if (cleanPath.startsWith('/api/v1/files/')) {
    return `${API_ORIGIN}${cleanPath}`;
  }
  return `${API_ORIGIN}/api/v1/files${cleanPath}`;
}
