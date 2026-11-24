import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'guest@example.com' }) @IsEmail() @MaxLength(180) email!: string;
  @ApiPropertyOptional({ enum: ['en', 'vi'] }) @IsOptional() @IsIn(['en', 'vi']) locale?: 'en' | 'vi';
}

export class ResetPasswordDto {
  @ApiProperty({ writeOnly: true }) @IsString() @MinLength(20) @MaxLength(1024) token!: string;
  @ApiProperty({ writeOnly: true, minLength: 12, maxLength: 128 })
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
