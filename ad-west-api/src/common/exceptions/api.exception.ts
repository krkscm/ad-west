export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
