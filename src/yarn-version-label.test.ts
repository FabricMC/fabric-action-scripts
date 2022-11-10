import {
  releaseLabel,
  snapshotLabel,
  yarnVersionLabel,
} from "./yarn-version-label";
import { GitHub } from "@actions/github/lib/utils";
import nock from "nock";
import { expectGetLabels, expectGetPull, expectSetLabels } from "./test-utils";

nock.disableNetConnect();
process.env.GITHUB_REPOSITORY = "test/repo";
const github = new GitHub();

const versionsToLabels = {
  "21w20a": snapshotLabel,
  "1.17": releaseLabel,
  "1.17.1-pre1": snapshotLabel,
  "1.17.1-rc1": snapshotLabel,
  "1.17.1": releaseLabel,
};

for (const [version, label] of Object.entries(versionsToLabels)) {
  test(`Label '${label}' applied to branch for version '${version}'`, async () => {
    expectGetLabels([]);
    expectGetPull(version);
    expectSetLabels([label]);

    await yarnVersionLabel(github.rest, 0);
  });
}

test(`Matching label already present on pull request`, async () => {
  expectGetLabels([releaseLabel]);
  expectGetPull("1.17");

  await yarnVersionLabel(github.rest, 0);
});

test(`Incorrect labels removed`, async () => {
  expectGetLabels([snapshotLabel]);
  expectGetPull("1.17");
  expectSetLabels([releaseLabel]);

  await yarnVersionLabel(github.rest, 0);
});

afterEach(() => {
  if (!nock.isDone()) {
    throw new Error(JSON.stringify(nock.pendingMocks()));
  }

  nock.cleanAll();
});
