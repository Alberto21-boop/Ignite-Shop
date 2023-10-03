<script>
  import {
    capitalizeFirstLetter,
    componentLocked,
    passComponentToEditor,
  } from "../../../../utils/utility";
  export let vscode;
  export let component;
  export let framework;
  export let token = null;

  const zoomIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-tabler-zoom-in" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="10" cy="10" r="7" /><line x1="7" y1="10" x2="13" y2="10" /><line x1="10" y1="7" x2="10" y2="13" /><line x1="21" y1="21" x2="15" y2="15" /></svg>`;
  const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-tabler-lock" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round">   <path stroke="none" d="M0 0h24v24H0z" fill="none"/>   <rect x="5" y="11" width="14" height="10" rx="2" />   <circle cx="12" cy="16" r="1" />   <path d="M8 11v-4a4 4 0 0 1 8 0v4" /> </svg>`;

  const tsIcon = `<svg width="30" height="30" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_843:3402)"><path d="M19.2766 0.714287H2.72304C1.61354 0.714287 0.714111 1.61371 0.714111 2.72322V19.2768C0.714111 20.3863 1.61354 21.2857 2.72304 21.2857H19.2766C20.3861 21.2857 21.2855 20.3863 21.2855 19.2768V2.72322C21.2855 1.61371 20.3861 0.714287 19.2766 0.714287Z" fill="#3178C6"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.4506 17.067V19.0759C13.7761 19.2446 14.1738 19.3692 14.6158 19.4536C15.0578 19.5379 15.5399 19.5781 16.022 19.5781C16.5042 19.5781 16.9461 19.5339 17.3881 19.4415C17.8301 19.3491 18.1917 19.1964 18.5131 18.9996C18.8386 18.7866 19.1158 18.5174 19.2765 18.1558C19.4372 17.7942 19.5618 17.3924 19.5618 16.8701C19.5618 16.5045 19.5055 16.1871 19.397 15.9058C19.2886 15.6246 19.1319 15.3835 18.9149 15.1826C18.71 14.9696 18.4729 14.7808 18.1917 14.6201C17.9104 14.4594 17.589 14.2906 17.2274 14.1379C16.9622 14.0295 16.7453 13.925 16.5042 13.8205C16.2953 13.7161 16.1145 13.6116 15.9819 13.5071C15.8332 13.3987 15.7207 13.2862 15.6403 13.1696C15.56 13.0491 15.5198 12.9165 15.5198 12.7679C15.5198 12.6313 15.5556 12.5067 15.6283 12.3942C15.701 12.2817 15.8011 12.1893 15.9296 12.1089C16.0582 12.0286 16.2189 11.9683 16.4118 11.9241C16.6006 11.8799 16.8095 11.8598 17.0546 11.8598C17.2234 11.8598 17.4002 11.8723 17.577 11.8976C17.7618 11.9229 17.9506 11.9619 18.1395 12.0141C18.3283 12.0663 18.5131 12.1306 18.702 12.211C18.8787 12.2913 19.0435 12.3838 19.1841 12.4882V10.5998C18.8787 10.4833 18.5412 10.3949 18.1796 10.3387C17.818 10.2824 17.4162 10.2543 16.9341 10.2543C16.452 10.2543 16.01 10.3065 15.568 10.407C15.1261 10.5074 14.7645 10.6681 14.443 10.8891C14.1176 11.1061 13.8805 11.3713 13.6796 11.7329C13.4908 12.0704 13.3984 12.4561 13.3984 12.9382C13.3984 13.5409 13.5711 14.0632 13.9207 14.465C14.2662 14.907 14.8046 15.2284 15.4877 15.5498C15.7649 15.6623 16.01 15.7748 16.2511 15.8833C16.4921 15.9918 16.693 16.1043 16.8537 16.2208C17.0265 16.3373 17.1631 16.4659 17.2555 16.6025C17.356 16.7391 17.4082 16.8998 17.4082 17.0846C17.4082 17.2132 17.3769 17.3338 17.3158 17.4463C17.2547 17.5588 17.1591 17.6552 17.0305 17.7355C16.902 17.8159 16.7453 17.8802 16.5484 17.9284C16.3595 17.9726 16.1466 17.9967 15.8653 17.9967C15.4234 17.9967 14.9814 17.9204 14.5796 17.7677C14.1377 17.615 13.7359 17.386 13.3743 17.0846L13.4506 17.067ZM10.0756 12.125H12.647V10.4777H5.45508V12.125H8.02651V19.4777H10.0756V12.125Z" fill="white"/></g><defs><clipPath id="clip0_843:3402"><rect width="20.5714" height="20.5714" fill="white" transform="translate(0.714111 0.714287)"/></clipPath></defs></svg>`;
  const htmlIcon = `<svg width="30" height="30" viewBox="0 0 19 22" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_843:3347)"><path d="M1.6317 19.2336L-0.0200195 0.694267H18.1389L16.4872 19.2236L9.04443 21.2857" fill="#E44D26"/><path d="M9.05933 19.7091V2.21585H16.4821L15.0656 18.0323" fill="#F16529"/><path d="M3.35352 4.48322H9.05946V6.75558H5.84611L6.05633 9.08301H9.05946V11.3504H3.97416L3.35352 4.48322ZM4.07427 12.4916H6.35665L6.51681 14.3084L9.05946 14.9892V17.3616L4.3946 16.0603" fill="#EBEBEB"/><path d="M14.7452 4.48322H9.04932V6.75558H14.535L14.7452 4.48322ZM14.3298 9.08301H9.04932V11.3554H11.8522L11.587 14.3085L9.04932 14.9892V17.3516L13.7041 16.0603" fill="white"/></g><defs><clipPath id="clip0_843:3347"><rect width="18.1189" height="20.5714" fill="white" transform="translate(0 0.714287)"/></clipPath></defs></svg>`;
  const vueIcon = `<svg width="30" height="30" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.2129 8.45085e-05L11.5463 4.61879L8.87967 8.45085e-05H-0.000488281L11.5463 19.9999L23.093 8.45085e-05H14.2129Z" fill="#41B883"/><path d="M14.2131 5.43594e-05L11.5465 4.61876L8.87986 5.43594e-05H4.61841L11.5465 11.9997L18.4745 5.43594e-05H14.2131Z" fill="#34495E"/></svg>`;
  const reactIcon = `<svg width="30" height="30" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.7982 10.2874C23.7982 8.7572 21.882 7.30708 18.9441 6.40782C19.6221 3.41342 19.3208 1.03109 17.9931 0.268366C17.687 0.0894551 17.3292 0.0047081 16.9384 0.0047081V1.05463C17.155 1.05463 17.3292 1.097 17.4752 1.17704C18.1155 1.54428 18.3933 2.94261 18.1767 4.74113C18.1249 5.1837 18.0401 5.64981 17.9366 6.12533C17.0138 5.89934 16.0062 5.72514 14.9469 5.61214C14.3113 4.74113 13.6521 3.95016 12.9883 3.25805C14.5231 1.83148 15.9638 1.04992 16.9431 1.04992V0C15.6484 0 13.9535 0.922802 12.2397 2.52358C10.5259 0.932218 8.83096 0.0188328 7.53622 0.0188328V1.06875C8.51081 1.06875 9.95622 1.8456 11.4911 3.26276C10.8319 3.95486 10.1728 4.74113 9.5466 5.61214C8.48256 5.72514 7.47501 5.89934 6.55221 6.13004C6.44392 5.65922 6.36388 5.20253 6.30738 4.76467C6.0861 2.96615 6.35917 1.56782 6.99478 1.19588C7.13602 1.11113 7.31964 1.07346 7.53622 1.07346V0.0235409C7.14073 0.0235409 6.78291 0.108288 6.47217 0.287198C5.14917 1.04992 4.85256 3.42755 5.53524 6.41253C2.60676 7.3165 0.699951 8.76191 0.699951 10.2874C0.699951 11.8175 2.61618 13.2676 5.55407 14.1669C4.8761 17.1613 5.17742 19.5436 6.50513 20.3063C6.81116 20.4853 7.16898 20.57 7.56446 20.57C8.85921 20.57 10.5542 19.6472 12.2679 18.0464C13.9817 19.6378 15.6766 20.5512 16.9714 20.5512C17.3669 20.5512 17.7247 20.4664 18.0354 20.2875C19.3584 19.5248 19.655 17.1472 18.9724 14.1622C21.8914 13.2629 23.7982 11.8128 23.7982 10.2874ZM17.6682 7.147C17.494 7.75436 17.2774 8.38054 17.0326 9.00673C16.8396 8.63008 16.6371 8.25342 16.4158 7.87677C16.1992 7.50012 15.9686 7.13288 15.7379 6.77506C16.4064 6.87393 17.0514 6.99634 17.6682 7.147ZM15.5119 12.1612C15.1446 12.7968 14.768 13.3995 14.3772 13.9597C13.6757 14.0209 12.9647 14.0539 12.2491 14.0539C11.5382 14.0539 10.8272 14.0209 10.1304 13.9644C9.73964 13.4042 9.35828 12.8062 8.99104 12.1753C8.63322 11.5586 8.30836 10.9324 8.01174 10.3015C8.30365 9.67058 8.63322 9.03969 8.98633 8.42292C9.35357 7.78731 9.73022 7.18467 10.121 6.6244C10.8225 6.56319 11.5335 6.53023 12.2491 6.53023C12.96 6.53023 13.671 6.56319 14.3678 6.61969C14.7585 7.17996 15.1399 7.7779 15.5071 8.40879C15.865 9.02556 16.1898 9.65175 16.4864 10.2826C16.1898 10.9135 15.865 11.5444 15.5119 12.1612ZM17.0326 11.5491C17.2868 12.18 17.5034 12.8109 17.6823 13.423C17.0656 13.5737 16.4158 13.7008 15.7426 13.7996C15.9733 13.4371 16.204 13.0652 16.4205 12.6838C16.6371 12.3072 16.8396 11.9258 17.0326 11.5491ZM12.2585 16.5728C11.8207 16.1208 11.3828 15.617 10.9496 15.0661C11.3734 15.085 11.8065 15.0991 12.2444 15.0991C12.687 15.0991 13.1248 15.0897 13.5533 15.0661C13.1295 15.617 12.6917 16.1208 12.2585 16.5728ZM8.75563 13.7996C8.08707 13.7008 7.44205 13.5784 6.82528 13.4277C6.99948 12.8203 7.21606 12.1942 7.46088 11.568C7.65392 11.9446 7.85637 12.3213 8.07765 12.6979C8.29894 13.0746 8.52493 13.4418 8.75563 13.7996ZM12.235 4.00195C12.6728 4.45393 13.1107 4.9577 13.5438 5.50856C13.1201 5.48973 12.687 5.4756 12.2491 5.4756C11.8065 5.4756 11.3687 5.48502 10.9402 5.50856C11.364 4.9577 11.8018 4.45393 12.235 4.00195ZM8.75092 6.77506C8.52022 7.13759 8.28952 7.50953 8.07295 7.89089C7.85637 8.26755 7.65392 8.6442 7.46088 9.02086C7.20664 8.38996 6.99007 7.75907 6.81116 7.147C7.42793 7.00105 8.07766 6.87393 8.75092 6.77506ZM4.49003 12.6697C2.82334 11.9588 1.74516 11.0265 1.74516 10.2874C1.74516 9.54817 2.82334 8.61124 4.49003 7.90502C4.89493 7.73082 5.3375 7.57545 5.79419 7.42949C6.06256 8.3523 6.41567 9.31276 6.85353 10.2968C6.42038 11.2761 6.07197 12.2318 5.80832 13.1499C5.34221 13.004 4.89964 12.8439 4.49003 12.6697ZM7.02302 19.3977C6.38271 19.0304 6.10493 17.6321 6.32151 15.8336C6.3733 15.391 6.45804 14.9249 6.56162 14.4494C7.48443 14.6754 8.49197 14.8496 9.55131 14.9626C10.1869 15.8336 10.8461 16.6246 11.5099 17.3167C9.97505 18.7432 8.53435 19.5248 7.55505 19.5248C7.34318 19.5201 7.16427 19.4777 7.02302 19.3977ZM18.1908 15.81C18.4121 17.6086 18.139 19.0069 17.5034 19.3788C17.3622 19.4636 17.1785 19.5012 16.962 19.5012C15.9874 19.5012 14.542 18.7244 13.0071 17.3072C13.6663 16.6151 14.3254 15.8289 14.9516 14.9579C16.0156 14.8449 17.0232 14.6707 17.946 14.44C18.0543 14.9155 18.139 15.3722 18.1908 15.81ZM20.0035 12.6697C19.5985 12.8439 19.156 12.9993 18.6993 13.1452C18.4309 12.2224 18.0778 11.2619 17.6399 10.2779C18.0731 9.29864 18.4215 8.34288 18.6852 7.42479C19.1513 7.57074 19.5938 7.73082 20.0082 7.90502C21.6749 8.61595 22.753 9.54817 22.753 10.2874C22.7483 11.0265 21.6701 11.9635 20.0035 12.6697Z" fill="#61DAFB"/><path d="M12.2444 12.439C13.4327 12.439 14.396 11.4757 14.396 10.2874C14.396 9.09906 13.4327 8.13574 12.2444 8.13574C11.0561 8.13574 10.0928 9.09906 10.0928 10.2874C10.0928 11.4757 11.0561 12.439 12.2444 12.439Z" fill="#61DAFB"/></svg>`;

  const passLockedComponent = () => {
    componentLocked(vscode);
  };

  const passUnlockedComponent = (path, name = "newComponent", type) => {
    passComponentToEditor(vscode, path, name, type, framework, token);
  };
  const previewComponent = (url) => {
    vscode.postMessage({
      type: "previewModal",
      url,
    });
  };

  const openBrowser = (url) => {
    vscode.postMessage({
      type: "openBrowser",
      url,
    });
  };
</script>

<div class="component-item {component.locked ? 'content-locked' : ''}">
  <div class="component-container">
    <div
      class="backdrop"
      on:click={() => {
        if (component.locked) {
          passLockedComponent();
        }
      }}
    >
      {#if component.locked && component.community}
        <div class="community">
          <h4 class="community__heading">Signup to Get Access</h4>
          <p class="community__paragraph">
            250 free components for Community Users
          </p>
          <button
            class="community__button"
            on:click={(e) => {
              e.stopPropagation();
              openBrowser("https://dashboard.vsblox.com/signup");
            }}
          >
            <span class="community__button-text"> FREE Signup </span>
          </button>
        </div>
      {:else if component.integrations.includes(framework)}
        <div class="buttons">
          <button
            class="btn-preview"
            on:click={(event) => {
              event.stopPropagation();
              previewComponent(
                `https://cdn.tuk.dev/previews/desktop-2x/${component.name}.jpg`
              );
            }}>{@html zoomIcon}</button
          >
          {#if component.locked}
            <button
              class="btn-lock"
              on:click={() => {
                passLockedComponent();
              }}>{@html lockIcon}</button
            >
          {:else if framework === "angular"}
            <div class="import-buttons">
              <button
                class="btn-import"
                on:click={(event) => {
                  event.stopPropagation();
                  passUnlockedComponent(component.path, component.name, "html");
                }}>{@html htmlIcon}<span>Get HTML code</span></button
              >
              <button
                class="btn-import"
                on:click={(event) => {
                  event.stopPropagation();
                  passUnlockedComponent(component.path, component.name, "ts");
                }}>{@html tsIcon}<span>Get TypeScript code</span></button
              >
            </div>
          {:else}
            <button
              class="btn-import"
              on:click={(event) => {
                event.stopPropagation();
                let type = "html";
                if (framework === "react") {
                  type = "js";
                } else if (framework === "vue") {
                  type = "vue";
                }
                passUnlockedComponent(component.path, component.name, type);
              }}
              >{@html framework === "html"
                ? htmlIcon
                : framework === "react"
                ? reactIcon
                : vueIcon}<span
                >Get {framework === "html"
                  ? "HTML"
                  : framework === "react"
                  ? "React"
                  : "Vue"} code</span
              ></button
            >
          {/if}
        </div>
      {:else}
        <p class="not-available">
          This component is not available for {capitalizeFirstLetter(
            framework
          )}.
        </p>
      {/if}
    </div>
    <img
      src={`https://cdn.tuk.dev/previews/blox-components-previews/${component.name}.jpg`}
      alt={component.name
        .replace(/([A-Z])/g, " $1")
        .replaceAll("_", " ")
        .trim()}
      loading="lazy"
    />
  </div>
  <p class="component-title">
    {component.name
      .replace(/([A-Z])/g, " $1")
      .replaceAll("_", " ")
      .trim()}
    {#if component.locked && !component.community}
      <span class="locked">PRO</span>
    {/if}
    {#if component.locked && component.community}
      <span class="community__badge">COMMUNITY</span>
    {/if}
  </p>
</div>
<hr />

<style>
  hr {
    border: none;
    border-bottom: 1px dashed var(--vscode-settings-dropdownBorder);
  }

  .component-item {
    text-align: center;
    margin: 17px 0;
    font-family: "PJSR";
  }

  .component-item:last-child {
    margin-bottom: 10px;
  }

  .component-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;
    text-align: center;
    margin: 5px 0;
    margin-bottom: 1px;
    min-height: 120px;
  }

  .backdrop {
    display: none;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    justify-content: center;
    align-items: flex-end;
    padding-bottom: 20px;
    align-items: start;
  }

  .backdrop button:first-child {
    margin-right: 5px;
  }

  .backdrop .buttons {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
  }

  .component-container:hover .backdrop {
    display: flex;
  }

  .component-container img {
    width: 100%;
    border: 1px solid var(--vscode-editorWidget-background);
  }
  .component-title {
    text-transform: capitalize;
    font-size: 12px;
    margin-top: 8px;
  }

  .component-title .locked,
  .community__badge {
    font-family: sans-serif;
    font-size: 10px;
    margin: 2px 0 2px 12px;
    padding: 1px 9px;
  }

  .component-title .locked {
    background: linear-gradient(92.17deg, #d97706 0%, #facc15 100%);
    border-radius: 100px;
    color: white;
    border: none;
  }

  .community__badge {
    background: linear-gradient(315.34deg, #21bdb8 1.17%, #280684 132.04%);
    border-radius: 100px;
    color: white;
    border: none;
  }

  .community {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .community__heading {
    color: white;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 5px;
    margin-top: 10px;
  }

  .community__paragraph {
    color: #d4d4d8;
    font-size: 13px;
    margin-bottom: 10px;
  }

  .community__button {
    width: 50%;
    background: white;
    border-radius: 3px;
    padding: 9px 0;
    max-width: 300px;
  }

  .community__button-text {
    background: linear-gradient(315.34deg, #21bdb8 1.17%, #280684 132.04%),
      linear-gradient(0deg, #ffffff, #ffffff);
    -webkit-background-clip: text;
    color: transparent;
    font-weight: 700;
  }

  /* .btn-preview,
  .btn-lock {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 54px;
    height: 54px;
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(96px);
    background-color: rgba(var(--vscode-input-background), 0.1);
    border: 0.5px solid rgba(255, 255, 255, 0.26);
    border-radius: 50%;
    outline: none;
  } */

  .btn-preview,
  .btn-lock,
  .btn-import {
    /* color: var(--vscode-foreground); */
    position: relative;
    color: white;
    outline: none;
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(96px);
    background-color: rgba(var(--vscode-input-background), 0.1);
    border: 0.5px solid rgba(255, 255, 255, 0.26);
    border-radius: 4px;
    height: 54px;
    width: 54px;
  }

  .btn-import span {
    display: none;
    position: absolute;
    bottom: -36px;
    left: -99px;
    min-width: 135px;
    background: #3f3f46;
    padding: 6px;
    border-radius: 4px;
  }

  .btn-import span::after {
    display: none;
    content: "";
    position: absolute;
    top: -5px;
    right: 8px;
    border-bottom: 8px solid #3f3f46;
    border-right: 7px solid transparent;
    border-left: 4px solid transparent;
  }

  .btn-import:hover,
  .btn-preview:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .btn-import:hover span,
  .btn-import:hover span::after {
    display: inline-block;
  }

  .not-available {
    color: white;
  }

  @media (max-width: 420px) {
    .component-container .backdrop {
      padding: 1px 0;
      flex-direction: column;
      align-items: center;
    }

    .backdrop .buttons {
      justify-content: center;
    }

    .backdrop .buttons button:not(:last-child) {
      margin-right: 3px;
    }
  }
</style>
