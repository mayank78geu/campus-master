import { describe, it, expect } from 'vitest';
import { fileHref } from '../files';
import { API_ORIGIN } from '../api';

describe('fileHref helper', () => {
  it('returns empty string for null, undefined, or empty path', () => {
    expect(fileHref(null)).toBe('');
    expect(fileHref(undefined)).toBe('');
    expect(fileHref('')).toBe('');
  });

  it('returns fully-qualified external HTTP/HTTPS URLs untouched', () => {
    const httpsUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    expect(fileHref(httpsUrl)).toBe(httpsUrl);

    const httpUrl = 'http://example.com/document.pdf';
    expect(fileHref(httpUrl)).toBe(httpUrl);
  });

  it('prepends API_ORIGIN to paths starting with /api/v1/files/', () => {
    const signedPath = '/api/v1/files/resources/doc.pdf?exp=123&sig=abc';
    expect(fileHref(signedPath)).toBe(`${API_ORIGIN}${signedPath}`);
  });

  it('formats raw storage paths as /api/v1/files/<path>', () => {
    expect(fileHref('submissions/hw1.zip')).toBe(`${API_ORIGIN}/api/v1/files/submissions/hw1.zip`);
    expect(fileHref('/submissions/hw1.zip')).toBe(`${API_ORIGIN}/api/v1/files/submissions/hw1.zip`);
  });
});
