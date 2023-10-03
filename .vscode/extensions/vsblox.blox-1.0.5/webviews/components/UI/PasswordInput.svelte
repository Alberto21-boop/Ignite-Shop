<script>
  export let label = "";
  export let value = "";
  export let placeholder = label;
  export let required = false;
  export let styleClasses = "";
  export let prefixIcon = null;
  let passwordType = "password";

  const icons = {
    lock: {
      icon: `<svg class="prefix-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style> .prefix-icon{ position: absolute; top: 43px; left: 16px; pointer-events: none; } </style>
        <path d="M14.375 7.5H13.75V4.375C13.75 3.38044 13.3549 2.42661 12.6517 1.72335C11.9484 1.02009 10.9946 0.625 10 0.625C9.00544 0.625 8.05161 1.02009 7.34835 1.72335C6.64509 2.42661 6.25 3.38044 6.25 4.375V7.5H5.625C4.96218 7.50072 4.32672 7.76435 3.85803 8.23303C3.38935 8.70172 3.12572 9.33718 3.125 10V16.875C3.12572 17.5378 3.38935 18.1733 3.85803 18.642C4.32672 19.1107 4.96218 19.3743 5.625 19.375H14.375C15.0378 19.3743 15.6733 19.1107 16.142 18.642C16.6107 18.1733 16.8743 17.5378 16.875 16.875V10C16.8743 9.33718 16.6107 8.70172 16.142 8.23303C15.6733 7.76435 15.0378 7.50072 14.375 7.5ZM12.5 7.5H7.5V4.375C7.5 3.71196 7.76339 3.07607 8.23223 2.60723C8.70107 2.13839 9.33696 1.875 10 1.875C10.663 1.875 11.2989 2.13839 11.7678 2.60723C12.2366 3.07607 12.5 3.71196 12.5 4.375V7.5Z" fill="#D4D4D8"/>
        </svg>`,
    },
  };

  const togglePassword = () => {
    passwordType = passwordType === "password" ? "text" : "password";
  };
</script>

<div class={`form-control ${styleClasses}`}>
  {#if prefixIcon}
    {@html icons[prefixIcon].icon}
  {/if}
  <label for={label.toLowerCase()}>{label}</label>
  <input
    id={label.toLowerCase()}
    class={prefixIcon ? "prefix-padding" : ""}
    type={passwordType}
    {placeholder}
    name={label.toLowerCase()}
    on:input={(event) => {
      value = event.target.value;
    }}
    {required}
  />
  <i
    class={"togglePasswordContainer " +
      (passwordType === "text" ? "active" : "")}
    on:click={togglePassword}
  >
    {#if passwordType === "text"}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-eye togglePasswordIcon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="#ffffff"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <style>
          .togglePasswordIcon:hover {
            stroke: #d1d5db;
          }
        </style>
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <circle cx="12" cy="12" r="2" />
        <path
          d="M22 12c-2.667 4.667 -6 7 -10 7s-7.333 -2.333 -10 -7c2.667 -4.667 6 -7 10 -7s7.333 2.333 10 7"
        />
      </svg>
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-eye-off togglePasswordIcon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="#ffffff"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <style>
          .togglePasswordIcon:hover {
            stroke: #d1d5db;
          }
        </style>

        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <line x1="3" y1="3" x2="21" y2="21" />
        <path d="M10.584 10.587a2 2 0 0 0 2.828 2.83" />
        <path
          d="M9.363 5.365a9.466 9.466 0 0 1 2.637 -.365c4 0 7.333 2.333 10 7c-.778 1.361 -1.612 2.524 -2.503 3.488m-2.14 1.861c-1.631 1.1 -3.415 1.651 -5.357 1.651c-4 0 -7.333 -2.333 -10 -7c1.369 -2.395 2.913 -4.175 4.632 -5.341"
        />
      </svg>
    {/if}
  </i>
</div>

<style>
  .form-control {
    position: relative;
    width: 100%;
    margin: 0;
  }
  .form-control label {
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
  }

  .form-control input {
    font-family: sans-serif;
    font-size: 16px;
    margin-top: 8px;
    padding: 16px 2px 16px 16px;
    border: none;
    outline: none;
    color: #ffffff;
    background-color: #3f3f46;
    border-radius: 5px;
  }

  .prefix-padding {
    padding-left: 46px !important;
  }

  .form-control input:focus {
    box-shadow: 0 0 0 2pt #525252;
    background-color: #3f3f46;
  }

  .togglePasswordContainer {
    position: absolute;
    right: 17px;
    bottom: 8px;
    cursor: pointer;
  }
</style>
