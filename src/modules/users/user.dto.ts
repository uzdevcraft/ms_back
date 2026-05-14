import type { Role } from '@prisma/client';
import type { UserEntity } from './user.repository.js';

export type UserProfileDto = {
  id: string;
  telegram_id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type UserPermissionsDto = {
  role: Role;
  is_admin: boolean;
  can_manage_users: boolean;
  can_view_admin_panel: boolean;
};

export function toUserProfileDto(user: UserEntity): UserProfileDto {
  return {
    id: user.id,
    telegram_id: user.telegramId.toString(),
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    language_code: user.languageCode,
    role: user.role,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export function buildPermissions(role: Role): UserPermissionsDto {
  const isAdmin = role === 'ADMIN';
  return {
    role,
    is_admin: isAdmin,
    can_manage_users: isAdmin,
    can_view_admin_panel: isAdmin,
  };
}
