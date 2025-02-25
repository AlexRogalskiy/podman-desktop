<script lang="ts">
import type { IConfigurationPropertyRecordedSchema } from '../../../../main/src/plugin/configuration-registry';

import PreferencesRenderingItem from './PreferencesRenderingItem.svelte';
import SettingsPage from './SettingsPage.svelte';
import Route from '../../Route.svelte';
import { isDefaultScope } from './Util';

export let properties: IConfigurationPropertyRecordedSchema[] = [];
export let key: string;

let updateSearchValueTimeout: NodeJS.Timeout;

let matchingRecords: Map<string, IConfigurationPropertyRecordedSchema[]>;
export let searchValue = '';
$: searchValue;

$: matchingRecords = properties
  .filter(property => property.parentId.startsWith(key) && isDefaultScope(property.scope) && !property.hidden)
  .filter(
    property =>
      !searchValue ||
      matchValue(property.title, searchValue) ||
      (property.description && matchValue(property.description, searchValue)) ||
      (property.markdownDescription && matchValue(property.markdownDescription, searchValue)),
  )
  .reduce((map, property) => {
    if (!map.has(property.parentId)) {
      map.set(property.parentId, []);
    }
    map.get(property.parentId)?.push(property);
    return map;
  }, new Map<string, IConfigurationPropertyRecordedSchema[]>());

function matchValue(text: string, searchValue: string): boolean {
  if (!text) {
    return false;
  }
  return text.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0;
}
function updateSearchValue(event: any) {
  clearTimeout(updateSearchValueTimeout);
  updateSearchValueTimeout = setTimeout(() => (searchValue = event.target.value), 500);
}
</script>

<Route path="/" breadcrumb="{key}">
  <SettingsPage title="Preferences">
    <div class="mt-4" slot="header">
      <div
        class="flex items-center text-gray-700 rounded-sm rounded-lg border-2 border-charcoal-900 focus-within:border-violet-500">
        <input
          on:input="{e => updateSearchValue(e)}"
          class="w-full bg-charcoal-900 py-1 px-3 outline-0 text-sm"
          name="search"
          type="text"
          placeholder="Search preferences"
          id="input-search"
          aria-label="input-search" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 mr-2 bg-charcoal-900"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>
    <div class="flex flex-col space-y-5">
      {#if matchingRecords.size === 0}
        <div>No Settings Found</div>
      {:else}
        {#each [...matchingRecords.keys()].sort((a, b) => a.localeCompare(b)) as configSection}
          {@const records = matchingRecords.get(configSection)}
          {#if records}
            <div>
              <div class="first-letter:uppercase">{records.at(0)?.title}</div>
              {#each records as configItem}
                <div class="bg-charcoal-600 rounded-md mt-2 ml-2">
                  <PreferencesRenderingItem record="{configItem}" />
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </SettingsPage>
</Route>
