<script>
  import { onDestroy, onMount } from "svelte";
  import { sortComponents, reduceTabs } from "../../../utils/utility";
  import CopyInput from "./CopyInput/CopyInput.svelte";
  import CustomSelect from "../../UI/CustomSelect.svelte";
  import FilteredComponents from "./FilteredComponents/FilteredComponents.svelte";
  import HelpAndFeedback from "./HelpAndFeedback/HelpAndFeedback.svelte";
  import SearchInputFiled from "./SearchInputFiled/SearchInputFiled.svelte";
  import Tabs from "./Tabs/Tabs.svelte";

  export let vscode;
  let search = "";
  let filteredComponents;
  let timer;
  let tabs = [];
  let reducedTabs;
  let searchIsDisabled = true;
  let framework = "html";
  let token = null;
  let userDetails = [];
  const frameworks = {
    html: {
      text: "Tailwind CSS",
      value: "html",
      icon: "tailwind",
    },
    angular: {
      text: "Angular",
      value: "angular",
      icon: "angular",
    },
    react: {
      text: "React",
      value: "react",
      icon: "react",
    },
    vue: {
      text: "Vue",
      value: "vue",
      icon: "vue",
    },
  };

  const resetState = () => {
    searchIsDisabled = true;
    search = "";
    filteredComponents = "";
    tabs = [];
    reducedTabs = "";
  };

  onMount(async () => {
    // vscode.postMessage({
    //   type: "clearCache",
    // });
    vscode.postMessage({
      type: "getDataFromCache",
    });
  });

  const extensionMessageHandler = async (event) => {
    const message = event.data; // The JSON data our extension sent

    switch (message.type) {
      case "updateFramework": {
        framework = message.value;
        break;
      }
      case "gotDataFromCache":
        if (message.framework) {
          framework = message.framework;
        }
        if (message.token) {
          token = message.token;
        }
        if (message.userDetails) {
          userDetails = message.userDetails;
        }

        if (!message.components) {
          if (token) {
            getDataFromApi(token);
          } else {
            getDataFromApi();
          }
          return;
        }

        const componentsData = JSON.parse(message.components);

        tabs = componentsData.tabs;
        reducedTabs = componentsData.reducedTabs;
        searchIsDisabled = false;
        break;

      case "refresh": {
        resetState();
        vscode.postMessage({
          type: "clearCache",
        });

        if (message.userDetails) {
          userDetails = message.userDetails;
        }

        if (message.token || token) {
          vscode.postMessage({
            type: "killSignin",
          });
          if (token) {
            getDataFromApi(token);
            token;
            return;
          }
          token = message.token;
          getDataFromApi(token);
          return;
        } else {
          token = null;
          getDataFromApi();
        }
        break;
      }

      case "cancelSubscription":
        resetState();
        token = null;
        getDataFromApi();
        break;

      default:
        break;
    }
  };

  window.addEventListener("message", extensionMessageHandler);

  const changeFrameworkHandler = (event) => {
    if (event.detail.selectedOption === framework) {
      return;
    }
    vscode.postMessage({
      type: "cacheData",
      key: "framework",
      value: event.detail.selectedOption,
    });
  };

  const getDataFromApi = async (token = null) => {
    vscode.postMessage({
      type: "onMessage",
      message: "Fetching the latest components.",
    });

    try {
      let res;
      const url =
        // "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v2/list";
        // "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v3/list";
        "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v3/list";

      if (!token) {
        res = await fetch(url);
      } else {
        res = await fetch(url, {
          method: "GET",
          headers: new Headers({
            Authorization: token,
            "Content-Type": "application/json",
          }),
        });
      }
      resetState();
      const responseData = await res.json();
      if (!responseData.success) {
        if (res.status === 401 && token) {
          getDataFromApi();
          vscode.postMessage({
            type: "removeToken",
          });
          throw new Error(
            responseData.error.error + ". Fetching free components."
          );
        }
        throw new Error(responseData.error.error);
      }
      tabs = sortComponents(responseData.data.tree);
      // console.log("Sorted Tabs: ", tabs);
      reducedTabs = reduceTabs(tabs);

      vscode.postMessage({
        type: "cacheData",
        key: "components",
        value: JSON.stringify({ tabs, reducedTabs }),
      });
      searchIsDisabled = false;
    } catch (error) {
      resetState();
      vscode.postMessage({
        type: "onError",
        message: error.message || JSON.stringify(error),
      });
    }
  };

  const filterComponents = (event) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = event.detail.value.trim();
      filteredComponents = reducedTabs.filter((component) => {
        return component.name
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase());
      });
      const freeComponents = filteredComponents.filter(
        (component) => !component.locked
      );
      const paidComponents = filteredComponents.filter(
        (component) => component.locked
      );
      filteredComponents = [...freeComponents, ...paidComponents];
    }, 200);
  };

  onDestroy(() => {
    window.removeEventListener("message", extensionMessageHandler);
  });
</script>

<div class="main-section">
  {#if (search && filteredComponents.length > 0) || (!search && tabs.length > 0)}
    <!-- <CustomSelect
      options={frameworks}
      bind:selectedOption={framework}
      on:onChange={changeFrameworkHandler}
    /> -->
    <CustomSelect
      bind:selectedFramework={framework}
      on:onChangeFramework={changeFrameworkHandler}
    />
    <CopyInput {vscode} />
  {/if}

  {#if !searchIsDisabled}
    <SearchInputFiled
      bind:search
      {searchIsDisabled}
      on:filterComponents={filterComponents}
    />
  {/if}

  {#if search.length > 0}
    <FilteredComponents
      {vscode}
      {filteredComponents}
      {search}
      {framework}
      {token}
    />
  {:else}
    <Tabs {vscode} {tabs} {framework} {token} {userDetails} />
  {/if}
</div>

<HelpAndFeedback {vscode} bind:token bind:userDetails />

<style>
  .main-section {
    z-index: 98;
    height: 100vh;
    overflow: auto;
    min-width: 287px;
    padding: 0 var(--container-paddding);
    padding-top: 12px;
    padding-bottom: 13%;
    border-right: 3px solid var(--vscode-input-background);
    margin: 0;
  }
</style>
