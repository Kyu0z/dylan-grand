import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'employee@example.com', format: 'email' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({ example: 'example-password', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
