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

import '@testing-library/jest-dom/vitest';
import { test, expect, vi, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

import ContainerDetails from './ContainerDetails.svelte';
import { get } from 'svelte/store';
import { containersInfos } from '/@/stores/containers';
import type { ContainerInfo } from '../../../../main/src/plugin/api/container-info';

import { router } from 'tinro';
import { lastPage } from '/@/stores/breadcrumb';

const listContainersMock = vi.fn();

const getContainerInspectMock = vi.fn();

const myContainer: ContainerInfo = {
  Id: 'myContainer',
  Labels: {},
  Status: 'running',
  engineId: 'engine0',
  engineName: 'podman',
  engineType: 'podman',
  StartedAt: '',
  Names: ['name0'],
  Image: '',
  ImageID: '',
  Command: '',
  Created: 0,
  Ports: [],
  State: '',
};

const deleteContainerMock = vi.fn();

vi.mock('xterm', () => {
  return {
    Terminal: vi.fn().mockReturnValue({ loadAddon: vi.fn(), open: vi.fn(), write: vi.fn(), clear: vi.fn() }),
  };
});

beforeAll(() => {
  (window as any).listContainers = listContainersMock;
  (window as any).deleteContainer = deleteContainerMock;
  (window as any).getContainerInspect = getContainerInspectMock;

  (window as any).getConfigurationValue = vi.fn().mockReturnValue(12);

  (window as any).logsContainer = vi.fn();
  (window as any).matchMedia = vi.fn().mockReturnValue({
    addListener: vi.fn(),
  });
  (window as any).ResizeObserver = vi.fn().mockReturnValue({ observe: vi.fn(), unobserve: vi.fn() });
});

beforeEach(() => {});

test('Expect logs when tty is not enabled', async () => {
  router.goto('/');

  containersInfos.set([myContainer]);

  // spy router.goto
  const routerGotoSpy = vi.spyOn(router, 'goto');

  getContainerInspectMock.mockResolvedValue({
    Config: {
      Tty: false,
    },
  });

  // render the component
  render(ContainerDetails, { containerID: 'myContainer' });

  // wait router.goto is called
  while (routerGotoSpy.mock.calls.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // grab current route and check we have been redirected to tty
  const currentRoute = window.location;
  expect(currentRoute.href).toBe('http://localhost:3000/logs');

  expect(routerGotoSpy).toBeCalledWith('/logs');
});

test('Expect show tty if container has tty enabled', async () => {
  router.goto('/');

  containersInfos.set([myContainer]);

  // spy router.goto
  const routerGotoSpy = vi.spyOn(router, 'goto');

  getContainerInspectMock.mockResolvedValue({
    Config: {
      Tty: true,
      OpenStdin: true,
    },
  });

  // render the component
  render(ContainerDetails, { containerID: 'myContainer' });

  // wait router.goto is called
  while (routerGotoSpy.mock.calls.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // grab current route and check we have been redirected to tty
  const currentRoute = window.location;
  expect(currentRoute.href).toBe('http://localhost:3000/tty');

  expect(routerGotoSpy).toBeCalledWith('/tty');
});

test('Expect redirect to previous page if container is deleted', async () => {
  router.goto('/');

  getContainerInspectMock.mockResolvedValue({
    Config: {},
  });
  const routerGotoSpy = vi.spyOn(router, 'goto');
  listContainersMock.mockResolvedValue([myContainer]);
  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  while (get(containersInfos).length !== 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // remove myContainer from the store when we call 'deleteContainer'
  // it will then refresh the store and update ContainerDetails page
  deleteContainerMock.mockImplementation(() => {
    containersInfos.update(containers => containers.filter(container => container.Id !== myContainer.Id));
  });

  // defines a fake lastPage so we can check where we will be redirected
  lastPage.set({ name: 'Fake Previous', path: '/last' });

  // render the component
  render(ContainerDetails, { containerID: 'myContainer' });

  // wait router.goto is called
  while (routerGotoSpy.mock.calls.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // grab current route
  const currentRoute = window.location;
  expect(currentRoute.href).toBe('http://localhost:3000/logs');

  // click on delete container button
  const deleteButton = screen.getByRole('button', { name: 'Delete Container' });
  await fireEvent.click(deleteButton);

  // check that delete method has been called
  expect(deleteContainerMock).toHaveBeenCalled();

  // expect that we have called the router when page has been removed
  // to jump to the previous page
  expect(routerGotoSpy).toBeCalledWith('/last');

  // grab updated route
  const afterRoute = window.location;
  expect(afterRoute.href).toBe('http://localhost:3000/last');
});
