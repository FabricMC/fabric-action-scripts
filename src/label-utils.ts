import { context } from "@actions/github";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";

export function arraysEqual(a1: unknown, a2: unknown) {
  return JSON.stringify(a1) == JSON.stringify(a2);
}

export async function getLabels(
  github: RestEndpointMethods,
  issue_number: number,
): Promise<Set<string>> {
  const resp = await github.issues.listLabelsOnIssue({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number,
  });
  const data = await resp.data;
  return new Set(data.map((label) => label.name));
}
