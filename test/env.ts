import * as path from 'node:path';
import { Octokit } from '@octokit/rest';

export const workTree = path.resolve(__dirname, 'work');
export const tmpDir = path.resolve(__dirname, 'tmp');

process.env.RUNNER_TOOL_CACHE = tmpDir;
process.env.RUNNER_TEMP = tmpDir;

process.env.GITHUB_REPOSITORY_OWNER = 'mmomtchev';
process.env.GITHUB_REPOSITORY = 'mmomtchev/autoarboriculturist-test-repo';

process.env.INPUT_PATH = workTree;
process.env.INPUT_ADMIN = 'mmomtchev';
process.env.INPUT_MINORTITLE = 'Bump dependencies';

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

