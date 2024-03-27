export class PrecognitionError extends Error {
  constructor(message: string, options?: { cause: Error }) {
    super(message, options)
  }
}

export class IgnorablePrecognitionError extends PrecognitionError {
  constructor(message: string, options?: { cause: Error }) {
    super(message, options)
  }
}
