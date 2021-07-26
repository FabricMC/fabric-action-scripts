import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { components } from "@octokit/openapi-types/generated/types";
import { context } from "@actions/github";
import { gitLog } from "./git-utils";
import { setOutput } from "@actions/core";

type WorkflowRun = components["schemas"]["workflow-run"];

export async function generateChangelog(
	github: RestEndpointMethods,
	workflow_id: string,
): Promise<void> {
	const owner = context.repo.owner;
	const repo = context.repo.repo;
	const baseRequest = {
		owner,
		repo,
	};

	// Request the last completed workflow run for this branch
	const request = await github.actions.listWorkflowRuns({
		...baseRequest,
		branch: context.ref.split("/").pop(),
		per_page: 1,
		status: "success",
		workflow_id,
	});

	let changelog: string;

	const runs = await request.data.workflow_runs;
	if (runs.length === 0) {
		changelog = "Inital release";
	} else if (runs.length > 1) {
		throw new Error("Return more runs than expected!");
	} else {
		changelog = await generateChangelogSinceRun(runs[0]);
	}

	console.log(changelog);
	setOutput("changelog", changelog);
}

function generateChangelogSinceRun(
	lastRun: WorkflowRun,
): string | Promise<string> {
	const previousCommit = lastRun.head_commit?.id;
	const releaseCommit = context.sha;

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
