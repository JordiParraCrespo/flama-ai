import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../errors/app.error';
import { RequestContextService } from '../services/request-context.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationId = RequestContextService.getCorrelationId();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof AppError) {
      code = exception.code;
      const res = exception.getResponse();
      message =
        typeof res === 'string' ? res : ((res as Record<string, unknown>).message as string);
    } else if (exception instanceof HttpException) {
      const res = exception.getResponse();
      message =
        typeof res === 'string' ? res : ((res as Record<string, unknown>).message as string);
    }

    if (status >= 500) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      ...(code && { code }),
      message,
      ...(correlationId && { correlationId }),
      timestamp: new Date().toISOString(),
    });
  }
}
