<script>
  const vscode = acquireVsCodeApi();
  import { onDestroy, onMount } from "svelte";
  import FAQ from "./FAQ/FAQ.svelte";
  import GoProCard from "./GoProCard/GoProCard.svelte";

  let purchasedLicenses = [];
  let loading = true;
  let ecommerceLicense = false;
  let webappLicense = false;
  let marketingLicense = false;
  let devEssentialsLicense = false;
  let idToken = null;
  // let refreshToken = null;
  let email = null;
  let billingType = "monthly";
  let selectedCard = null;

  onMount(async () => {
    vscode.postMessage({
      type: "getPurchasedLicenses",
    });
    vscode.postMessage({
      type: "getSelectedCard",
    });
  });

  const extensionMessageHandler = async (event) => {
    const message = event.data; // The JSON data our extension sent

    switch (message.type) {
      case "gotPurchasedLicenses": {
        if (message.userDetails) {
          purchasedLicenses = message.userDetails;
        }
        if (message.idToken) {
          idToken = message.idToken;
        }
        if (message.email) {
          email = message.email;
        }
        loading = false;
        break;
      }
      case "gotSelectedCard": {
        if (message.selectedCard) {
          selectedCard = message.selectedCard;
          if (selectedCard === "DevEssentials") {
            devEssentialsLicense = true;
          } else if (selectedCard === "marketing") {
            marketingLicense = true;
          } else if (selectedCard === "Ecommerce") {
            ecommerceLicense = true;
          } else if (selectedCard === "webapp") {
            webappLicense = true;
          }
        }
        break;
      }
      default:
        break;
    }
  };

  const hasPurchased = (license) => {
    return purchasedLicenses.includes(license);
  };

  $: getTotalPrice = () => {
    let totalPrice = 0;
    if (ecommerceLicense) {
      totalPrice += 59;
    }
    if (webappLicense) {
      totalPrice += 159;
    }
    if (marketingLicense) {
      totalPrice += 79;
    }
    if (devEssentialsLicense) {
      if (billingType === "monthly") {
        totalPrice += 9;
      } else {
        totalPrice += 149;
      }
    }
    return totalPrice;
  };

  const checkout = () => {
    let products = [];
    let type = "LIFETIME";
    if (ecommerceLicense) {
      products.push("ECOMMERCE_LIFETIME");
    }
    if (webappLicense) {
      products.push("WEBAPP_LIFETIME");
    }
    if (marketingLicense) {
      products.push("MARKETING_LIFETIME");
    }
    if (devEssentialsLicense) {
      if (billingType === "monthly") {
        products.push("DEVESSENTIALS_MONTHLY");
        type = "MONTHLY";
      } else {
        products.push("DEVESSENTIALS_LIFETIME");
      }
    }

    fetch(
      "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/stripe/session/createV2",
      {
        method: "POST",
        body: JSON.stringify({
          product: products,
          type,
          idToken,
          email,
        }),
      }
    )
      .then((res) => res.json())
      .then((res) => {
        vscode.postMessage({
          type: "openBrowser",
          url: res.data.url,
        });
      })
      .catch((error) => console.log(error));
  };

  window.addEventListener("message", extensionMessageHandler);

  onDestroy(() => {
    window.removeEventListener("message", extensionMessageHandler);
  });
</script>

{#if !loading}
  <div class="container">
    <h2 class="heading-2">Choose what best works for you</h2>
    <div class="cards">
      <GoProCard
        purchased={hasPurchased("DevEssentials") || hasPurchased("pro")}
        title="Starter"
        subtitle="Dev Essentials, grids, carts, navs and more"
        salePrice={billingType === "monthly" ? 9 : 149}
        features={[
          "200+ components",
          "React, Angular & Vue support",
          "Premium Support",
          "Lifetime access",
        ]}
        showBillingType
        bind:billingType
        bind:selected={devEssentialsLicense}
      />
      <GoProCard
        isAddon
        purchased={hasPurchased("E-commerce") || hasPurchased("pro")}
        title="Ecommerce UI Kit"
        subtitle="Product grids, carts, navs and more"
        salePrice={59}
        features={[
          "200+ components",
          "React, Angular & Vue (Coming Soon)",
          "Premium Support",
          "Lifetime access",
        ]}
        bind:selected={ecommerceLicense}
      />
      <GoProCard
        isAddon
        purchased={hasPurchased("webapp") || hasPurchased("pro")}
        title="Web App UI Kit"
        subtitle="Dashboards and UI components"
        salePrice={159}
        features={[
          "550+ Web App components",
          "React, Angular & Vue support",
          "Premium Support",
          "Lifetime access",
        ]}
        bind:selected={webappLicense}
      />
      <GoProCard
        isAddon
        purchased={hasPurchased("marketing") || hasPurchased("pro")}
        title="Marketing UI Kit"
        subtitle="Website components that convert"
        salePrice={79}
        features={[
          "200+ components",
          "React, Angular & Vue support",
          "Premium Support",
          "Lifetime access",
        ]}
        bind:selected={marketingLicense}
      />
    </div>
    <!-- <button
      class={`checkout__btn ${
        getTotalPrice() === 0 ? "checkout__btn--disabled" : ""
      }`}
      on:click={checkout}
      disabled={getTotalPrice() === 0}
    >
      Proceed to Checkout
      <span class="checkout__price">${getTotalPrice()}</span>
    </button> -->
    <FAQ />
  </div>
  <div class="sticky">
    <button
      class={`checkout__btn no-margin ${
        getTotalPrice() === 0 ? "checkout__btn--disabled" : ""
      }`}
      on:click={checkout}
      disabled={getTotalPrice() === 0}
    >
      Proceed to Checkout
      <span class="checkout__price">${getTotalPrice()}</span>
    </button>
  </div>
{/if}

<style>
  .container {
    font-family: sans-serif;
    background-color: #111827;
    padding: 97px 50px;
    color: #f9fafb;
  }

  .sticky {
    width: 100vw;
    position: fixed;
    bottom: 0;
    background: #111827;
    box-shadow: 0px -1px 44px rgba(37, 98, 158, 0.29);
    margin: 0;
  }

  .no-margin {
    margin-left: auto !important;
    margin: 15px 50px 15px auto !important;
  }

  .heading-2 {
    background: linear-gradient(89.99deg, #b7f7d2 3.41%, #78acf8 98.01%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    font-weight: bold;
    font-size: 48px;
    margin-bottom: 60px;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    grid-gap: 20px;
    justify-items: center;
  }

  .checkout__btn {
    text-transform: uppercase;
    background: linear-gradient(315.34deg, #21bdb8 1.17%, #280684 132.04%),
      linear-gradient(0deg, #c4c4c4, #c4c4c4);
    font-size: 14px;
    padding: 16px 18px;
    border-radius: 4px;
    width: 300px;
    margin: 60px auto;
    display: flex;
  }
  .checkout__btn--disabled {
    background: none;
    background-color: #374151;
    cursor: not-allowed;
  }
  .checkout__price {
    margin-left: auto;
  }
</style>
