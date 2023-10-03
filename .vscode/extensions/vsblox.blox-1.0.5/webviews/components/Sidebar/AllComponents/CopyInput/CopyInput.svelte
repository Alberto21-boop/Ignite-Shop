<script>
  export let vscode;
  let tailwindCDN = "https://cdn.tailwindcss.com";
  let isCopied = false;

  const clipBoard = () => {
    navigator.clipboard.writeText(tailwindCDN);
    isCopied = true;
    vscode.postMessage({
      type: "onMessage",
      message: "CDN copied!",
    });
  };
</script>

<div class="cdn-input">
  <!-- <label for="cdn">Tailwind CDN</label> -->
  <input
    id="cdn"
    type="text"
    disabled
    value={isCopied ? "Link copied!" : "Tailwind CDN"}
  />
  <button class="btn-copy" on:click={clipBoard} title="Copy link">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <path fill="none" d="M0 0h24v24H0z" /><path
        d="M7 4V2h10v2h3.007c.548 0 .993.445.993.993v16.014a.994.994 0 0 1-.993.993H3.993A.994.994 0 0 1 3 21.007V4.993C3 4.445 3.445 4 3.993 4H7zm0 2H5v14h14V6h-2v2H7V6zm2-2v2h6V4H9z"
        fill="#949A98"
      />
    </svg>
  </button>
</div>

<style>
  .cdn-input {
    position: relative;
    display: flex;
    border: 1px solid var(--vscode-input-background);
    margin-top: 13px;
    color: #7f8483;
  }
  /*
  .cdn-input label {
    position: absolute;
    top: -11px;
    left: 4px;
    padding: 0px 3px;
    background-color: var(--vscode-editor-background);
  } */

  .cdn-input input {
    flex: 14;
    background-color: transparent;
    color: #949a98;
  }
  .cdn-input button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-around;
    background-color: var(--vscode-input-background);
    color: white;
    outline: none;
  }

  /* .cdn-input button:active,
  .cdn-input button:hover {
    background-color: transparent;
  } */

  .cdn-input input,
  .cdn-input button {
    padding: 9px;
    font-size: 14px;
  }
</style>
