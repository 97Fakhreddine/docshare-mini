import { IsEmail, IsMongoId, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Alice' }) @IsString() name!: string;
  @ApiProperty({ example: 'alice@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 6, example: 'secret123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
export class LoginDto {
  @ApiProperty({ example: 'alice@example.com' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 6, example: 'secret123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
export class TokenDto {
  @ApiProperty() access_token!: string;
}
export class MeDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class UploadedDocDto {
  @ApiProperty() id!: string;
  @ApiProperty() filename!: string;
  @ApiProperty() mime!: string;
  @ApiProperty() size!: number;
  @ApiProperty() ownerId!: string;
  @ApiProperty() createdAt!: Date;
}

export class CreateShareDto {
  @ApiProperty() @IsMongoId() documentId!: string;
  @ApiProperty({ example: 'bob@example.com' }) @IsEmail() targetEmail!: string;
}

export class AuditEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() documentId!: string;
  @ApiProperty({ nullable: true }) actorId?: string | null;
  @ApiProperty({ enum: ['VIEW', 'DOWNLOAD'] }) event!: 'VIEW' | 'DOWNLOAD';
  @ApiProperty() createdAt!: Date;
}

export class AuditListDto {
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Object, example: { VIEW: 10, DOWNLOAD: 3 } })
  counts!: Record<'VIEW' | 'DOWNLOAD', number>;
  @ApiProperty({ type: [AuditEntryDto] }) items!: AuditEntryDto[];
  @ApiProperty({ nullable: true, description: 'Cursor for next page' })
  nextCursor?: string | null;
}
