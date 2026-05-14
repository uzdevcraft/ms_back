import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { ErrorCodes } from '../errors/error-codes.js';
import { hmacSha256Hex } from '../crypto/hmac.js';

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type ParsedInitData = {
  user: TelegramWebAppUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  start_param?: string;
};

const MAX_AUTH_AGE_SEC = 24 * 60 * 60;

function buildDataCheckString(params: URLSearchParams): string {
  const entries: [string, string][] = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    entries.push([key, value]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}=${v}`).join('\n');
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): ParsedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'initData hash missing');
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken, 'utf8').digest();
  const computed = hmacSha256Hex(secretKey, dataCheckString);

  const hashBuf = Buffer.from(hash, 'hex');
  const computedBuf = Buffer.from(computed, 'hex');
  if (hashBuf.length !== computedBuf.length || !timingSafeEqual(hashBuf, computedBuf)) {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'initData signature invalid');
  }

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDate)) {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'auth_date invalid');
  }
  if (nowSec - authDate > MAX_AUTH_AGE_SEC) {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'initData expired');
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'user missing in initData');
  }
  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'user JSON invalid');
  }
  if (!user?.id || typeof user.id !== 'number') {
    throw new AppError(401, ErrorCodes.TELEGRAM_INIT_DATA_INVALID, 'user id invalid');
  }

  return {
    user,
    auth_date: authDate,
    hash,
    query_id: params.get('query_id') ?? undefined,
    start_param: params.get('start_param') ?? undefined,
  };
}
