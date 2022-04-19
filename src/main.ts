import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { yarnUpdateBase } from "./yarn-update-base";
import { generateChangelog } from "./changelog";
import { labeled, unlabeled } from "./labels";

async function main(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const ctx = core.getInput("context", { required: true });

  const github = getOctokit(token, {});

  console.log("Fabric Actions Script, context: " + ctx);

  switch (ctx) {
    case "yarn-update-base":
      await yarnUpdateBase(github.rest, context.issue.number);
      break;
    case "changelog":
      await generateChangelog(
        github.rest,
        core.getInput("workflow_id", { required: true }),
        core.getInput("commit_regex", { required: false })
      );
      break;

    case "labeled":
      await labeled(github.rest, core.getInput("label", { required: true }));
      break;

    case "unlabeled":
      await unlabeled(github.rest, core.getInput("label", { required: true }));
      break;
    default:
      throw new Error("Unknown context: " + ctx);
  }
}

main().catch((e: Error) => {
  console.error(e);
  core.setFailed(e.message);
});
