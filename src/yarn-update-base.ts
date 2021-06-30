import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { context } from "@actions/github";

export async function yarnUpdateBase(
	github: RestEndpointMethods,
	issue_number: number,
): Promise<void> {
	const owner = context.repo.owner;
	const repo = context.repo.repo;

	const labels = await getLabels(github, issue_number);

	if (!labels.has("update-base")) {
		console.log("Nothing to do");
		return;
	}

	const baseRequest = {
		owner,
		repo,
	};
	const pullRequest = {
		...baseRequest,
		pull_number: issue_number,
	};
	const issueRequest = {
		...baseRequest,
		issue_number,
	};

	const { data: repoData } = await github.repos.get({ ...baseRequest });
	const base = repoData.default_branch;
	const { data: pull } = await github.pulls.get({
		...pullRequest,
	});
	labels.delete("update-base");

	if (pull.base.ref == base) {
		await github.issues.createComment({
			...issueRequest,
			body: "🚨 Target branch is already set to " + base,
		});
	} else {
		// Update the base (target) branch
		await github.pulls.update({
			...pullRequest,
			base,
		});
		await github.issues.createComment({
			...issueRequest,
			body: "🚀 Target branch has been updated to " + base,
		});

		try {
			// Updates the pull request with the latest upstream changes.
			await github.pulls.updateBranch({ ...pullRequest });
		} catch (error) {
			// 422 is returned when there is a merge conflict
			if (error.status === 422) {
				await github.issues.createComment({
					...issueRequest,
					body: "🚨 Please fix merge conflicts before this can be merged",
				});

				labels.add("outdated");
			} else {
				throw error;
			}
		}

		labels.delete("snapshot");
		labels.delete("release");

		const snapshot = base.includes("-") || base.includes("w");
		labels.add(snapshot ? "snapshot" : "release");
	}

	const distictLabels: string[] = [...labels];
	await github.issues.setLabels({
		...issueRequest,
		// TODO are the types wrong here or something?
		labels: distictLabels as never,
	});
}

async function getLabels(
	github: RestEndpointMethods,
	issue_number: number,
): Promise<Set<string>> {
	const resp = await github.issues.listLabelsOnIssue({
		issue_number,
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
	const data = await resp.data;
	return new Set(data.map(label => label.name));
}
