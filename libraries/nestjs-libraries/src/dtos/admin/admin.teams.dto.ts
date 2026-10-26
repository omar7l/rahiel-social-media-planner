import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminCreateTeamDto {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;
}

export class AdminInviteDto {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN';

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class AdminMemberRoleDto {
  @IsString()
  @IsIn(['USER', 'ADMIN', 'SUPERADMIN'])
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
}
