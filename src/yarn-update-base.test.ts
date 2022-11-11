import { yarnUpdateBase } from "./yarn-update-base";
import { GitHub } from "@actions/github/lib/utils";
import nock from "nock";
import {
  expectGetLabels,
  expectGetRepo,
  expectGetPull,
  expectComment,
  expectSetLabels,
  expectSetBase,
  expectRebase,
} from "./test-utils";

nock.disableNetConnect();
process.env.GITHUB_REPOSITORY = "test/repo";
const github = new GitHub();

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
  expectComment("🎉 Target branch is already set to 1.17");
  expectSetLabels([]);
  expectRebase();

  await yarnUpdateBase(github.rest, 0);
});

test("Base already updated, existing labels", async () => {
  expectGetLabels(["update-base", "another-label"]);
  expectGetRepo("1.17");
  expectGetPull("1.17");
  expectComment("🎉 Target branch is already set to 1.17");
  expectSetLabels(["another-label"]);
  expectRebase();

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
