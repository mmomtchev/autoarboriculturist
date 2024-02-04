import * as crypto from 'node:crypto';
import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { simpleGit } from 'simple-git';

import { getPersistent, savePersistent } from './persistent';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function submitPR(title: string, msg: string) {
  const branch = `autoarboriculturist-${crypto.randomBytes(8).toString('hex')}`;
  const git = simpleGit(core.getInput('path', { required: false }));

  const userName = core.getInput('userName', { required: false }) || process.env.GITHUB_ACTOR;
  if (userName) {
    await git.addConfig('user.name', userName, false, 'worktree');
    core.debug(`committing as ${userName}`);
  }
  const userEmail = core.getInput('userEmail', { required: false });
  if (userEmail) {
    await git.addConfig('user.email', userEmail, false, 'worktree');
    core.debug(`committing as ${userEmail}`);
  }

  await git.checkoutLocalBranch(branch);
  await git.add(['package.json', 'package-lock.json']);
  await git.commit(title + '\n\n' + msg);
  await git.push('origin', branch);

  const repo = await octokit.rest.repos.get({
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
  });
  core.debug(`creating a PR for ${process.env.GITHUB_REPOSITORY} / ${repo.data.default_branch}`);

  const pr = await octokit.rest.pulls.create({
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    title,
    body: msg,
    head: branch,
    base: repo.data.default_branch
  });

  core.debug(`created PR#${pr.data.number} (${pr.data.id})`);
  const persistent = await getPersistent();
  persistent.lastPR = pr.data.number;
}

export async function getLastPR(): Promise<boolean> {
  const persistent = await getPersistent();
  if (persistent.lastPR === undefined) return false;

  core.debug(`Last submitted PR is ${persistent.lastPR}, checking its status`);
  const pr = await octokit.rest.pulls.get({
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY.split('/')[1],
    pull_number: persistent.lastPR
  });

  if (pr.data.state === 'open') {
    core.notice(`PR ${persistent.lastPR} still open`);
    return true;
  }

  if (pr.data.merged) {
    core.notice(`PR ${persistent.lastPR} has been merged`);
  } else {
    core.debug('PR is not merged nor open, must be closed');
    const admin = core.getInput('admin', { required: false });
    if (admin) {
      core.debug(`Checking for comments by ${admin}`);
      const comments = await octokit.request({
        url: pr.data.comments_url
      });
      for (const c of comments.data) {
        if (c.user.login === admin) {
          core.debug(`Found comment ${c.body}`);
          const freeze = c.body.matchAll(/!freeze\s+([^\s^@]+)/g);
          for (const f of freeze) {
            core.notice(`${admin} wants to freeze ${f[1]}`);
            persistent.frozen.push(f[1]);
          }
          const skip = c.body.matchAll(/!skip\s+([^\s^@]+)@([^\s^@]+)/g);
          for (const s of skip) {
            core.notice(`${admin} wants to skip ${s[1]}@${s[2]}`);
            persistent.skipped.push(`${s[1]}@${s[2]}`);
          }
        }
      }
    }
  }

  persistent.lastPR = undefined;
  return false;
}
