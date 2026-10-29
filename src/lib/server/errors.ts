export class MissingKeyError extends Error {
  constructor(envVar: string) {
    super(`${envVar} is missing. Add it to .env.local and restart the server.`);
  }
}

const MAX_ERROR_LENGTH = 160;

export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > MAX_ERROR_LENGTH ? `${message.slice(0, MAX_ERROR_LENGTH)}…` : message;
}
