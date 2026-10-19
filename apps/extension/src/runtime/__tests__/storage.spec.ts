import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ChromeStorageService, defineItem, storeOf } from '../storage';
import { createFakeChrome, type FakeChrome } from './fake-chrome';

/**
 * Typed state over `chrome.storage`. What breaks if these fail: a value an
 * older build wrote crashes every page that reads it; two quick writes from
 * one page lose one; the kernel's `clear()` deletes the person's saved pages.
 */
describe('storage', () => {
  let fake: FakeChrome;
  const counter = () =>
    defineItem({ area: 'local', key: 'counter', schema: z.number().int(), fallback: 0 });

  beforeEach(() => {
    fake = createFakeChrome();
    vi.stubGlobal('chrome', fake.chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the fallback when nothing is stored', async () => {
    await expect(counter().get()).resolves.toBe(0);
  });

  it('reads the fallback, not a crash, when what is stored no longer parses', async () => {
    fake.storage.local.counter = 'three';
    await expect(counter().get()).resolves.toBe(0);
  });

  it('refuses to write a value its schema rejects', async () => {
    await expect(counter().set(1.5)).rejects.toThrow();
    expect(fake.storage.local.counter).toBeUndefined();
  });

  it("keeps one context's updates in order, so none is lost", async () => {
    const item = counter();
    await Promise.all(Array.from({ length: 10 }, () => item.update((n) => n + 1)));
    await expect(item.get()).resolves.toBe(10);
  });

  it('tells a watcher about a change from any context, parsed', async () => {
    const item = counter();
    const seen: number[] = [];
    const stop = item.watch((value) => seen.push(value));

    await chrome.storage.local.set({ counter: 4 });
    await chrome.storage.local.set({ counter: 'garbage' });
    await chrome.storage.session.set({ counter: 9 });
    stop();
    await chrome.storage.local.set({ counter: 5 });

    expect(seen).toEqual([4, 0]);
  });

  it('serves a store whose snapshot follows the item once someone subscribes', async () => {
    const item = counter();
    await item.set(2);
    const store = storeOf(item);
    expect(store.getSnapshot()).toBeUndefined();

    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    await vi.waitFor(() => expect(store.getSnapshot()).toBe(2));

    await item.set(3);
    expect(store.getSnapshot()).toBe(3);
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });
});

describe('ChromeStorageService', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', createFakeChrome().chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears the kernel's own keys and leaves the extension's items alone", async () => {
    const kernel = new ChromeStorageService();
    await kernel.set('pending-social', 'github');
    await chrome.storage.local.set({ clips: [] });

    await expect(kernel.get('pending-social')).resolves.toBe('github');
    await kernel.clear();

    await expect(kernel.get('pending-social')).resolves.toBeNull();
    await expect(chrome.storage.local.get('clips')).resolves.toEqual({ clips: [] });
  });
});
