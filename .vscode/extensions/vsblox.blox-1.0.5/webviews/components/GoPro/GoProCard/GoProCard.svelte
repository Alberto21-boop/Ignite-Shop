<script>
  export let purchased = false;
  export let title = "N/A";
  export let subtitle = "N/A";
  export let salePrice = "N/A";
  export let actualPrice = null;
  export let features = [];
  export let selected = false;
  export let billingType = "monthly";
  export let showBillingType = false;
  export let isAddon = false;

  const toggleSelection = () => {
    selected = !selected;
  };

  const toggleBillingType = (e, type) => {
    e.stopPropagation();
    billingType = type;
  };
</script>

<div
  class={`card ${selected || purchased ? "card--selected" : ""}`}
  on:click={toggleSelection}
>
  {#if showBillingType}
    <div
      class={`billing__tab ${
        selected || purchased ? "billing__tab-active" : ""
      }`}
    >
      <button
        class={`billing__type ${
          billingType === "monthly"
            ? `billing__type--selected ${
                selected || purchased ? "billing__type--selected-active" : ""
              }`
            : ""
        }`}
        on:click={(e) => toggleBillingType(e, "monthly")}>Monthly</button
      >
      <button
        class={`billing__type ${
          billingType === "one-time"
            ? `billing__type--selected ${
                selected || purchased ? "billing__type--selected-active" : ""
              }`
            : ""
        }`}
        on:click={(e) => toggleBillingType(e, "one-time")}>One Time</button
      >
    </div>
  {/if}
  {#if isAddon}
    <div
      class={`card__payment-type ${
        selected || purchased ? "card__payment-type-active" : ""
      }`}
    >
      One time payment
    </div>
  {/if}
  <h3 class="card__title">
    {title}
  </h3>
  <p class="card__subtitle">{subtitle}</p>
  <div class="prices">
    <span class="card__sale-price">${salePrice}</span>
    {#if actualPrice}
      <span class="card__actual-price">${actualPrice}</span>
    {/if}
  </div>
  <div class="features">
    {#each features as feature}
      <div
        class={`feature ${selected || purchased ? "feature__selected" : ""}`}
      >
        <div
          class={`icon-complete ${
            selected || purchased ? "icon-complete-active" : ""
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="6" cy="6" r="6" />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M8.98511 3.96774L5.0168 8.50295L3.01392 6.50007L3.50005 6.01394L4.98331 7.49719L8.46771 3.51501L8.98511 3.96774Z"
            />
          </svg>
        </div>
        {feature}
      </div>
    {/each}
  </div>
  {#if !purchased}
    <button class={`card__button ${selected ? "card__button-selected" : ""}`}>
      {#if selected}
        Selected
      {:else}
        Select License
      {/if}
    </button>
  {:else}
    <span class="card__purchased">Purchased</span>
  {/if}
</div>

<style>
  .card {
    height: 420px;
    width: 350px;
    background: #1f2937;
    padding: 24px 20px;
    border-radius: 10px;
    font-family: "PJSM";
    display: flex;
    flex-direction: column;
  }

  .card--selected {
    background: linear-gradient(315.34deg, #21bdb8 1.17%, #280684 132.04%),
      linear-gradient(0deg, #c4c4c4, #c4c4c4);
  }

  .card__title {
    font-size: 24px;
    color: #f9fafb;
    margin-bottom: 10px;
    font-family: "PJSB";
    display: flex;
    justify-content: space-between;
  }
  /* #111827 */
  .billing__tab {
    display: flex;
    padding: 3px;
    border: 1px solid #374151;
    height: 35px;
    width: 165px;
    border-radius: 5px;
    margin-bottom: 20px;
  }

  .billing__tab-active {
    border: 1px solid #f9fafb;
  }

  .billing__type {
    background-color: transparent;
    border-radius: 5px;
    font-family: "PJSR";
    padding: 2px 8px;
  }

  .billing__type--selected {
    /* background-color: #2563eb; */
    /* background-color: #0d3562; */
    background-color: #374151;
  }

  .billing__type--selected-active {
    /* background-color: #0d3562; */
    color: #111827;
    background-color: #f9fafb;
  }

  .card__purchased {
    width: 100%;
    display: inline-block;
    margin-top: 50px;
    margin-bottom: 10px;
    padding: 16px 0;
    border: none;
    outline: none;
    border-radius: 4px;
    text-transform: uppercase;
    color: #f9fafb;
    text-align: center;
    font-style: italic;
  }

  .card__subtitle {
    color: #d2d5da;
    font-size: 14px;
    margin-bottom: 10px;
  }

  .prices {
    display: flex;
    align-items: center;
    color: #f9fafb;
  }

  .prices > * {
    line-height: 1.5;
    margin-top: 0;
    margin-bottom: 15px;
  }

  .card__sale-price {
    font-size: 24px;
    margin-right: 10px;
  }

  .card__actual-price {
    font-size: 20px;
    text-decoration: line-through;
  }

  .features {
    font-size: 14px;
  }

  .feature {
    display: flex;
    align-items: center;
    margin-bottom: 7px;
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    color: #9ca3af;
  }
  .feature__selected {
    color: #e5e7eb;
  }

  .card__button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-top: auto;
    margin-bottom: 10px;
    padding: 16px 0;
    border: none;
    outline: none;
    border-radius: 4px;
    text-transform: uppercase;
    color: #f9fafb;
    background-color: transparent;
    border: 1px solid #f9fafb;
    font-family: "PJSB";
    letter-spacing: 1px;
  }

  .card__button:hover {
    background-color: #f9fafb;
    color: #1f2937;
  }

  .card__button-selected {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
  }
  .icon-complete {
    margin-right: 12px;
  }

  .icon-complete svg circle {
    fill: #4b5563;
  }
  .icon-complete svg path {
    fill: #f9fafb;
  }
  .icon-complete-active svg circle {
    fill: #f9fafb;
  }
  .icon-complete-active svg path {
    fill: #111827;
  }
  .card__payment-type {
    font-size: 13px;
    font-family: PJSR;
    text-align: center;
    border: 1px solid #374151;
    width: 50%;
    padding: 4px 0;
    border-radius: 4px;
    margin-bottom: 20px;
    height: 35px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #9ca3af;
  }
  .card__payment-type-active {
    color: #e5e7eb;
    border: 1px solid #e5e7eb;
  }
</style>
