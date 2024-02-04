import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { exec as _exec } from 'node:child_process';
import { promisify } from 'node:util';
import { rimraf } from 'rimraf';
import { SimpleGit, simpleGit } from 'simple-git';

import { assert } from 'chai';

import { workTree, tmpDir, octokit } from './env';
import { minor } from '../src/main';
import * as persistent from '../src/persistent';
import { getLastPR } from '../src/pr';

const exec = promisify(_exec);

const owner = process.env.GITHUB_REPOSITORY_OWNER!;
const repo = process.env.GITHUB_REPOSITORY!.split('/')[1];
assert.isString(owner);
assert.isString(repo);

/**
 * These work only in this order,
 * they are not independent
 */
describe('main test suite', () => {
  let git: SimpleGit;

  /**
   * Start by resetting the repo
   */
  before('reset repo', (done) => {
    if (!process.env.SKIP_RESET) {
      rimraf(workTree)
        .then(() => rimraf(tmpDir))
        .then(() => fs.mkdir(workTree, { recursive: true }))
        .then(() => fs.mkdir(tmpDir, { recursive: true }))
        .then(() => {
          git = simpleGit(workTree);
        })
        .then(() => git.clone('git@github.com:mmomtchev/autoarboriculturist-test-repo.git', workTree, ['-b', 'fixture']))
        .then(() => git.deleteLocalBranch(persistent.branch).catch(() => undefined))
        .then(() => git.deleteLocalBranch('main').catch(() => undefined))
        .then(() => git.push(['-d', 'origin', persistent.branch]).catch(() => undefined))
        .then(() => git.checkoutBranch('main', 'fixture'))
        .then(() => git.push(['--set-upstream', '-f', 'origin', 'main']))
        .then(() => exec('npm ci', { cwd: workTree }))
        .then(() => done())
        .catch(done);
    } else {
      git = simpleGit(workTree);
      done();
    }
  });

  /**
   * Perform a normal minor update
   */
  it('minor upgrades from clean', (done) => {
    minor()
      .then(async (r) => {
        //assert.isTrue(r);
        const data = await persistent.getPersistent();
        assert.isNumber(data.lastPR);
        const pr = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: data.lastPR!
        });
        assert.strictEqual(pr.data.number, data.lastPR);
        assert.include(pr.data.body, 'async-await-queue');
        assert.include(pr.data.body, 'yatag');
        const branch = pr.data.head.ref;
        const packageJson = 
          await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`)
            .then((r) => r.json());
        assert.strictEqual(packageJson.dependencies['async-await-queue'], '^1.2.1');
        assert.strictEqual(packageJson.dependencies['yatag'], '^1.3.0');
      })
      .then(() => done())
      .catch(done);
  });

  /**
   * PR is still open
   */
  it('don\'t do anything when the PR is still open', (done) => {
    (async () => {
      assert.isTrue(await getLastPR());
      assert.isFalse(await minor());
    })().then(() => done()).catch(done);
  });

  /**
   * Close the PR, skipping yatag@1.3.0 and freezing async-await-queue
   */
  it('close the PR with comments', (done) => {
    (async () => {
      const data = await persistent.getPersistent();
      assert.isNumber(data.lastPR);
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: data.lastPR!,
        body: `!freeze async-await-queue\n!skip yatag@1.3.0\n`
      });
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: data.lastPR!,
        state: 'closed'
      });
    })().then(() => done()).catch(done);
  });

  /**
   * Close the PR, skipping yatag@1.3.0 and freezing async-await-queue
   */
  it('close the PR with comments', (done) => {
    (async () => {
      const data = await persistent.getPersistent();
      assert.isNumber(data.lastPR);
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: data.lastPR!,
        body: `!freeze async-await-queue\n!skip yatag@1.3.0\n`
      });
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: data.lastPR!,
        state: 'closed'
      });

      const last = await getLastPR();
      assert.isFalse(last);
      assert.isUndefined(data.lastPR);
      assert.includeMembers(data.frozen, ['async-await-queue']);
      assert.includeMembers(data.skipped, ['yatag@1.3.0']);
    })().then(() => done()).catch(done);
  });

  /**
   * Try another minor update
   */
  it('minor update with skipped/frozen packages', (done) => {
    (async () => {
      const r = await minor();
      assert.isFalse(r);
      await new Promise((res) => setTimeout(res, 2000));
    })().then(() => done()).catch(done);
  });

  /**
   * Check that the persistent data was saved
   */
  it('minor update with skipped/frozen packages', (done) => {
    (async () => {
      const data =
        await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${persistent.branch}/data.json`)
          .then((r) => r.json());
      assert.isUndefined(data.lastPR);
      assert.sameMembers(data.frozen, ['async-await-queue']);
      assert.sameMembers(data.skipped, ['yatag@1.3.0']);
    })().then(() => done()).catch(done);
  });
});
