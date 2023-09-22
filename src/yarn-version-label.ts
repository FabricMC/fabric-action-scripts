import { context } from "@actions/github";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { arraysEqual, getLabels } from "./label-utils";

export const releaseLabel = "release";
export const snapshotLabel = "snapshot";

export async function yarnVersionLabel(
  github: RestEndpointMethods,
  issue_number: number,
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const baseRequest = { owner, repo };

  const labels = await getLabels(github, issue_number);
  const newLabels = new Set(labels);

  newLabels.delete(releaseLabel);
  newLabels.delete(snapshotLabel);

  const { data: pull } = await github.pulls.get({
    ...baseRequest,
    pull_number: issue_number,
  });

  const ref = pull.base.ref;
  if (ref.includes("-") || ref.includes("w")) {
    newLabels.add(snapshotLabel);
  } else {
    newLabels.add(releaseLabel);
  }

  const labelsArray = [...labels];
  const newLabelsArray = [...newLabels];
  if (arraysEqual(labelsArray, newLabelsArray)) {
    console.log("Labels did not change");
    return;
  }

  await github.issues.setLabels({
    ...baseRequest,
    issue_number,
    labels: newLabelsArray,
  });
}
