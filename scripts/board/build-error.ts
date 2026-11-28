/** The board build's one error: a message and the issues behind it, first 40 listed. */
import { formatIssues, type Issue } from "../../src/board/model";

export class BoardBuildError extends Error {
  constructor(message: string, readonly issues: Issue[] = []) {
    super(issues.length > 0 ? `${message}\n${formatIssues(issues.slice(0, 40))}` : message);
    this.name = "BoardBuildError";
  }
}
