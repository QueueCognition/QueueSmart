export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** @deprecated Use ApiError. Kept as an alias so existing 401 checks keep working. */
export class AuthError extends ApiError {
  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message, status, fieldErrors);
    this.name = "AuthError";
  }
}

export const NETWORK_ERROR_MESSAGE =
  "Unable to reach the server. Please try again.";
