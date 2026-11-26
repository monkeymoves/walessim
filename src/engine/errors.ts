/** Raised for illegal actions or unreadable saves. `code` is stable for i18n. */
export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "EngineError";
  }
}
