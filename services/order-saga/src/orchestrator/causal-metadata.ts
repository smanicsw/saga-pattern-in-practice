import type { OutboxEvent } from "@saga/outbox-kit";

export function buildCausalMetadata({ event }: { event: OutboxEvent }) {
  return {
    correlationId: event.correlationId ?? event.id,
    causationId: event.id,
  };
}
