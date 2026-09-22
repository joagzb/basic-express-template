export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export type ValidationResult<T> = {readonly valid: true; readonly value: T} | {readonly valid: false; readonly issues: readonly ValidationIssue[]};

export class ValidationError extends Error {
  public readonly issues: readonly ValidationIssue[];

  public constructor(issues: readonly ValidationIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join(', '));
    this.name = ValidationError.name;
    this.issues = issues;
  }
}
