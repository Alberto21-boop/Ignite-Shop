<script>
  const vscode = acquireVsCodeApi();
  import Logo from "../UI/Logo.svelte";
  import Spinner from "../UI/Spinner.svelte";
  import Button from "../UI/Button.svelte";
  import Input from "../UI/Input.svelte";
  import PasswordInput from "../UI/PasswordInput.svelte";
  import { onDestroy } from "svelte";

  let email;
  let password;
  let remember = false;
  let isLoading = false;
  const checkedSVG = `<svg class="checkedSVG" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <style> .checkedSVG{ margin-right: 9px; } </style>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 6C0 2.6915 2.6915 0 6 0C9.3085 0 12 2.6915 12 6C12 9.3085 9.3085 12 6 12C2.6915 12 0 9.3085 0 6ZM5.791 7.9785L9.041 4.7285C9.2365 4.533 9.2365 4.217 9.041 4.0215C8.8455 3.826 8.5295 3.826 8.334 4.0215L5.4375 6.918L4.166 5.6465C3.9705 5.451 3.6545 5.451 3.459 5.6465C3.2635 5.842 3.2635 6.158 3.459 6.3535L5.084 7.9785C5.1815 8.076 5.3095 8.125 5.4375 8.125C5.5655 8.125 5.6935 8.076 5.791 7.9785Z" fill="#F9FAFB"/>
    </svg>`;

  const extensionMessageHandler = async (event) => {
    const message = event.data; // The JSON data our extension sent

    switch (message.type) {
      case "loginFailed": {
        isLoading = false;
        break;
      }
      default:
        break;
    }
  };

  window.addEventListener("message", extensionMessageHandler);

  const submitForm = (event) => {
    isLoading = true;
    event.preventDefault();

    vscode.postMessage({
      type: "login",
      payload: {
        email,
        password,
      },
    });
  };

  const openBrowser = (url) => {
    vscode.postMessage({
      type: "openBrowser",
      url: url,
    });
  };

  onDestroy(() => {
    window.removeEventListener("message", extensionMessageHandler);
  });
</script>

{#if isLoading}
  <div class="loaderContainer">
    <Spinner />
  </div>
{/if}
<div class="section">
  <div class="sign-in-section flex-1">
    <div class="signInBox">
      <div class="logo">
        <Logo />
      </div>
      <h2 class="header-secondary mb-3">
        Already a Pro member?
        <span class="header-secondary--link">Login here</span>
      </h2>
      <!-- <button
        class="github-button mb-2"
        on:click={() =>
          openBrowser(
            "https://blox-marketing-website.vercel.app/login/github?attempt=login"
          )}
        ><svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          class="git-icon"
        >
          <style>
            .git-icon {
              margin-right: 15px;
            }
          </style>
          <rect width="24" height="24" fill="url(#pattern0)" />
          <defs>
            <pattern
              id="pattern0"
              patternContentUnits="objectBoundingBox"
              width="1"
              height="1"
            >
              <use xlink:href="#image0" transform="scale(0.00833333)" />
            </pattern>
            <image
              id="image0"
              width="120"
              height="120"
              xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NDkxMSwgMjAxMy8xMC8yOS0xMTo0NzoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RERCMUIwQTM4NkNFMTFFM0FBNTJFRTMzNTJEMUJDNDYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RERCMUIwQTI4NkNFMTFFM0FBNTJFRTMzNTJEMUJDNDYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU1MTc4QTMyOTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjJBNDE0QUJDOTlBMTExRTI5QTE1QkMxMDQ2QTg5MDREIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+8kSqyAAADD5JREFUeNrsXQ2Q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"
            />
          </defs>
        </svg>
        Continue with GitHub</button
      >
      <div class="divider mb-3">
        <hr class="flex-1" />
        <span>or</span>
        <hr class="flex-1" />
      </div> -->

      <form on:submit={submitForm}>
        <Input
          prefixIcon="mail"
          styleClasses="mb-2"
          label="Email"
          type="email"
          bind:value={email}
          required
        />
        <PasswordInput
          prefixIcon="lock"
          styleClasses="mb-2"
          label="Password"
          bind:value={password}
          required
        />

        <div class="rememberBox mb-2">
          <Input
            styleClasses="flex-1"
            label="Remember"
            type="checkbox"
            bind:value={remember}
          />
          <p
            class="link forgot-link"
            on:click={() => openBrowser("https://app.tailwinduikit.com/login")}
          >
            Forgot Password?
          </p>
        </div>

        <Button
          styleClasses="button primary-button mb-3"
          type="submit"
          text="Login"
        />
      </form>
    </div>
  </div>
  <div class="pro-features-section flex-1">
    <div class="features-container">
      <h1 class="header-primary mb-5">
        Go pro and get access to 1000+ code blocks
      </h1>
      <p class="feature mb-2">
        {@html checkedSVG}500+ Web Application components
      </p>
      <p class="feature mb-2">{@html checkedSVG}250+ Marketing components</p>
      <p class="feature mb-2">{@html checkedSVG}200+ Ecommerce components</p>
      <p class="feature mb-2">
        {@html checkedSVG}React, Angular, & Vue support
      </p>
      <p class="feature mb-2">{@html checkedSVG}Premium support</p>
      <p class="feature mb-2">{@html checkedSVG}Lifetime access</p>
      <p class="feature mb-5">{@html checkedSVG}Use on Unlimited Projects</p>
      <Button
        styleClasses="button pro-button"
        text="Go pro"
        on:click={() => openBrowser("https://www.vsblox.com/pricing")}
      />
    </div>
  </div>
</div>

<style>
  .section {
    background-color: #1e2324;
  }
  .logo {
    position: absolute;
    top: -25%;
  }
  .section {
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    min-width: 1145px;
  }
  .sign-in-section {
    position: relative;
  }
  .loaderContainer {
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    background-color: rgba(0, 0, 0, 0.3);
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  p {
    font-size: 14px;
    color: #ffffff;
  }

  .signInBox {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    min-width: 575px;
    max-width: 710px;
    width: 79%;
    margin: 0 auto;
    margin-top: 50px;
    padding: 0 5%;
  }
  .header-secondary {
    font-weight: 500;
    font-size: 24px;
    color: #a1a1aa;
  }
  .header-secondary--link {
    color: white;
  }
  /* .github-button {
    font-size: 20px;
    font-weight: 400;
    border: 1px solid #52525b;
    display: flex;
    padding: 15px;
    border-radius: 12px;
    text-align: start;
    align-items: center;
    background-color: transparent;
    outline: none;
  }
  .divider {
    width: 100%;
    display: flex;
    align-items: center;
  }
  .divider hr {
    border: none;
    border-bottom: 1px solid #3f3f46;
  }
  .divider span {
    font-size: 20px;
    color: #a1a1aa;
    margin: 0 13px;
  } */
  form {
    width: 100%;
  }

  .rememberBox {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .link {
    text-decoration: underline;
    cursor: pointer;
  }

  .forgot-link {
    color: #5895df;
  }

  .rememberBox {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pro-features-section {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    background: linear-gradient(to bottom right, #280684, #21bdb8);
  }

  .features-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    max-width: 557px;
    text-align: start;
    padding: 0 5%;
  }

  .header-primary {
    font-size: 36px;
    font-weight: 700;
    color: white;
  }

  .feature {
    font-size: 16px;
    font-weight: 400;
  }

  :global(.mb-1) {
    margin-bottom: 16px !important;
  }

  :global(.mb-2) {
    margin-bottom: 24px !important;
  }
  :global(.mb-3) {
    margin-bottom: 36px !important;
  }

  :global(.mb-5) {
    margin-bottom: 52px !important;
  }

  :global(.mb-14) {
    margin-bottom: 52px !important;
  }

  :global(.flex-1) {
    flex: 1;
  }
</style>
