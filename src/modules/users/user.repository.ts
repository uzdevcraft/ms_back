import type { Prisma, PrismaClient, User } from '@prisma/client';

export type UserEntity = User;

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByTelegramId(telegramId: bigint): Promise<UserEntity | null> {
    return this.db.user.findUnique({ where: { telegramId } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<UserEntity> {
    return this.db.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserEntity> {
    return this.db.user.update({ where: { id }, data });
  }

  list(params: { skip: number; take: number }): Promise<UserEntity[]> {
    return this.db.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  count(): Promise<number> {
    return this.db.user.count();
  }
}
