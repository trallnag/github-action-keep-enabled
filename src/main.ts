import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { cwd } from "process";
import * as yaml from "yaml";
import { Octokit } from "octokit";
import * as github from "@actions/github";

async function getScheduledWorkflows(workflowsDir: string): Promise<string[]> {
  const entries: fs.Dirent[] = await fs.promises.readdir(workflowsDir, {
    withFileTypes: true,
  });

  return entries
    .filter((dirent: fs.Dirent) => dirent.isFile())
    .filter(
      (dirent: fs.Dirent) =>
        dirent.name.endsWith(".yaml") || dirent.name.endsWith(".yml"),
    )
    .filter((dirent: fs.Dirent) => {
      const workflowPath: string = path.join(workflowsDir, dirent.name);
      const workflowContent: string = fs.readFileSync(workflowPath, "utf8");
      const workflow: any = yaml.parse(workflowContent);
      return workflow.on?.schedule;
    })
    .map((dirent: fs.Dirent) => dirent.name);
}

export async function run(): Promise<void> {
  const workflowsDir: string = path.join(cwd(), ".github", "workflows");
  const scheduledWorkflows: string[] =
    await getScheduledWorkflows(workflowsDir);

  const token = core.getInput("myToken");
  const octokit = github.getOctokit(token);

  scheduledWorkflows.forEach(async (workflow: string) => {
    await octokit.request(
      "/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable",
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        workflow_id: workflow,
      },
    );
  });
}
