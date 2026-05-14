import { createHmac } from 'node:crypto';

export function hmacSha256Hex(secret: Buffer, data: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}
