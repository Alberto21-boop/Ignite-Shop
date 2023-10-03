<script>
  import RadioButton from "./RadioButton.svelte";
  import { createEventDispatcher } from "svelte";

  export let framework = "tailwindCss";
  const dispatch = createEventDispatcher();

  const onChangeFramework = (event) => {
    dispatch("onChangeFramework", {
      selectedFramework: event.target.value,
    });
  };
</script>

<div class="select-framework">
  <span>Code:</span>
  <RadioButton
    value="tailwindCss"
    bind:group={framework}
    on:click={onChangeFramework}
  />
  <RadioButton
    value="angular"
    bind:group={framework}
    on:click={onChangeFramework}
  />
  <RadioButton
    value="react"
    bind:group={framework}
    on:click={onChangeFramework}
  />
  <RadioButton
    value="vue"
    bind:group={framework}
    on:click={onChangeFramework}
  />
</div>

<style>
  .select-framework {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 44px;
    border: 1px solid #333333;
    border-radius: 5px;
    padding: 6px 16px;
  }
  .select-framework span {
    margin-right: 23px;
    color: white;
  }
</style>
