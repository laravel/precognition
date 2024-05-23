export class PrecognitionError extends Error {
  constructor(message: string, options?: { cause: Error }) {
    // @ts-expect-error
    super(message, options)
  }
}

export class RequestCancelled extends PrecognitionError {
  constructor(message: string, options?: { cause: Error }) {
    super(message, options)
  }
}
