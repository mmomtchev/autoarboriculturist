import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as cache from '@actions/cache';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import { updateMinor } from './minor';
import { savePersistent } from './persistent';
import { getLastPR, submitPR } from './pr';

declare module '@npmcli/arborist' {
  export interface Node {
    version: string;
  }
}

