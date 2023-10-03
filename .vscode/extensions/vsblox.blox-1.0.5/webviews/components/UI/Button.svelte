<script>
  export let styleClasses = "";
  export let type = "button";
  export let text = "Button Text";
</script>

<button class={styleClasses} {type} on:click>{text}</button>

<style>
  .button {
    font-size: 16px;
    font-weight: bold;
    height: 48px;
    width: 100%;
    border-radius: 3px;
    margin: 0;
    outline: none;
  }

  .primary-button {
    background: #2563eb;
    color: white;
  }

  .primary-button:hover {
    background: #1e40af;
  }

  .pro-button {
    background-color: white;
    color: #0891b2;
  }

  .pro-button {
    background-color: #e5e7eb;
  }
</style>
