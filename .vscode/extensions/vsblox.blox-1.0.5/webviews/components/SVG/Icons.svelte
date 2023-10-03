<script>
  import Angular from "./Angular.svelte";
  import Bootstrap from "./Bootstrap.svelte";
  import Lavarel from "./Lavarel.svelte";
  import MaterialUi from "./MaterialUI.svelte";
  import React from "./React.svelte";
  import Svelte from "./Svelte.svelte";
  import Tailwind from "./Tailwind.svelte";
  import Vue from "./Vue.svelte";
  export let icon = null;
  export let color = "#fff";
</script>

{#if icon.toLowerCase() === "angular"}
  <Angular {color} />
{:else if icon.toLowerCase() === "bootstrap"}
  <Bootstrap {color} />
{:else if icon.toLowerCase() === "laravel"}
  <Lavarel {color} />
{:else if icon.toLowerCase() === "materialui"}
  <MaterialUi {color} />
{:else if icon.toLowerCase() === "react"}
  <React {color} />
{:else if icon.toLowerCase() === "svelte"}
  <Svelte {color} />
{:else if icon.toLowerCase() === "tailwind"}
  <Tailwind {color} />
{:else if icon.toLowerCase() === "vue"}
  <Vue {color} />
{/if}
