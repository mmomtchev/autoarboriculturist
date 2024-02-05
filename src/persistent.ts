import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import { Octokit } from '@octokit/rest';
import { simpleGit } from 'simple-git';
import ghpages from 'gh-pages';

export interface Persistent {
  lastPR?: number;
  skipped: string[];
  frozen: string[];
};

export const persistentDir = path.join(process.env.RUNNER_TEMP!, 'autoarboriculturist-persistent');
export const dataFile = path.resolve(persistentDir, 'data.json');
const repo = `git@github.com:${process.env.GITHUB_REPOSITORY}`;
export const branch = 'autoarboriculturist';

let data: Persistent | null = null;

export async function getPersistent(reinit?: boolean): Promise<Persistent> {
  if (data) return data;

  data = {
    skipped: [],
    frozen: []
  };

  try {
    await fs.promises.mkdir(persistentDir, { recursive: true });
    const git = simpleGit(persistentDir);
    await git.clone(repo, persistentDir, ['-b', branch]);
    core.debug(`Restored persistent storage from ${repo}#${branch}`);
  } catch (e) {
    core.debug(`Failed to restore persistent storage from ${repo}#${branch}, ${e.message}`);
    await fs.promises.mkdir(persistentDir, { recursive: true });
  }

  try {
    data = JSON.parse(await fs.promises.readFile(dataFile, 'utf-8'));
    core.debug(`Loaded persistent data from ${dataFile}`);
  } catch (e) {
    core.debug(`Failed to restore persistent storage from ${dataFile}, ${e.message}`);
  }

  return data;
}

export async function savePersistent() {
  const data = await getPersistent();
  data.skipped = data.skipped.filter((v, i, a) => a.indexOf(v) === i).sort();
  data.frozen = data.frozen.filter((v, i, a) => a.indexOf(v) === i).sort();
  await fs.promises.writeFile(dataFile, JSON.stringify(data));
  core.debug(`Saved persistent data to ${dataFile}`);
  try {
    ghpages.publish(persistentDir, { branch, repo });
    core.debug(`Saved persistent storage to ${repo}#${branch}`);
  } catch (e) {
    core.error(`Failed saving persistent storage to ${repo}#${branch}`);
  }
}
