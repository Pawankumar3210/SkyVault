export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, message = 'Operation completed successfully') {
  return { success: true as const, data, message };
}

export function zodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const first = error.issues[0];
  if (!first) return 'Please review the submitted information.';
  const path = first.path.map(String).join('.');
  return path ? `${path}: ${first.message}` : first.message;
}
