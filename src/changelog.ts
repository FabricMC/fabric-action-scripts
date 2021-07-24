import { context } from "@actions/github";
import { setOutput } from "@actions/core";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { components } from "@octokit/openapi-types/generated/types";
import { gitLog } from "./git-utils";

type WorkflowRun = components["schemas"]["workflow-run"];

export async function generateChangelog(
  github: RestEndpointMethods,
  workflow_id: string,
  commit_regex: string
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const baseRequest = { owner, repo };

  // Request the last completed workflow run for this branch
  let request = await github.actions.listWorkflowRuns({
    ...baseRequest,
    workflow_id,
    branch: context.ref.split("/").pop(),
    per_page: 1,
    status: "success",
  });

  let changelog: string;

  let runs = await request.data.workflow_runs;
  if (runs.length == 0) {
    changelog = "Inital release";
  } else if (runs.length > 1) {
    throw new Error("Return more runs than expected!");
  } else {
    changelog = await generateChangelogSinceRun(runs[0], commit_regex);
  }

  console.log(changelog);
  setOutput("changelog", changelog);
}

async function generateChangelogSinceRun(
  lastRun: WorkflowRun,
  commit_regex: string
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

  let log = await gitLog(previousCommit, releaseCommit);
  if (commit_regex) {
    let reg = new RegExp(commit_regex);
    return log
      .split("\n")
      .filter((val) => !reg.test(val.substr(2))) // We start at index 2 to ignore the "-" char
      .join("\n");
  }
  return log;
}
