import * as core from '@actions/core';
import { main } from './main';

main().then(() => {
  core.info('autoarboriculturist out');
});
