import { HttpException, type HttpStatus } from '@nestjs/common';

export interface ErrorDefinition {
  readonly code: string;
  readonly message: string;
  readonly httpStatus: HttpStatus;
}

export class AppError extends HttpException {
  public readonly code: string;

  constructor(error: ErrorDefinition) {
    super({ code: error.code, message: error.message }, error.httpStatus);
    this.code = error.code;
  }
}
