export class PrecognitionError extends Error {
  constructor(message: string, options?: { cause: Error }) {
    // @ts-expect-error
    super(message, options)
  }
}
