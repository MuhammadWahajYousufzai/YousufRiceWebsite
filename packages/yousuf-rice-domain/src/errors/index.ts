export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class UnavailableError extends DomainError {
  constructor(productName: string) {
    super(`${productName} is currently unavailable`, "PRODUCT_UNAVAILABLE", 400);
    this.name = "UnavailableError";
  }
}

export class QuoteExpiredError extends DomainError {
  constructor(quoteId: string) {
    super(`Quote ${quoteId} has expired`, "QUOTE_EXPIRED", 400);
    this.name = "QuoteExpiredError";
  }
}

export class QuoteConsumedError extends DomainError {
  constructor(quoteId: string) {
    super(`Quote ${quoteId} has already been used`, "QUOTE_CONSUMED", 400);
    this.name = "QuoteConsumedError";
  }
}

export class PriceChangedError extends DomainError {
  constructor(
    public readonly quoteId: string,
    public readonly originalTotal: number,
    public readonly newTotal: number,
  ) {
    super(
      `Price changed for quote ${quoteId}: PKR ${originalTotal} → PKR ${newTotal}. Please show the updated quote to the customer.`,
      "PRICE_CHANGED",
      409,
    );
    this.name = "PriceChangedError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class DuplicateOrderError extends DomainError {
  constructor(idempotencyKey: string) {
    super(`Order already exists for idempotency key: ${idempotencyKey}`, "DUPLICATE_ORDER", 409);
    this.name = "DuplicateOrderError";
  }
}

export class RateLimitError extends DomainError {
  constructor() {
    super("Too many requests. Please try again later.", "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}
