import { type ErrorDefinition } from '@flama/backend-ddd';
import { HttpException } from '@nestjs/common';

export type { ErrorDefinition };

export class AppError extends HttpException {
  public readonly code: string;

  constructor(error: ErrorDefinition) {
    super({ code: error.code, message: error.message }, error.httpStatus);
    this.code = error.code;
  }
}
