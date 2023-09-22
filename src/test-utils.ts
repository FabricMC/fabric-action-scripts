import nock from "nock";
import { arraysEqual } from "./label-utils";

export function expectGetLabels(labels: string[]) {
  nock("https://api.github.com")
    .get("/repos/test/repo/issues/0/labels")
    .reply(
      200,
      labels.map((name) => {
        return {
          name,
        };
      }),
    );
}

export function expectSetLabels(labels: string[]) {
  nock("https://api.github.com")
    .put("/repos/test/repo/issues/0/labels", (body) => {
      return arraysEqual(body.labels, labels);
    })
    .reply(200, {});
}

export function expectGetRepo(defaultBranch: string) {
  nock("https://api.github.com").get("/repos/test/repo").reply(200, {
    default_branch: defaultBranch,
  });
}

export function expectGetPull(baseBranch: string) {
  nock("https://api.github.com")
    .get("/repos/test/repo/pulls/0")
    .reply(200, {
      base: {
        ref: baseBranch,
      },
    });
}

export function expectComment(comment: string) {
  nock("https://api.github.com")
    .post("/repos/test/repo/issues/0/comments", (body) => {
      return body.body == comment;
    })
    .reply(200, {});
}

export function expectSetBase(baseBranch: string) {
  nock("https://api.github.com")
    .patch("/repos/test/repo/pulls/0", (body) => {
      return body.base == baseBranch;
    })
    .reply(200, {});
}

export function expectRebase(returnCode = 200) {
  nock("https://api.github.com")
    .put("/repos/test/repo/pulls/0/update-branch")
    .reply(returnCode, {});
}
