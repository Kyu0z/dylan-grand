import { ArgumentsHost, CallHandler, Catch, ExceptionFilter, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

export const API_MESSAGE_HEADER = 'X-Dylan-Message';

// Keep the existing response body (including arrays, tokens and Swagger contracts).
// The header is additive and available on every successful controller response.
const successMessages: Record<string, string> = {
  'POST /api/v1/auth/staff/login': 'Signed in successfully.',
  'POST /api/v1/auth/staff/logout': 'Signed out successfully.',
  'POST /api/v1/auth/login': 'Signed in successfully.',
  'POST /api/v1/auth/register': 'Account created successfully.',
  'POST /api/v1/auth/setup-admin': 'Admin account created successfully.',
  'POST /api/v1/auth/forgot-password': 'If an eligible account exists, a reset link will be sent.',
  'POST /api/v1/auth/reset-password': 'Password updated. Please sign in.',
  'PATCH /api/v1/me': 'Profile updated successfully.',
};
const mutationMessages: [RegExp, string][] = [
  [/^POST \/api\/v1\/(?:bookings|admin\/reservations)$/, 'Reservation created successfully.'],
  [/^POST \/api\/v1\/(?:bookings|admin\/reservations)\/[^/]+\/cancel$/, 'Reservation cancelled successfully.'],
  [/^POST \/api\/v1\/bookings\/[^/]+\/review$/, 'Review submitted successfully.'],
  [/^POST \/api\/v1\/admin\/reservations\/[^/]+\/confirm$/, 'Reservation confirmed successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/assign-room$/, 'Room assignment saved successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/check-in$/, 'Check-in completed successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/check-out$/, 'Check-out completed successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/no-show$/, 'No-show recorded successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/late-arrival$/, 'Late arrival recorded successfully.'],
  [/^POST \/api\/v1\/admin\/front-desk\/reservations\/[^/]+\/extend$/, 'Stay extended successfully.'],
  [/^POST \/api\/v1\/admin\/staff$/, 'Staff account created successfully.'],
  [/^PATCH \/api\/v1\/admin\/staff\/[^/]+\/active$/, 'Staff account status updated successfully.'],
  [/^PATCH \/api\/v1\/admin\/staff\/[^/]+\/role$/, 'Staff role updated successfully.'],
  [/^DELETE \/api\/v1\/admin\/inventory\/blocks\/[^/]+$/, 'Maintenance block removed successfully.'],
  [/^POST \/api\/v1\/admin\/inventory\/blocks$/, 'Maintenance block created successfully.'],
  [/^POST \/api\/v1\/admin\/promotions$/, 'Promotion created successfully.'],
  [/^POST \/api\/v1\/admin\/promotions\/services$/, 'Extra service created successfully.'],
  [/^POST \/api\/v1\/admin\/promotions\/reservations\/[^/]+\/services$/, 'Service order recorded successfully.'],
  [/^POST \/api\/v1\/admin\/promotions\/orders\/[^/]+\/fulfill$/, 'Service order fulfilled successfully.'],
  [/^POST \/api\/v1\/admin\/promotions\/orders\/[^/]+\/cancel$/, 'Service order cancelled successfully.'],
  [/^POST \/api\/v1\/admin\/room-types$/, 'Room type created successfully.'],
  [/^PATCH \/api\/v1\/admin\/room-types\/[^/]+$/, 'Room type updated successfully.'],
  [/^PATCH \/api\/v1\/admin\/housekeeping\/rooms\/[^/]+$/, 'Housekeeping status updated successfully.'],
  [/^POST \/api\/v1\/admin\/payments\/reservations\/[^/]+\/manual-payment$/, 'Payment recorded successfully.'],
  [/^POST \/api\/v1\/admin\/payments\/reservations\/[^/]+\/adjustments$/, 'Folio adjustment recorded successfully.'],
  [/^POST \/api\/v1\/admin\/payments\/reservations\/[^/]+\/manual-refund$/, 'Refund recorded successfully.'],
  [/^PATCH \/api\/v1\/admin\/hotel$/, 'Hotel settings updated successfully.'],
  [/^PATCH \/api\/v1\/admin\/guests\/reviews\/[^/]+$/, 'Review updated successfully.'],
  [/^POST \/api\/v1\/admin\/physical-rooms$/, 'Room created successfully.'],
  [/^PATCH \/api\/v1\/admin\/physical-rooms\/[^/]+$/, 'Room updated successfully.'],
  [/^PUT \/api\/v1\/admin\/pricing\/room-types\/[^/]+\/base-rate$/, 'Base rate updated successfully.'],
  [/^POST \/api\/v1\/admin\/pricing\/room-types\/[^/]+\/daily-rates$/, 'Daily rate saved successfully.'],
];
const defaults: Record<string, string> = {
  GET: 'Data loaded successfully.', HEAD: 'Data loaded successfully.',
  POST: 'Request completed successfully.', PATCH: 'Changes saved successfully.',
  PUT: 'Changes saved successfully.', DELETE: 'Deleted successfully.',
};
export function successMessage(method: string, path: string, body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim()) return body.message;
  const route = `${method} ${path.replace(/\/+$/, '')}`;
  return successMessages[route] ?? mutationMessages.find(([pattern]) => pattern.test(route))?.[1] ?? defaults[method] ?? 'Request completed successfully.';
}

@Injectable()
export class ApiMessageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    return next.handle().pipe(tap((body: unknown) => {
      if (!response.headersSent && response.statusCode >= 200 && response.statusCode < 300) {
        response.setHeader(API_MESSAGE_HEADER, encodeURIComponent(successMessage(request.method, request.path, body)));
      }
    }));
  }
}

type ErrorPayload = { statusCode: number; message: string | string[]; error?: string; code?: string; [key: string]: unknown };
export function errorPayload(exception: unknown): ErrorPayload {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const value = exception.getResponse();
    if (typeof value === 'string') return { statusCode, message: value };
    const body = value as Record<string, unknown>;
    const message = typeof body.message === 'string' && body.message.trim() ? body.message
      : Array.isArray(body.message) && body.message.length && body.message.every(item => typeof item === 'string') ? body.message as string[]
      : statusCode >= 500 ? 'Something went wrong. Please try again.' : 'Request could not be completed.';
    return { ...body, statusCode, message };
  }
  // Express body-parser can fail before a controller runs. Keep client errors
  // as 4xx, but do not echo malformed JSON or submitted values.
  const rawStatus = typeof exception === 'object' && exception !== null && 'statusCode' in exception ? exception.statusCode : undefined;
  if (typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 500) {
    return { statusCode: rawStatus, message: rawStatus === 413 ? 'Request payload is too large.' : 'Request could not be completed.' };
  }
  // Known Prisma constraint failures, without disclosing DB internals or values.
  const code = typeof exception === 'object' && exception !== null && 'code' in exception ? exception.code : undefined;
  if (code === 'P2002') return { statusCode: 409, code: 'RESOURCE_CONFLICT', message: 'A record with the same information already exists.' };
  if (code === 'P2025') return { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'The requested record was not found.' };
  if (code === 'P2003') return { statusCode: 409, code: 'RESOURCE_IN_USE', message: 'The record is linked to other data and cannot be changed.' };
  if (code === 'P2034') return { statusCode: 409, code: 'CONCURRENT_UPDATE', message: 'Data changed concurrently. Please try again.' };
  if (code === 'P1001' || code === 'P1002' || code === 'P2024') return { statusCode: 503, code: 'DATABASE_UNAVAILABLE', message: 'Database connection is unavailable.' };
  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const payload = errorPayload(exception);
    if (!(exception instanceof HttpException) && payload.statusCode >= 500) {
      // Do not log request bodies, passwords, tokens, or raw DB error details.
      this.logger.error(`Unhandled API error (${payload.statusCode}, ${payload.code ?? 'UNKNOWN'}).`);
    }
    if (!response.headersSent) response.status(payload.statusCode).json(payload);
    else if (!response.writableEnded) response.end();
  }
}
