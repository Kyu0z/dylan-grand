import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 501 })
  statusCode!: number;

  @ApiProperty({ example: 'FEATURE_NOT_IMPLEMENTED' })
  code!: string;

  @ApiProperty({ example: 'Inventory calculations require the approved booking and database rules.' })
  message!: string;
}
