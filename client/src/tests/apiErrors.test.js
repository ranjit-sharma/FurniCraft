import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toApiError, ApiError } from '../api/client';
import { translations } from '../locales/translations';

const en = translations.en.errors;
const httpError = (status, data = {}, url = '/workers') => ({ response: { status, data }, config: { url } });

describe('toApiError: what the user sees when a request fails', () => {
  beforeEach(() => localStorage.setItem('furnicraft_lang', 'en'));
  afterEach(() => vi.restoreAllMocks());

  it('explains a timeout', () => {
    const err = toApiError({ code: 'ECONNABORTED', config: {} });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'timeout', status: 0, message: en.timeout });
  });

  it('says "offline" when the phone has no connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(toApiError({ code: 'ERR_NETWORK', config: {} })).toMatchObject({ kind: 'offline', message: en.offline });
  });

  it('says the server is unreachable when online but no response', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    expect(toApiError({ code: 'ERR_NETWORK', config: {} })).toMatchObject({ kind: 'network', message: en.network });
  });

  it('treats a 401 on a normal page as an expired session', () => {
    expect(toApiError(httpError(401, { message: 'Authentication required' }))).toMatchObject({ kind: 'session', message: en.sessionExpired });
  });

  it('keeps the server message for a 401 on login (wrong password)', () => {
    const err = toApiError(httpError(401, { message: 'Invalid email or password' }, '/auth/login'));
    expect(err).toMatchObject({ kind: 'client', message: 'Invalid email or password' });
  });

  it('never shows raw server internals for 5xx', () => {
    expect(toApiError(httpError(500, { message: 'TypeError: x is undefined' })).message).toBe(en.server);
    expect(toApiError(httpError(503)).message).toBe(en.unavailable);
  });

  it('replaces technical 404 route messages but keeps meaningful ones', () => {
    expect(toApiError(httpError(404, { message: 'Endpoint not found: GET /api/v1/x' })).message).toBe(en.notFound);
    expect(toApiError(httpError(404, { message: 'Worker not found' })).message).toBe('Worker not found');
  });

  it('adds field details to validation messages once', () => {
    const err = toApiError(httpError(422, { message: 'Validation failed', details: [{ field: 'amount', message: 'Required' }] }));
    expect(err.message).toBe('Validation failed — amount: Required');
    expect(err.details).toHaveLength(1);
  });

  it('speaks the selected language', () => {
    localStorage.setItem('furnicraft_lang', 'hi');
    expect(toApiError(httpError(500)).message).toBe(translations.hi.errors.server);
  });
});
