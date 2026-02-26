export type ApiError = {
  type: string;
  code: string;
  message: string;
  param?: string;
};

export type ApiErrorEnvelope = {
  error: ApiError;
};

export type DaimoRequestErrorArgs = {
  status: number;
  message: string;
  requestId?: string;
  type?: string;
  code?: string;
  param?: string;
  raw?: unknown;
};

export class DaimoRequestError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly type?: string;
  readonly code?: string;
  readonly param?: string;
  readonly raw?: unknown;

  constructor(args: DaimoRequestErrorArgs) {
    super(args.message);
    this.name = "DaimoRequestError";
    this.status = args.status;
    this.requestId = args.requestId;
    this.type = args.type;
    this.code = args.code;
    this.param = args.param;
    this.raw = args.raw;
  }
}

export function getApiErrorEnvelope(value: unknown): ApiErrorEnvelope | null {
  if (typeof value !== "object" || value == null) return null;
  const candidate = value as { error?: unknown };
  if (typeof candidate.error !== "object" || candidate.error == null) {
    return null;
  }

  const error = candidate.error as Record<string, unknown>;
  if (
    typeof error.type !== "string" ||
    typeof error.code !== "string" ||
    typeof error.message !== "string"
  ) {
    return null;
  }

  return {
    error: {
      type: error.type,
      code: error.code,
      message: error.message,
      param: typeof error.param === "string" ? error.param : undefined,
    },
  };
}
