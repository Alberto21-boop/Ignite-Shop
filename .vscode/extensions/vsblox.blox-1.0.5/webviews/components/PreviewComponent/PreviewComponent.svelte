<script>
  import { onDestroy } from "svelte";

  import Spinner from "../UI/Spinner.svelte";

  const vscode = acquireVsCodeApi();
  let imageUrl = null;

  const extensionMessageHandler = async (event) => {
    const message = event.data; // The JSON data our extension sent

    switch (message.type) {
      case "gotImageUrl":
        imageUrl = message.imageUrl;

      default:
        break;
    }
  };
  window.addEventListener("message", extensionMessageHandler);

  onDestroy(() => {
    window.removeEventListener("message", extensionMessageHandler);
  });
</script>

{#if imageUrl !== null}
  <div class="preview-image">
    <img id="preview" src={imageUrl} alt="Preview" />
  </div>
{:else}
  <div class="spinner">
    <Spinner />
  </div>
{/if}

<style>
  .preview-image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
  .spinner {
    position: absolute;
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
  }
</style>
