import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import { asArray, asRecord, invokeBetterAuth, unwrap, unwrapArray } from '../better-auth.util';

describe('asRecord', () => {
  it('returns the object itself when given a plain object', () => {
    const obj = { a: 1 };
    expect(asRecord(obj)).toBe(obj);
  });

  it('returns an empty object for non-objects and null', () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord(undefined)).toEqual({});
    expect(asRecord('string')).toEqual({});
    expect(asRecord(42)).toEqual({});
  });

  it('treats an array as an object (typeof array === object)', () => {
    const arr = [1, 2];
    expect(asRecord(arr)).toBe(arr);
  });
});

describe('asArray', () => {
  it('returns arrays untouched', () => {
    const arr = [1, 2, 3];
    expect(asArray(arr)).toBe(arr);
  });

  it('returns an empty array for non-arrays', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray({})).toEqual([]);
    expect(asArray('nope')).toEqual([]);
  });
});

describe('unwrap', () => {
  it('unwraps a single-key envelope', () => {
    expect(unwrap({ member: { id: '1' } }, 'member')).toEqual({ id: '1' });
  });

  it('returns the value itself when the key is absent', () => {
    const value = { id: '1' };
    expect(unwrap(value, 'member')).toBe(value);
  });

  it('returns the envelope value even when it is null/undefined', () => {
    expect(unwrap({ member: null }, 'member')).toBeNull();
  });
});

describe('unwrapArray', () => {
  it('unwraps an array envelope', () => {
    expect(unwrapArray({ members: [{ id: '1' }] }, 'members')).toEqual([{ id: '1' }]);
  });

  it('coerces to an array when the key is absent', () => {
    expect(unwrapArray([{ id: '1' }], 'members')).toEqual([{ id: '1' }]);
    expect(unwrapArray('nope', 'members')).toEqual([]);
  });

  it('returns an empty array when the enveloped value is not an array', () => {
    expect(unwrapArray({ members: 'nope' }, 'members')).toEqual([]);
  });
});

describe('invokeBetterAuth', () => {
  it('returns the value from a successful call', async () => {
    await expect(invokeBetterAuth(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('translates an APIError into an HttpException preserving status and body', async () => {
    const apiError = new APIError('CONFLICT', {
      message: 'slug taken',
      code: 'SLUG_TAKEN',
    });

    const promise = invokeBetterAuth(() => Promise.reject(apiError));

    await expect(promise).rejects.toBeInstanceOf(HttpException);
    const err = await promise.catch((e: HttpException) => e);
    expect(err.getStatus()).toBe(409);
    expect(err.getResponse()).toMatchObject({
      message: 'slug taken',
      code: 'SLUG_TAKEN',
    });
  });

  it('falls back to the message when an APIError has no body message', async () => {
    const apiError = new APIError('BAD_REQUEST', {});

    const err = await invokeBetterAuth(() => Promise.reject(apiError)).catch(
      (e: HttpException) => e,
    );

    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(400);
    const response = err.getResponse();
    expect(typeof (response as { message: unknown }).message).toBe('string');
  });

  it('wraps a non-APIError as an InternalServerErrorException with its message', async () => {
    const err = await invokeBetterAuth(() => Promise.reject(new Error('boom'))).catch(
      (e: InternalServerErrorException) => e,
    );

    expect(err).toBeInstanceOf(InternalServerErrorException);
    expect((err.getResponse() as { message: string }).message).toBe('boom');
  });

  it('wraps a thrown non-Error value with a generic message', async () => {
    const err = await invokeBetterAuth(() => Promise.reject('string failure')).catch(
      (e: InternalServerErrorException) => e,
    );

    expect(err).toBeInstanceOf(InternalServerErrorException);
    expect((err.getResponse() as { message: string }).message).toBe('Better Auth request failed');
  });
});
