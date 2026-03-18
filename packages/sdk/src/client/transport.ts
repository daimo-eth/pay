import { DaimoRequestError, getApiErrorEnvelope } from "../common/errors.js";

export type TransportConfig = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type TransportRequest = {
  method: "GET" | "POST" | "PUT";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!query) return `${baseUrl}${normalizedPath}`;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  if (!queryString) return `${baseUrl}${normalizedPath}`;
  return `${baseUrl}${normalizedPath}?${queryString}`;
}

function getRequestId(headers: Headers): string | undefined {
  return headers.get("request-id") ?? headers.get("Request-Id") ?? undefined;
}

export function createTransport(config: TransportConfig) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async request<T>(options: TransportRequest): Promise<T> {
      const url = buildUrl(baseUrl, options.path, options.query);

      const headers = new Headers();
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          headers.set(key, value);
        }
      }

      let body: string | undefined;
      if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(options.body);
      }

      const timeoutMs = config.timeoutMs ?? 30_000;
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        timeoutController.abort(new Error("request timed out"));
      }, timeoutMs);

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: options.method,
          headers,
          body,
          signal: timeoutController.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        const message =
          error instanceof Error && error.message
            ? error.message.toLowerCase()
            : "request failed";
        throw new DaimoRequestError({ status: 0, message, raw: error });
      }
      clearTimeout(timeoutId);

      const requestId = getRequestId(response.headers);
      const rawText = await response.text();

      let parsedBody: unknown = undefined;
      if (rawText.length > 0) {
        try {
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = rawText;
        }
      }

      if (!response.ok) {
        const envelope = getApiErrorEnvelope(parsedBody);
        if (envelope) {
          throw new DaimoRequestError({
            status: response.status,
            requestId,
            message: envelope.error.message,
            type: envelope.error.type,
            code: envelope.error.code,
            param: envelope.error.param,
            raw: parsedBody,
          });
        }

        throw new DaimoRequestError({
          status: response.status,
          requestId,
          message: `request failed with status ${response.status}`,
          raw: parsedBody,
        });
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return parsedBody as T;
    },
  };
}
