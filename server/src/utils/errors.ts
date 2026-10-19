export type FieldErrors = Record<string, string>;

export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(status: number, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export class AuthError extends HttpError {
  constructor(message: string, status = 401, fieldErrors?: FieldErrors) {
    super(status, message, fieldErrors);
    this.name = "AuthError";
  }
}

export class ValidationError extends HttpError {
  constructor(fieldErrors: FieldErrors, message = "Invalid request data") {
    super(400, message, fieldErrors);
    this.name = "ValidationError";
  }
}
