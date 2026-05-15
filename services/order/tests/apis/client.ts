let baseUrl: string | null = null;

export function configure({ baseUrl: apiBaseUrl }: { baseUrl: string }) {
  baseUrl = apiBaseUrl;
}

export function getBaseUrl() {
  if (!baseUrl) {
    throw new Error("Test API base URL has not been configured.");
  }

  return baseUrl;
}
