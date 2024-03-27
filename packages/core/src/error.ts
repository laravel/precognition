export class PrecognitionError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class IgnorablePrecognitionError extends PrecognitionError {
  constructor(message: string) {
    super(message)
  }
}
