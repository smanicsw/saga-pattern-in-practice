export default function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    throw new Error("expected non-null DB value");
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
