export type NotificationEvent = {
  type: string;
  payload: Record<string, unknown>;
};

/**
 * Outbound notifications (email, push, Telegram service messages, webhooks).
 * Wire a queue/worker implementation here without changing route handlers.
 */
export class NotificationService {
  async enqueue(_event: NotificationEvent): Promise<void> {
    // Intentionally no-op in the API skeleton.
  }
}
