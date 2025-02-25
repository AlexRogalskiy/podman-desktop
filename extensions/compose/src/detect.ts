/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { CliRun } from './cli-run';
import { shellPath } from 'shell-path';
import { resolve } from 'path';
import * as http from 'node:http';
import type { OS } from './os';

export class Detect {
  static readonly WINDOWS_SOCKET_PATH = '//./pipe/docker_engine';
  static readonly UNIX_SOCKET_PATH = '/var/run/docker.sock';

  constructor(
    private cliRun: CliRun,
    private os: OS,
    private storagePath: string,
  ) {}

  // search if docker-compose is available in the path (+ include storage/bin folder)
  async checkForDockerCompose(): Promise<boolean> {
    const result = await this.cliRun.runCommand('docker-compose', ['--version']);
    return result.exitCode === 0;
  }

  // search if the podman-compose is available in the storage/bin path
  async checkStoragePath(): Promise<boolean> {
    // check that extension/bin folder is in the PATH
    const extensionBinPath = resolve(this.storagePath, 'bin');

    // grab current path
    const currentPath = await shellPath();
    return currentPath.includes(extensionBinPath);
  }

  // Async function that checks to see if the current Docker socket is a disguised Podman socket
  async checkDefaultSocketIsAlive(): Promise<boolean> {
    const socketPath = this.getSocketPath();

    const podmanPingUrl = {
      path: '/_ping',
      socketPath,
    };

    return new Promise<boolean>(resolve => {
      const req = http.get(podmanPingUrl, res => {
        res.on('data', () => {
          // do nothing
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
      req.once('error', err => {
        console.debug('Error while pinging docker', err);
        resolve(false);
      });
    });
  }

  // Function that checks whether you are running windows, mac or linux and returns back
  // the correct Docker socket location
  getSocketPath(): string {
    let socketPath: string = Detect.UNIX_SOCKET_PATH;
    if (this.os.isWindows()) {
      socketPath = Detect.WINDOWS_SOCKET_PATH;
    }
    return socketPath;
  }
}
