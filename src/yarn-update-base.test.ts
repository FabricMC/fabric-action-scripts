import { yarnUpdateBase } from "./yarn-update-base";
import { GitHub } from "@actions/github/lib/utils";
import nock from "nock";

nock.disableNetConnect();
process.env.GITHUB_REPOSITORY = "test/repo";
const github = new GitHub();

function arraysEqual(a1: unknown, a2: unknown) {
  return JSON.stringify(a1) == JSON.stringify(a2);
}

function expectGetLabels(labels: string[]) {
  nock("https://api.github.com")
    .get("/repos/test/repo/issues/0/labels")
    .reply(
      200,
      labels.map((name) => {
        return {
          name,
        };
      })
    );
}

function expectSetLabels(labels: string[]) {
  nock("https://api.github.com")
    .put("/repos/test/repo/issues/0/labels", (body) => {
      return arraysEqual(body.labels, labels);
    })
    .reply(200, {});
}

function expectGetRepo(defaultBranch: string) {
  nock("https://api.github.com").get("/repos/test/repo").reply(200, {
    default_branch: defaultBranch,
  });
}

function expectGetPull(baseBranch: string) {
  nock("https://api.github.com")
    .get("/repos/test/repo/pulls/0")
    .reply(200, {
      base: {
        ref: baseBranch,
      },
    });
}

function expectComment(comment: string) {
  nock("https://api.github.com")
    .post("/repos/test/repo/issues/0/comments", (body) => {
      return body.body == comment;
    })
    .reply(200, {});
}

function expectSetBase(baseBranch: string) {
  nock("https://api.github.com")
    .patch("/repos/test/repo/pulls/0", (body) => {
      return body.base == baseBranch;
    })
    .reply(200, {});
}

function expectRebase(returnCode = 200) {
  nock("https://api.github.com")
    .put("/repos/test/repo/pulls/0/update-branch")
    .reply(returnCode, {});
}

test("No labels", async () => {
  expectGetLabels([]);
  await yarnUpdateBase(github.rest, 0);
});

test("Uninstresting labels", async () => {
  expectGetLabels(["something"]);
  await yarnUpdateBase(github.rest, 0);
});

test("Base already updated", async () => {
  expectGetLabels(["update-base"]);
  expectGetRepo("1.17");
  expectGetPull("1.17");
  expectComment("🚨 Target branch is already set to 1.17");
  expectSetLabels([]);

  await yarnUpdateBase(github.rest, 0);
});

test("Base already updated, existing labels", async () => {
  expectGetLabels(["update-base", "another-label"]);
  expectGetRepo("1.17");
  expectGetPull("1.17");
  expectComment("🚨 Target branch is already set to 1.17");
  expectSetLabels(["another-label"]);

  await yarnUpdateBase(github.rest, 0);
});

test("Update base to release", async () => {
  expectGetLabels(["update-base"]);
  expectGetRepo("1.17.1");
  expectGetPull("1.17");
  expectSetBase("1.17.1");
  expectRebase();
  expectComment("🚀 Target branch has been updated to 1.17.1");
  expectSetLabels(["release"]);

  await yarnUpdateBase(github.rest, 0);
});

test("Update base to snapshot", async () => {
  expectGetLabels(["update-base"]);
  expectGetRepo("21w10a");
  expectGetPull("1.17");
  expectSetBase("21w10a");
  expectRebase();
  expectComment("🚀 Target branch has been updated to 21w10a");
  expectSetLabels(["snapshot"]);

  await yarnUpdateBase(github.rest, 0);
});

test("Update base conflict", async () => {
  expectGetLabels(["update-base"]);
  expectGetRepo("21w10a");
  expectGetPull("1.17");
  expectSetBase("21w10a");
  expectRebase(422);
  expectComment("🚀 Target branch has been updated to 21w10a");
  expectComment("🚨 Please fix merge conflicts before this can be merged");
  expectSetLabels(["outdated", "snapshot"]);

  await yarnUpdateBase(github.rest, 0);
});

// Just to get 100% coverage, in reality this will never happen
test("Update base unknown error", async () => {
  expectGetLabels(["update-base"]);
  expectGetRepo("21w10a");
  expectGetPull("1.17");
  expectSetBase("21w10a");
  expectRebase(500);
  expectComment("🚀 Target branch has been updated to 21w10a");

  await expect(yarnUpdateBase(github.rest, 0)).rejects.toThrow("Unknown error");
});

afterEach(() => {
  if (!nock.isDone()) {
    throw new Error(JSON.stringify(nock.pendingMocks()));
  }

  nock.cleanAll();
});
