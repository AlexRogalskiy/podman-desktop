<script lang="ts">
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa/src/fa.svelte';
import Modal from '../dialogs/Modal.svelte';
import ProviderLogo from '../dashboard/ProviderLogo.svelte';
import type { ProviderInfo, CheckStatus } from '../../../../main/src/plugin/api/provider-info';
import Button from '../ui/Button.svelte';

export let providerToBeInstalled: { provider: ProviderInfo; displayName: string };
export let preflightChecks: CheckStatus[];
export let closeCallback: () => void;
export let doCreateNew: (provider: ProviderInfo, displayName: string) => void;

function openLink(e: MouseEvent, url: string): void {
  e.preventDefault();
  e.stopPropagation();
  window.openExternal(url);
}
</script>

{#if providerToBeInstalled}
  <Modal on:close="{() => closeCallback()}">
    <div
      class="inline-block w-full overflow-hidden text-left transition-all transform bg-charcoal-600 z-50 rounded-xl shadow-xl shadow-charcoal-900"
      aria-label="install provider">
      <div class="flex items-center justify-between px-5 py-4 mb-4">
        <h1 class="text-md font-semibold">Create a new {providerToBeInstalled.displayName}</h1>
        <button class="hover:text-gray-300 px-2 py-1" aria-label="Close" on:click="{() => closeCallback()}">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
      <div class="overflow-y-auto px-4 pb-4">
        <div class="flex flex-col rounded-lg">
          <div class="mx-auto max-w-[250px] mb-5">
            <ProviderLogo provider="{providerToBeInstalled.provider}" />
          </div>
          <div class="flex flex-row mx-auto text-md">Some system requirements are missing.</div>
          <div class="flex flex-col min-h-[150px] mt-5 mx-auto py-4 px-10 rounded-md bg-charcoal-800">
            {#each preflightChecks as preCheck}
              <div class="flex flex-row mb-2 mx-auto">
                <Fa icon="{faCircleXmark}" class="text-red-500 mt-0.5" />
                <div class="flex flex-col ml-1 text-sm">
                  {#if preCheck.description}
                    <span class="w-full" aria-label="{preCheck.description}">{preCheck.description}</span>
                    {#if preCheck.docLinks}
                      <div class="flex flex-row mt-0.5">
                        <span class="mr-1">See:</span>
                        {#each preCheck.docLinks as link}
                          <a href="{link.url}" target="_blank" class="mr-1" on:click="{e => openLink(e, link.url)}"
                            >{link.title}</a>
                        {/each}
                      </div>
                    {/if}
                  {:else}
                    {preCheck.name}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <div class="text-xs text-gray-800 mt-2 text-center">
            Be sure that your system fulfills all the requirements above before proceeding
          </div>
          <div class="flex flex-row justify-end w-full pt-2">
            <Button type="link" class="mr-3" on:click="{() => closeCallback()}">Cancel</Button>
            <Button
              aria-label="Next"
              on:click="{() => doCreateNew(providerToBeInstalled.provider, providerToBeInstalled.displayName)}"
              >Retry</Button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
{/if}
