import type { ErrorInfo } from 'react';

/**
 * Where an error boundary sends what it caught. The kit names no vendor: an
 * app that reports errors somewhere sets its reporter once, at launch, and
 * until one does a caught error goes to the console.
 */
export type ErrorReporter = (error: Error, info: ErrorInfo) => void;

const logToConsole: ErrorReporter = (error, info) => {
  console.error('[error-boundary]', error, info.componentStack);
};

let reporter: ErrorReporter = logToConsole;

/** Send every error a boundary catches from now on to `next`. */
export function setErrorReporter(next: ErrorReporter): void {
  reporter = next;
}

/** Hand an error a boundary caught to the reporter the app set. */
export function reportCaughtError(error: Error, info: ErrorInfo): void {
  reporter(error, info);
}
