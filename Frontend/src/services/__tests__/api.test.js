import { describe, it, expect, beforeEach } from 'vitest';
import api from '../api';

describe('api service and interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('injects Bearer token into Authorization header when cm_token exists', () => {
    localStorage.setItem('cm_token', 'test-jwt-token-xyz');
    const reqHandler = api.interceptors.request.handlers[0].fulfilled;
    const config = reqHandler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer test-jwt-token-xyz');
  });

  it('does not inject Authorization header when cm_token is missing', () => {
    const reqHandler = api.interceptors.request.handlers[0].fulfilled;
    const config = reqHandler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('unwraps response.data on successful responses', () => {
    const respHandler = api.interceptors.response.handlers[0].fulfilled;
    const payload = { success: true, data: { id: 1, name: 'Test' } };
    expect(respHandler({ data: payload })).toEqual(payload);
  });

  it('extracts error message from response on failure', async () => {
    const errHandler = api.interceptors.response.handlers[0].rejected;
    const errorWithCustomMsg = {
      response: {
        data: { message: 'Invalid credentials provided' },
      },
    };
    await expect(errHandler(errorWithCustomMsg)).rejects.toThrow('Invalid credentials provided');
  });
});
