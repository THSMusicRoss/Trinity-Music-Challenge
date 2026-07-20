export type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends object> {
  private readonly listeners = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>();

  on<TKey extends keyof TEvents>(
    eventName: TKey,
    handler: EventHandler<TEvents[TKey]>
  ): () => void {
    const handlers = this.listeners.get(eventName) ?? new Set();
    handlers.add(handler as EventHandler<TEvents[keyof TEvents]>);
    this.listeners.set(eventName, handlers);

    return () => this.off(eventName, handler);
  }

  off<TKey extends keyof TEvents>(
    eventName: TKey,
    handler: EventHandler<TEvents[TKey]>
  ): void {
    const handlers = this.listeners.get(eventName);
    handlers?.delete(handler as EventHandler<TEvents[keyof TEvents]>);

    if (handlers?.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit<TKey extends keyof TEvents>(eventName: TKey, payload: TEvents[TKey]): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;

    for (const handler of handlers) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
