import { z } from 'zod';

export const telegramDigitsId = z.string().regex(/^\d+$/, 'telegram_id must be a numeric string');

export const botUserSyncBodySchema = z.object({
  telegram_id: telegramDigitsId,
  first_name: z.string().min(1).max(255),
  last_name: z.string().max(255).optional().nullable(),
  username: z.string().max(255).optional().nullable(),
  language_code: z.string().max(32).optional().nullable(),
});

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  telegram_id: z.string(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  username: z.string().nullable(),
  language_code: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
  created_at: z.string(),
  updated_at: z.string(),
});

export const userPermissionsSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
  is_admin: z.boolean(),
  can_manage_users: z.boolean(),
  can_view_admin_panel: z.boolean(),
});

export const fullUserResponseSchema = z.object({
  profile: userProfileSchema,
  permissions: userPermissionsSchema,
});

export const webAppAuthBodySchema = z.object({
  initData: z.string().min(1),
});
