import { context } from "@actions/github";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { getLabels } from "./label-utils";

export async function yarnUpdateBase(
  github: RestEndpointMethods,
  issue_number: number,
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const labels = await getLabels(github, issue_number);

  if (!labels.has("update-base")) {
    console.log("Nothing to do");
    return;
  }

  const baseRequest = { owner, repo };
  const pullRequest = { ...baseRequest, pull_number: issue_number };
  const issueRequest = { ...baseRequest, issue_number };

  const { data: repoData } = await github.repos.get({ ...baseRequest });
  const base = repoData.default_branch;
  const { data: pull } = await github.pulls.get({
    ...pullRequest,
  });
  labels.delete("update-base");

  const rebase = async () => {
    try {
      // Updates the pull request with the latest upstream changes.
      await github.pulls.updateBranch({ ...pullRequest });
    } catch (error: any) {
      // 422 is returned when there is a merge conflict
      if (error.status === 422) {
        await github.issues.createComment({
          ...issueRequest,
          body: "🚨 Please fix merge conflicts before this can be merged",
        });

        labels.add("outdated");
      } else if (error.status == 403) {
        await github.issues.createComment({
          ...issueRequest,
          body: "🚨 Unable to automatically update branch with the latest changes",
        });
      } else {
        throw error;
      }
    }
  };

  if (pull.base.ref == base) {
    await github.issues.createComment({
      ...issueRequest,
      body: "🎉 Target branch is already set to " + base,
    });

    await rebase();
  } else {
    // Update the base (target) branch
    await github.pulls.update({ ...pullRequest, base });
    await github.issues.createComment({
      ...issueRequest,
      body: "🚀 Target branch has been updated to " + base,
    });

    await rebase();

    labels.delete("snapshot");
    labels.delete("release");

    const snapshot = base.includes("-") || base.includes("w");
    labels.add(snapshot ? "snapshot" : "release");
  }

  const distictLabels: string[] = [...labels];
  await github.issues.setLabels({
    ...issueRequest,
    labels: distictLabels,
  });
}
