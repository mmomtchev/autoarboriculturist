import * as core from '@actions/core';
import Arborist from '@npmcli/arborist';
import { Persistent } from './persistent';

declare module '@npmcli/arborist' {
  export interface Node {
    version: string;
  }
}

export async function updateMinor(data: Persistent, upgradeAll?: boolean): Promise<Record<string, { from?: Arborist.Node, to: Arborist.Node; }>> {
  const arb = new Arborist({
    path: core.getInput('path', { required: false })
  });
  const r: Record<string, { from?: Arborist.Node, to: Arborist.Node; }> = {};

  await arb.loadActual();

  const names: string[] = [];

  const toCheck = upgradeAll ?
    Array.from(arb.actualTree.children.keys())
    :
    Array.from(arb.actualTree.edgesOut).map((e) => e[0]);

  for (const pkg of toCheck) {
    const info = arb.actualTree.children.get(pkg);

    if (data.frozen.includes(pkg)) {
      core.debug(`Skipping frozen package ${pkg}`);
      continue;
    }
    const pkgid = info.pkgid;
    if (data.skipped.includes(pkgid)) {
      core.debug(`Package ${pkgid} explicitly skipped`);
      continue;
    }
    core.debug(`Adding ${pkg} to the upgrade list`);
    names.push(pkg);
  }

  await arb.buildIdealTree({ update: { names } });

  for (const pkg of arb.idealTree.children.keys()) {
    const from = arb.actualTree.children.get(pkg);
    const to = arb.idealTree.children.get(pkg);
    if (from && from.version !== to.version) {
      core.notice(`upgrade ${pkg} from ${from.version} to ${to.version}`);
      r[pkg] = { from, to };
    } else if (!from) {
      core.notice(`install ${pkg} ${to.version}`);
      r[pkg] = { to };
    }
  }

  if (Object.keys(r).length > 0) {
    await arb.reify();
    return r;
  }
  return null;
}
