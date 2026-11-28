import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  credential!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  nonce!: string;

  // Optional for compatibility with the original Google GIS ID-token flow.
  // When present, credential contains the authorization code instead.
  @ApiProperty({ required: false, writeOnly: true })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  codeVerifier?: string;
}

export class GoogleLinkDto extends GoogleLoginDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
