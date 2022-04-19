import { context } from "@actions/github";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";

const labels: { [label: string]: string } = {
  support:
    "👋 We use the issue tracker exclusively for final bug reports and feature requests. However, this issue appears to be better suited for either a [discussion thread](https://github.com/orgs/FabricMC/discussions), or a message on [our discord server](https://discord.gg/v6v4pMv). Please post your request on one of these, and the conversation can continue there.",
};

// Add a comment and close the issue when a specific label is present.
export async function labeled(github: RestEndpointMethods, label: string) {
  if (!labels[label]) {
    return;
  }

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const issue_number = context.issue.number;

  await github.issues.createComment({
    owner,
    repo,
    issue_number,
    body: labels[label],
  });

  await updateState(github, "closed");
}

// Reopen a closed issue when the label is removed.
export async function unlabeled(github: RestEndpointMethods, label: string) {
  if (!labels[label]) {
    return;
  }

  await updateState(github, "open");
}

async function updateState(
  github: RestEndpointMethods,
  state: "open" | "closed"
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const issue_number = context.issue.number;

  const issue = await github.issues.get({
    owner,
    repo,
    issue_number,
  });

  if (issue.data.state == state) {
    // Nothing to do.
    return;
  }

  await github.issues.update({
    owner,
    repo,
    issue_number,
    state: state,
  });
}
