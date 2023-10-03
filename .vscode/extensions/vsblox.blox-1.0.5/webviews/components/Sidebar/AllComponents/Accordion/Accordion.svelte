<script>
  import { createEventDispatcher } from "svelte";
  import { selectedCard, updateKey } from "../../../../stores";

  export let vscode = null;
  export let headerText = "N/A";
  export let isActive = false;
  export let fontWeight = "400";
  export let icon = null;
  export let showDropIcon = true;
  export let showActiveBorder = false;
  export let showCheckoutButton = false;
  export let showLogout = false;
  export let token = null;
  export let userDetails = [];
  let accordion;

  const dispatch = createEventDispatcher();

  const icons = {
    helpIcon: `<svg class="icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><style> .icon{margin-right: 7px;} </style><path d="M9 0C4.03125 0 0 4.03125 0 9C0 13.9688 4.03125 18 9 18C13.9688 18 18 13.9688 18 9C18 4.03125 13.9688 0 9 0ZM8.71875 14.25C8.53333 14.25 8.35207 14.195 8.1979 14.092C8.04373 13.989 7.92357 13.8426 7.85261 13.6713C7.78166 13.5 7.76309 13.3115 7.79926 13.1296C7.83544 12.9477 7.92473 12.7807 8.05584 12.6496C8.18695 12.5185 8.354 12.4292 8.53585 12.393C8.71771 12.3568 8.90621 12.3754 9.07752 12.4464C9.24882 12.5173 9.39524 12.6375 9.49825 12.7917C9.60127 12.9458 9.65625 13.1271 9.65625 13.3125C9.65625 13.5611 9.55748 13.7996 9.38166 13.9754C9.20585 14.1512 8.96739 14.25 8.71875 14.25V14.25ZM10.2863 9.46875C9.52641 9.97875 9.42188 10.4461 9.42188 10.875C9.42188 11.049 9.35274 11.216 9.22966 11.339C9.10659 11.4621 8.93967 11.5312 8.76562 11.5312C8.59158 11.5312 8.42466 11.4621 8.30159 11.339C8.17852 11.216 8.10938 11.049 8.10938 10.875C8.10938 9.84797 8.58188 9.03141 9.55406 8.37844C10.4578 7.77188 10.9688 7.3875 10.9688 6.54234C10.9688 5.96766 10.6406 5.53125 9.96141 5.20828C9.80156 5.13234 9.44578 5.05828 9.00797 5.06344C8.45859 5.07047 8.03203 5.20172 7.70344 5.46609C7.08375 5.96484 7.03125 6.50766 7.03125 6.51562C7.02709 6.6018 7.00601 6.68632 6.96919 6.76435C6.93237 6.84238 6.88054 6.9124 6.81667 6.9704C6.75279 7.0284 6.67811 7.07325 6.5969 7.10239C6.51569 7.13153 6.42954 7.14439 6.34336 7.14023C6.25718 7.13608 6.17266 7.11499 6.09463 7.07817C6.0166 7.04135 5.94659 6.98953 5.88859 6.92565C5.83059 6.86177 5.78574 6.7871 5.7566 6.70589C5.72745 6.62468 5.71459 6.53852 5.71875 6.45234C5.72391 6.33844 5.80313 5.31234 6.87984 4.44609C7.43813 3.99703 8.14828 3.76359 8.98922 3.75328C9.58453 3.74625 10.1437 3.84703 10.523 4.02609C11.6578 4.56281 12.2812 5.45766 12.2812 6.54234C12.2812 8.12813 11.2214 8.84016 10.2863 9.46875Z" fill="#9CA2A0"/></svg>`,
    chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><style>.ionicon{width:15px; pointer-events:none;}</style><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><style>.ionicon{width:15px; pointer-events:none;}</style><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`,
    chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" width="28" height="28" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><style>.ionicon{width:15px; pointer-events:none;}</style><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="9 6 15 12 9 18" /></svg>`,
    chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" width="28" height="28" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><style>.ionicon{width:15px; pointer-events:none;}</style><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="15 6 9 12 15 18" /></svg>`,
    cart: `<svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.99998 16.5C3.92045 16.5 4.66665 15.7538 4.66665 14.8333C4.66665 13.9128 3.92045 13.1667 2.99998 13.1667C2.07951 13.1667 1.33331 13.9128 1.33331 14.8333C1.33331 15.7538 2.07951 16.5 2.99998 16.5Z" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.1667 16.5C13.0871 16.5 13.8333 15.7538 13.8333 14.8333C13.8333 13.9128 13.0871 13.1667 12.1667 13.1667C11.2462 13.1667 10.5 13.9128 10.5 14.8333C10.5 15.7538 11.2462 16.5 12.1667 16.5Z" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.1666 13.1667H2.99998V1.5H1.33331" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3.16666L14.6667 3.99999L13.8333 9.83332H3" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  const toggleAccordion = () => {
    dispatch("toggleAccordion", { accordion });
  };

  const logout = () => {
    token = null;
    userDetails = [];
    vscode.postMessage({
      type: "logout",
    });
  };

  const checkout = (event, card) => {
    event.stopPropagation();
    vscode.postMessage({
      type: "goPro",
      selectedCard: card.split(" ")[0],
    });
  };
</script>

{#if token && showLogout}
  <button on:click={logout} class="btn-logout" title="Logout">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      ><path fill="none" d="M0 0h24v24H0z" /><path
        d="M4 18h2v2h12V4H6v2H4V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3zm2-7h7v2H6v3l-5-4 5-4v3z"
        fill="#949A98"
      /></svg
    >
  </button>
{/if}
<div class="accordion">
  <div
    class={`accordion-header ${isActive ? "accordion-header--active" : ""}`}
    on:click={toggleAccordion}
    bind:this={accordion}
  >
    {#if showDropIcon}
      {#if isActive}
        {@html icons.chevronDown}
      {:else}
        {@html icons.chevronRight}
      {/if}
    {/if}
    <h2
      class={`header-text ${showDropIcon ? "ml1" : ""}`}
      style="font-weight:{!isActive ? fontWeight : '700'}"
    >
      {#if icon && Object.keys(icons).includes(icon)}
        <div class="prefix-icon">
          <span>
            Having issues using blox? Send us an email stating your problem or
            just your feedback, and we'll get back to you ASAP.
          </span>{@html icons[icon]}
        </div>
      {/if}
      {headerText}
    </h2>
    {#if showCheckoutButton}
      <button class="add-to-cart" on:click={(e) => checkout(e, headerText)}>
        {@html icons.cart}
      </button>
    {/if}
  </div>

  <div
    class={`accordion-content ${isActive ? "accordion-content--active" : ""} ${
      showActiveBorder ? "accordion-content--active-border" : ""
    }`}
  >
    <slot />
  </div>
</div>

<style>
  .accordion {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-top: 3px;
  }

  .accordion,
  .accordion:focus {
    outline: none;
  }

  .accordion .accordion-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    padding: 3px 4px 5px 3px;
  }

  .accordion-header--active {
    padding: 7px 4px 8px 7px !important;
  }

  .accordion-header--active h2 {
    letter-spacing: 0.5px;
  }

  .header-text {
    display: flex;
    align-items: center;
    font-family: "PJSM";
    text-transform: capitalize;
  }

  .accordion .accordion-header:hover {
    cursor: pointer;
    background-color: var(--vscode-editorWidget-background);
    border-radius: 4px;
  }

  .accordion .accordion-content {
    max-height: 0;
    overflow: hidden;
    padding: 0px 5px;
  }
  .accordion .accordion-content--active {
    max-height: 100%;
  }

  .accordion .accordion-content--active-border {
    border-left: 1px solid var(--vscode-settings-dropdownBorder);
    border-radius: 0;
    width: 95%;
    margin: 0 auto;
  }

  .prefix-icon {
    position: relative;
  }

  .prefix-icon span {
    text-transform: initial;
    position: absolute;
    top: -108px;
    left: 14px;
    background-color: var(--vscode-editorWidget-background);
    padding: 20px;
    width: 387px;
    display: none;
    border-radius: 10px;
    border-bottom-left-radius: 0;
    border: 1px solid var(--vscode-settings-dropdownBorder);
  }

  .prefix-icon:hover span {
    display: block;
  }

  .btn-logout {
    position: absolute;
    width: 20%;
    right: 0;
    background: transparent;
    border-left: 3px solid var(--vscode-input-background);
    z-index: 20;
  }

  .add-to-cart {
    background-color: transparent;
    padding: 5px;
    width: 27px;
    height: 27px;
    display: none;
    justify-content: center;
    align-items: center;
    margin-left: auto;
  }

  .accordion-header:hover .add-to-cart {
    display: flex;
  }

  .ml1 {
    margin-left: 10px;
  }
</style>
