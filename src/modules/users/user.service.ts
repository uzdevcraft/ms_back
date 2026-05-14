import type { Role } from '@prisma/client';
import type { Env } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import type { UserRepository } from './user.repository.js';
import { toUserProfileDto, buildPermissions } from './user.dto.js';
import type { UserProfileDto, UserPermissionsDto } from './user.dto.js';

export type BotUserSyncInput = {
  telegram_id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  language_code?: string | null;
};

export type FullUserResponse = {
  profile: UserProfileDto;
  permissions: UserPermissionsDto;
};

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly env: Env,
  ) {}

  private isBootstrapAdmin(telegramId: string): boolean {
    return this.env.BOOTSTRAP_ADMIN_TELEGRAM_IDS.includes(telegramId);
  }

  async syncFromBot(input: BotUserSyncInput): Promise<UserProfileDto> {
    const telegramId = BigInt(input.telegram_id);
    const existing = await this.users.findByTelegramId(telegramId);

    const baseData = {
      firstName: input.first_name,
      lastName: input.last_name ?? null,
      username: input.username ?? null,
      languageCode: input.language_code ?? null,
    };

    if (!existing) {
      const role: Role = this.isBootstrapAdmin(input.telegram_id) ? 'ADMIN' : 'USER';
      const created = await this.users.create({
        telegramId,
        firstName: baseData.firstName,
        lastName: baseData.lastName,
        username: baseData.username,
        languageCode: baseData.languageCode,
        role,
      });
      return toUserProfileDto(created);
    }

    const nextRole: Role =
      existing.role === 'USER' && this.isBootstrapAdmin(input.telegram_id) ? 'ADMIN' : existing.role;

    const updated = await this.users.update(existing.id, {
      ...baseData,
      ...(nextRole !== existing.role ? { role: nextRole } : {}),
    });
    return toUserProfileDto(updated);
  }

  async getFullProfileByTelegramId(telegramId: string): Promise<FullUserResponse> {
    const user = await this.users.findByTelegramId(BigInt(telegramId));
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }
    return {
      profile: toUserProfileDto(user),
      permissions: buildPermissions(user.role),
    };
  }

  async getFullProfileByUserId(userId: string): Promise<FullUserResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }
    return {
      profile: toUserProfileDto(user),
      permissions: buildPermissions(user.role),
    };
  }

  async upsertFromWebAppUser(params: {
    telegramUserId: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }): Promise<UserProfileDto> {
    const telegram_id = String(params.telegramUserId);
    return this.syncFromBot({
      telegram_id,
      first_name: params.first_name,
      last_name: params.last_name,
      username: params.username,
      language_code: params.language_code,
    });
  }

  async listUsersForAdmin(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.users.list({ skip, take: pageSize }),
      this.users.count(),
    ]);
    return {
      items: items.map(toUserProfileDto),
      page,
      page_size: pageSize,
      total,
    };
  }

  async setRole(userId: string, role: Role): Promise<UserProfileDto> {
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }
    const updated = await this.users.update(userId, { role });
    return toUserProfileDto(updated);
  }
}
