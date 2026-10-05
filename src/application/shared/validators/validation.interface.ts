export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export type ValidationResult<T> = {readonly valid: true; readonly value: T} | {readonly valid: false; readonly issues: readonly ValidationIssue[]};
