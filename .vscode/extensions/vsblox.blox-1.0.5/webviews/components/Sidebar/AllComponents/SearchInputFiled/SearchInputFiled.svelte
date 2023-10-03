<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let search = "";
  export let searchIsDisabled = true;
  let searchInputRef;

  const filterComponents = (event) => {
    dispatch("filterComponents", {
      value: event.target.value,
    });
  };
</script>

<div class="search-input">
  <input
    type="text"
    disabled={searchIsDisabled}
    placeholder="Search"
    bind:this={searchInputRef}
    on:input={filterComponents}
  />
  {#if search.length > 0}
    <span
      class="close-icon"
      on:click={() => {
        search = "";
        searchInputRef.value = "";
      }}>&#10005;</span
    >
  {/if}
</div>

<style>
  .search-input {
    position: relative;
  }
  .search-input input {
    margin: 15px 0;
    padding: 8px;
    border-radius: 4px;
    outline: none;
  }

  .search-input .close-icon {
    position: absolute;
    right: 18px;
    top: 7px;
    cursor: pointer;
  }
</style>
