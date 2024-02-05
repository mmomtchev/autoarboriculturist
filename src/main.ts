import * as core from '@actions/core';
import { updateMinor } from './minor';
import { savePersistent } from './persistent';
import { getLastPR, submitPR } from './pr';

export async function minor() {
  const status = await getLastPR().catch((e) => {
    core.error(e);
    return false;
  });
  let updates = false;

  if (status) {
    core.notice('Last PR still open, not doing anything');
  } else {
    const msg = await updateMinor().catch((e) => {
      core.error(e);
      return null;
    });
    if (msg) {
      const title = core.getInput('minorTitle', { required: false });
      await submitPR(title, msg);
      updates = true;
    } else {
      core.info('No minor updates available');
    }
  }

  await savePersistent().catch((e) => {
    core.error(e);
  });

  return updates;
}

export async function main() {
  const type = core.getInput('type', { required: false });

  let updated = false;
  if (type === 'minor' || type === 'auto') {
    updated = await minor();
  }
}
