/**
 * Typed placeholder for outbound integrations (payments, logistics, CRM, etc.).
 * Prefer one small client per third party, composed at the service layer.
 */
export class BaseHttpClient {
  constructor(private readonly baseUrl: string) {}

  async request(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {},
  ): Promise<Response> {
    const url = new URL(path, this.baseUrl);
    const { timeoutMs = 10_000, ...rest } = init;
    return fetch(url, {
      ...rest,
      signal: AbortSignal.timeout(timeoutMs),
    });
  }
}
