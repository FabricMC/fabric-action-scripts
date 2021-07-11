import { context } from "@actions/github";
import { setOutput } from "@actions/core";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { components } from "@octokit/openapi-types/generated/types";
import { gitLog } from "./git-utils";

type WorkflowRun = components["schemas"]["workflow-run"];

export async function generateChangelog(github: RestEndpointMethods) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const baseRequest = { owner, repo };

  console.log("Generating changelog");
  console.log({
    workflow_id: context.workflow,
    branch: context.ref,
  });

  // Request the last completed workflow run for this branch
  let request = await github.actions.listWorkflowRuns({
    ...baseRequest,
    workflow_id: context.workflow,
    branch: context.ref, // TODO check this
    per_page: 1,
    status: "completed",
  });

  let changelog: string;

  let runs = await request.data.workflow_runs;
  if (runs.length == 0) {
    changelog = "Inital release";
  } else if (runs.length > 1) {
    throw new Error("Return more runs than expected!");
  } else {
    changelog = await generateChangelogSinceRun(runs[0]);
  }

  console.log(changelog);
  setOutput("changelog", changelog);
}

async function generateChangelogSinceRun(
  lastRun: WorkflowRun
): Promise<string> {
  let previousCommit = lastRun.head_commit?.id;
  let releaseCommit = context.sha;

  if (!previousCommit) {
    throw new Error("Failed to get previous commit");
  }

  console.log({
    previousCommit,
    releaseCommit,
  });

  if (previousCommit == releaseCommit) {
    console.log("Previous commit is equal to current commit");
    return "No changes";
  }

  return gitLog(previousCommit, releaseCommit);
}
