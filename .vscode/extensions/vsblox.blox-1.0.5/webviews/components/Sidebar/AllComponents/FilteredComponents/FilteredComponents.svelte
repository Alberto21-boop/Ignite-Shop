<script>
  import ComponentItem from "../ComponentItem/ComponentItem.svelte";

  export let vscode;
  export let filteredComponents = null;
  export let search = "";
  export let framework = "";
  export let token = null;
</script>

{#if filteredComponents}
  <div class="component-section">
    {#each filteredComponents as component}
      <ComponentItem {component} {framework} {vscode} {token} />
    {:else}
      <p>No conmponent found for: "{search}"</p>
    {/each}
  </div>
{:else}
  <p>No conmponent found for: "{search}"</p>
{/if}
