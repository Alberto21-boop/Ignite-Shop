<!-- <script>
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import Icons from "../SVG/Icons.svelte";
  export let selectedOption;
  export let label = null;
  export let options = null;
  let showOptions = false;
  let selectLabelRef;
  let selectHeaderRef;

  const dispatch = createEventDispatcher();

  const icons = {
    chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Up</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Down</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`,
  };

  // onMount(() => {
  //   selectHeaderRef.addEventListener("onfocus", selectHeaderFocusHandler);
  // });

  const onChange = (event) => {
    showOptions = !showOptions;
    console.log(event);

    dispatch("onChange", {
      selectedOption: event.target.value,
    });
  };

  const windowClickHandler = (event) => {
    if (event.target !== selectHeaderRef && event.target !== selectLabelRef) {
      showOptions = false;
      selectHeaderRef.blur();
    }
  };

  const selectHeaderFocusHandler = (event) => {
    console.log(event);
  };

  window.addEventListener("click", windowClickHandler);

  onDestroy(() => {
    window.removeEventListener("click", windowClickHandler);
  });
</script>

{#if label}
  <label for="selected-option" class="select-label">{label}</label>
{/if}
<div class="custom-select">
  <button
    class="selected-option-container"
    on:click={() => {
      showOptions = !showOptions;
    }}
    bind:this={selectHeaderRef}
    on:focus={() => {
      showOptions = true;
    }}
    on:blur={() => {
      showOptions = false;
    }}
  >
    <label for="selected-option" bind:this={selectLabelRef}>
      <Icons icon={options[selectedOption].icon} />
      <span>{options[selectedOption].text}</span>
      {#if showOptions}
        {@html icons.chevronUp}
      {:else}
        {@html icons.chevronDown}
      {/if}
    </label>
  </button>
  <p>This is a custom select</p>

  <div class={`options ${!showOptions ? "options--disabled" : ""}`}>
    {#each Object.keys(options) as key}
      <div
        class={`option ${
          options[key].value === selectedOption ? "option--active" : ""
        }`}
      >
        <input
          type="radio"
          bind:group={selectedOption}
          value={options[key].value}
          name="framework"
          on:click={onChange}
          id={options[key].text}
        />
        <label
          for={options[key].text}
          class={options[key].value === selectedOption ? "label--active" : ""}
        >
          {options[key].text}
          <Icons icon={options[key].icon} />
        </label>
      </div>
    {/each}
  </div>
</div>

<style>
  .custom-select {
    position: relative;
  }

  .custom-select .selected-option-container {
    border: 1px solid var(--vscode-input-background);
    border-radius: 4px;
    padding: 8px 10px;
    background-color: transparent;
    outline: none;
  }

  .custom-select .selected-option-container,
  .custom-select .options .option {
    position: relative;
    display: flex;
    align-items: center;
    outline: none;
    cursor: pointer;
  }

  .custom-select .selected-option-container label {
    padding: 3px 8px;
  }

  .custom-select .selected-option-container label span {
    margin-left: 8px;
    font-size: 14px;
    font-family: "PJSR";
    pointer-events: none;
  }

  .custom-select .selected-option-container label,
  .custom-select .options .option label {
    width: 100%;
    color: #7f8483;
    flex: 1;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: 600;
    font-family: "PJSR";
    font-size: 13px;
  }

  .custom-select .options .option label {
    justify-content: space-between;
    font-size: 13px;
    padding: 10px 16px;
  }
  .custom-select .selected-option-container input,
  .custom-select .options .option input {
    opacity: 0;
    position: absolute;
    cursor: pointer;
  }

  .custom-select .options {
    position: absolute;
    top: 51px;
    width: 100%;
    border-radius: 4px;
    z-index: 1000;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-background);
    overflow: hidden;
    cursor: pointer;
    transition: max-height 1s;
  }

  .custom-select .options--disabled {
    display: none;
  }

  .custom-select .options .option:not(:last-child) {
    border-bottom: 1px solid var(--vscode-input-background);
  }

  .custom-select .options .option:hover {
    background-color: var(--vscode-input-background);
  }
  .select-label {
    font-weight: 500;
    width: 100%;
    font-size: 16px;
    display: inline-block;
    margin-top: 20px;
    margin-bottom: 8px;
  }
</style> -->
<script>
  import { createEventDispatcher } from "svelte";
  export let selectedFramework = "html";
  let showFrameworks = false;
  let selectLabelRef;
  let selectInputRef;

  const dispatch = createEventDispatcher();

  const frameworks = {
    html: {
      text: "Tailwind CSS",
      value: "html",

      inActiveIcon: `<svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M12 6C9.6 6 8.1 7.30909 7.5 9.92727C8.4 8.61818 9.45 8.12727 10.65 8.45455C11.3347 8.64109 11.824 9.18327 12.3657 9.78291C13.248 10.76 14.2693 11.8909 16.5 11.8909C18.9 11.8909 20.4 10.5818 21 7.96364C20.1 9.27273 19.05 9.76364 17.85 9.43636C17.1653 9.24982 16.676 8.70764 16.1343 8.108C15.252 7.13091 14.2307 6 12 6ZM7.5 11.8909C5.1 11.8909 3.6 13.2 3 15.8182C3.9 14.5091 4.95 14.0182 6.15 14.3455C6.83467 14.5324 7.324 15.0742 7.86567 15.6738C8.748 16.6509 9.76933 17.7818 12 17.7818C14.4 17.7818 15.9 16.4727 16.5 13.8545C15.6 15.1636 14.55 15.6545 13.35 15.3273C12.6653 15.1407 12.176 14.5985 11.6343 13.9989C10.752 13.0218 9.73067 11.8909 7.5 11.8909Z"
              fill="#7F8483"
            />
          </svg>`,
    },
    angular: {
      text: "Angular",
      value: "angular",

      inActiveIcon: `<svg
        class="radio-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12.0002 2L21.3002 5.32L19.8822 17.63L12.0002 22L4.1182 17.63L2.7002 5.32L12.0002 2ZM12.0002 4.21L6.1862 17.26H8.3542L9.5232 14.34H14.4572L15.6272 17.26H17.7942L12.0002 4.21ZM13.6982 12.54H10.3022L12.0002 8.45L13.6982 12.54Z"
          fill="#7F8483"
        />
      </svg>`,
    },
    react: {
      text: "React",
      value: "react",
      inActiveIcon: `<svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14.448 16.2401C13.9125 17.0015 13.329 17.728 12.701 18.4151C14.373 20.0381 15.929 20.7981 16.791 20.2991C17.655 19.8011 17.774 18.0741 17.205 15.8151C16.352 16.0051 15.425 16.1491 14.448 16.2401V16.2401ZM13.138 16.3271C12.3797 16.3585 11.6203 16.3585 10.862 16.3271C11.239 16.8191 11.62 17.2751 12 17.6911C12.38 17.2751 12.76 16.8191 13.138 16.3271ZM18.178 8.43308C20.843 9.19708 22.583 10.4671 22.583 12.0001C22.583 13.5331 20.843 14.8031 18.178 15.5671C18.848 18.2571 18.619 20.3991 17.292 21.1651C15.964 21.9321 13.994 21.0601 12 19.1351C10.006 21.0601 8.03599 21.9321 6.70799 21.1651C5.38099 20.3991 5.15099 18.2571 5.82199 15.5671C3.15699 14.8031 1.41699 13.5331 1.41699 12.0001C1.41699 10.4671 3.15699 9.19708 5.82199 8.43308C5.15199 5.74308 5.38099 3.60108 6.70799 2.83508C8.03599 2.06808 10.006 2.94008 12 4.86508C13.994 2.94008 15.964 2.06808 17.292 2.83508C18.619 3.60108 18.849 5.74308 18.178 8.43308V8.43308ZM17.205 8.18508C17.775 5.92508 17.655 4.19908 16.792 3.70108C15.929 3.20208 14.373 3.96208 12.702 5.58508C13.293 6.22808 13.881 6.95908 14.448 7.76008C15.426 7.85008 16.352 7.99408 17.205 8.18508ZM6.79499 15.8151C6.22499 18.0751 6.34499 19.8011 7.20799 20.2991C8.07099 20.7981 9.62699 20.0381 11.298 18.4151C10.6703 17.728 10.0871 17.0015 9.55199 16.2401C8.62489 16.1572 7.70402 16.0153 6.79499 15.8151V15.8151ZM10.862 7.67308C11.6203 7.64169 12.3797 7.64169 13.138 7.67308C12.7785 7.20254 12.3988 6.74778 12 6.31008C11.62 6.72608 11.24 7.18208 10.862 7.67408V7.67308ZM9.55199 7.76008C10.0878 6.99862 10.6716 6.27215 11.3 5.58508C9.62699 3.96208 8.06999 3.20208 7.20899 3.70108C6.34499 4.19908 6.22599 5.92608 6.79499 8.18508C7.64799 7.99508 8.57499 7.85108 9.55199 7.76008V7.76008ZM13.894 15.2801C14.6058 14.2354 15.2386 13.1391 15.787 12.0001C15.2386 10.8611 14.6058 9.76472 13.894 8.72008C12.6331 8.62568 11.3669 8.62568 10.106 8.72008C9.39415 9.76472 8.76139 10.8611 8.21299 12.0001C8.76139 13.1391 9.39415 14.2354 10.106 15.2801C11.3669 15.3745 12.6331 15.3745 13.894 15.2801V15.2801ZM15.178 15.1491C15.793 15.0691 16.378 14.9661 16.928 14.8451C16.7481 14.2808 16.5439 13.7247 16.316 13.1781C15.964 13.8502 15.5843 14.5074 15.178 15.1481V15.1491ZM8.82199 8.85008C8.20699 8.93008 7.62199 9.03308 7.07199 9.15408C7.24199 9.69008 7.44599 10.2481 7.68399 10.8211C8.036 10.149 8.41566 9.49178 8.82199 8.85108V8.85008ZM7.07199 14.8441C7.62199 14.9651 8.20699 15.0671 8.82199 15.1481C8.41566 14.5074 8.036 13.8502 7.68399 13.1781C7.44599 13.7501 7.24199 14.3081 7.07199 14.8441ZM6.09399 14.5991C6.35499 13.7651 6.69399 12.8911 7.10399 11.9991C6.69399 11.1071 6.35499 10.2331 6.09399 9.39908C3.85199 10.0361 2.41699 11.0031 2.41699 11.9991C2.41699 12.9951 3.85199 13.9621 6.09399 14.5991ZM16.928 9.15408C16.378 9.03308 15.793 8.93108 15.178 8.85008C15.5843 9.49078 15.964 10.148 16.316 10.8201C16.554 10.2481 16.758 9.69008 16.928 9.15408V9.15408ZM17.906 9.39908C17.645 10.2331 17.306 11.1071 16.896 11.9991C17.306 12.8911 17.645 13.7651 17.906 14.5991C20.148 13.9621 21.583 12.9951 21.583 11.9991C21.583 11.0031 20.148 10.0361 17.906 9.39908ZM12 13.8801C11.7531 13.8801 11.5086 13.8315 11.2805 13.737C11.0525 13.6425 10.8452 13.504 10.6706 13.3294C10.4961 13.1549 10.3576 12.9476 10.2631 12.7195C10.1686 12.4914 10.12 12.247 10.12 12.0001C10.12 11.7532 10.1686 11.5087 10.2631 11.2806C10.3576 11.0525 10.4961 10.8453 10.6706 10.6707C10.8452 10.4961 11.0525 10.3577 11.2805 10.2632C11.5086 10.1687 11.7531 10.1201 12 10.1201C12.4986 10.1201 12.9768 10.3182 13.3294 10.6707C13.6819 11.0233 13.88 11.5015 13.88 12.0001C13.88 12.4987 13.6819 12.9769 13.3294 13.3294C12.9768 13.682 12.4986 13.8801 12 13.8801V13.8801Z"
          fill="#7F8483"/>
      </svg>`,
    },
    vue: {
      text: "Vue",
      value: "vue",

      inActiveIcon: `<svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 3H5L12 15L19 3H23L12 22L1 3ZM9.667 3L12 7L14.333 3H18.368L12 14L5.632 3H9.667Z"
          fill="#7F8483"
        />
      </svg>`,
    },
  };

  const icons = {
    chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Up</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Down</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`,
  };

  const onChangeFramework = (event) => {
    showFrameworks = !showFrameworks;

    dispatch("onChangeFramework", {
      selectedFramework: event.target.value,
    });
  };

  window.addEventListener("click", (event) => {
    if (event.target !== selectInputRef && event.target !== selectLabelRef) {
      showFrameworks = false;
    }
  });
</script>

<div class="custom-select">
  <div class="selected-option-container">
    <input
      type="checkbox"
      on:change={() => {
        showFrameworks = !showFrameworks;
      }}
      id="selected-option"
      bind:checked={showFrameworks}
      bind:this={selectInputRef}
    />
    <label for="selected-option" bind:this={selectLabelRef}>
      {@html frameworks[selectedFramework].inActiveIcon}
      <span>{frameworks[selectedFramework].text}</span>
      {#if showFrameworks}
        {@html icons.chevronUp}
      {:else}
        {@html icons.chevronDown}
      {/if}
    </label>
  </div>

  <div class={`options ${!showFrameworks ? "options--disabled" : ""}`}>
    {#each Object.keys(frameworks) as frameworkKey}
      <div
        class={`option ${
          frameworks[frameworkKey].value === selectedFramework
            ? "option--active"
            : ""
        }`}
      >
        <input
          type="radio"
          bind:group={selectedFramework}
          value={frameworks[frameworkKey].value}
          name="framework"
          on:click={onChangeFramework}
          id={frameworks[frameworkKey].text}
        />
        <label
          for={frameworks[frameworkKey].text}
          class={frameworks[frameworkKey].value === selectedFramework
            ? "label--active"
            : ""}
        >
          {frameworks[frameworkKey].text}
          {@html frameworks[frameworkKey].inActiveIcon}
        </label>
      </div>
    {/each}
  </div>
</div>

<style>
  .custom-select {
    position: relative;
  }

  .custom-select .selected-option-container {
    border: 1px solid var(--vscode-input-background);
    border-radius: 4px;
    padding: 8px 10px;
  }

  .custom-select .selected-option-container,
  .custom-select .options .option {
    position: relative;
    display: flex;
    align-items: center;
    outline: none;
    cursor: pointer;
  }

  .custom-select .selected-option-container label {
    padding: 3px 8px;
  }

  .custom-select .selected-option-container label span {
    margin-left: 8px;
    font-size: 14px;
    font-family: "PJSR";
    pointer-events: none;
  }

  .custom-select .selected-option-container label,
  .custom-select .options .option label {
    width: 100%;
    color: #7f8483;
    flex: 1;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: 600;
    font-family: "PJSR";
    font-size: 13px;
  }

  /* var(--vscode-input-background) */

  .custom-select .options .option label {
    justify-content: space-between;
    font-size: 13px;
    padding: 10px 16px;
  }
  .custom-select .selected-option-container input,
  .custom-select .options .option input {
    opacity: 0;
    position: absolute;
    cursor: pointer;
  }

  .custom-select .options {
    position: absolute;
    top: 54px;
    width: 100%;
    border-radius: 4px;
    z-index: 1000;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-background);
    overflow: hidden;
    cursor: pointer;
    transition: max-height 1s;
  }

  .custom-select .options--disabled {
    display: none;
  }

  .custom-select .options .option:not(:last-child) {
    border-bottom: 1px solid var(--vscode-input-background);
  }

  .custom-select .options .option:hover {
    background-color: var(--vscode-input-background);
  }
</style>
