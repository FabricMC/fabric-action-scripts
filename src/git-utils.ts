import { exec } from "@actions/exec";
import { which } from "@actions/io";

export async function gitLog(
  previousCommit: string,
  releaseCommit: string,
): Promise<string> {
  const log = await git([
    "log",
    "--pretty=- %s (%an, %(trailers:key=Co-authored-by,valueonly,separator=%x2C ))", // TODO expose the format so it can be changed? See https://git-scm.com/docs/pretty-formats
    `${previousCommit}..${releaseCommit}`,
  ]);

  return log.replace(/ <.+?>/g, "").replace(/, \)/g, ")");
}

async function git(args: string[]): Promise<string> {
  let output = "";
  let exitCode = await exec(await which("git", true), args, {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
    },
  });

  if (exitCode != 0) {
    throw new Error("Git command failed with exit code: " + exitCode);
  }

  console.log("Git command finished with exit code:" + exitCode);

  return output;
}
