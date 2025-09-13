import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const rid = req.headers['x-request-id'] || uuid();
    req.id = rid;
    const { method, originalUrl } = req;
    const start = Date.now();
    this.logger.log(`→ ${method} ${originalUrl} [${rid}]`);
    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `← ${method} ${originalUrl} [${rid}] ${Date.now() - start}ms`,
          ),
        error: (err) =>
          this.logger.error(
            `× ${method} ${originalUrl} [${rid}] ${Date.now() - start}ms :: ${
              err?.message
            }`,
          ),
      }),
    );
  }
}
