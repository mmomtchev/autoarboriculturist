import * as core from '@actions/core';
import Arborist from '@npmcli/arborist';
import { getPersistent } from './persistent';

declare module '@npmcli/arborist' {
  export interface Node {
    version: string;
  }
}

export async function updateMinor(upgradeAll?: boolean): Promise<string | null> {
  const arb = new Arborist({
    path: core.getInput('path', { required: false })
  });
  const data = await getPersistent();

  await arb.loadActual();

  const names: string[] = [];
  let msg = '';

  const toCheck = upgradeAll ?
    Array.from(arb.actualTree.children.keys())
    :
    Array.from(arb.actualTree.edgesOut).map((e) => e[0]);

  for (const pkg of toCheck) {
    const info = arb.actualTree.children.get(pkg);

    if (!info) {
      core.error(`${pkg} not found, did you npm install?`);
      throw new Error(`${pkg} not found, did you npm install?`);
    }

    if (data.frozen.includes(pkg)) {
      core.info(`Skipping frozen package ${pkg}`);
      continue;
    }

    core.info(`Adding ${pkg} to the upgrade list`);
    names.push(pkg);
  }

  await arb.buildIdealTree({ update: { names } });

  for (const pkg of arb.idealTree.children.keys()) {
    const from = arb.actualTree.children.get(pkg);
    const to = arb.idealTree.children.get(pkg);
    if (from && from.version !== to.version) {

      if (data.skipped.includes(`${pkg}@${to.version}`)) {

        core.info(`Package ${pkg}@${to.version} explicitly skipped`);
        arb.idealTree.children.set(pkg, from);
        continue;
      }

      core.notice(`upgrade ${pkg} from ${from.version} to ${to.version}`);
      msg += `* upgrade \`${pkg}\` from **${from.version}** to **${to.version}**\n`;

    } else if (!from) {

      if (data.skipped.includes(`${pkg}@${to.version}`)) {
        core.info(`Package ${pkg}@${to.version} explicitly skipped`);
        arb.idealTree.children.delete(pkg);
        continue;
      }

      core.notice(`install ${pkg} ${to.version}`);
      msg += `* install \`${pkg}\` **${to.version}**\n`;
    }
  }

  if (msg.length > 0) {
    msg += '\n\n*PR automatically created by mmomtchev/autoarboriculturist*\n';
    await arb.reify();
    return msg;
  }
  return null;
}
