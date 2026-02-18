import https from 'https';

const agent = new https.Agent({ keepAlive: true });

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
  timeoutMs = 15000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...(init as any),
        agent,
        signal: controller.signal,
      } as any);
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Failed to fetch');
}
