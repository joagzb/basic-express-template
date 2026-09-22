import {ValidationIssue} from './validation.interface';

export class ValidationError extends Error {
  public readonly issues: readonly ValidationIssue[];

  public constructor(issues: readonly ValidationIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join(', '));
    this.name = ValidationError.name;
    this.issues = issues;
  }
}
