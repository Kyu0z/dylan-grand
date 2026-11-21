import { NotImplementedException, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiErrorDto } from './dto/api-error.dto';

/** Deliberately fail closed until the approved workflow, persistence and RBAC exist. */
export function pendingFeature(feature: string): never {
  throw new NotImplementedException({
    statusCode: 501,
    code: 'FEATURE_NOT_IMPLEMENTED',
    message: `${feature} is specified in the Swagger contract but is not implemented yet.`,
  });
}

export function ApiPlanned(summary: string, description: string) {
  return applyDecorators(
    ApiOperation({ summary: `[PLANNED] ${summary}`, description }),
    ApiResponse({
      status: 501,
      type: ApiErrorDto,
      description: 'Not implemented; no business state is changed.',
    }),
  );
}
