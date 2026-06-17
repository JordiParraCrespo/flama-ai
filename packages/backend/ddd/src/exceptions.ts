/**
 * Base domain/application exceptions used by the DDD building blocks.
 *
 * These are framework-agnostic. The HTTP exception filter in
 * `@flama/backend-core` translates `AppError` (and unknown errors) into HTTP
 * responses; domain exceptions thrown here are surfaced through that filter.
 */
export abstract class ExceptionBase extends Error {
  abstract code: string;

  constructor(
    readonly message: string,
    readonly cause?: Error,
    readonly metadata?: unknown,
  ) {
    super(message);
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      stack: this.stack,
      cause: JSON.stringify(this.cause),
      metadata: this.metadata,
    };
  }
}

export class ArgumentInvalidException extends ExceptionBase {
  readonly code = 'GENERIC.ARGUMENT_INVALID';
}

export class ArgumentNotProvidedException extends ExceptionBase {
  readonly code = 'GENERIC.ARGUMENT_NOT_PROVIDED';
}

export class ArgumentOutOfRangeException extends ExceptionBase {
  readonly code = 'GENERIC.ARGUMENT_OUT_OF_RANGE';
}

export class ConflictException extends ExceptionBase {
  readonly code = 'GENERIC.CONFLICT';
}

export class NotFoundException extends ExceptionBase {
  static readonly message = 'Not found';
  readonly code = 'GENERIC.NOT_FOUND';

  constructor(message = NotFoundException.message) {
    super(message);
  }
}
