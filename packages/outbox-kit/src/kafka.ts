export function normalizeKafkaBrokers({
  brokers,
}: {
  brokers: string | string[];
}): string[] {
  const parsedBrokers = Array.isArray(brokers)
    ? brokers
    : brokers.split(",");

  return parsedBrokers.map((broker) => broker.trim()).filter(Boolean);
}
