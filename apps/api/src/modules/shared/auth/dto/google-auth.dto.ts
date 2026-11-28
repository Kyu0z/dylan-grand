import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

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
}

export class GoogleLinkDto extends GoogleLoginDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
