<script>
  import {
    capitalizeFirstLetter,
    componentLocked,
  } from "../../../../utils/utility";

  import Accordion from "../Accordion/Accordion.svelte";
  import ComponentItem from "../ComponentItem/ComponentItem.svelte";
  import Skeleton from "../../../UI/Skeleton.svelte";
  export let vscode;
  export let tabs;
  export let framework;
  export let token = null;
  export let userDetails = [];
  let activeLevelOneAccordion = 0;
  let activeLevelTwoAccordion = 0;
  let activeLevelThreeAccordion = 0;

  const toggleAccordion = (
    event,
    accordionIndex,
    accordionLevel,
    animateToTop = false
  ) => {
    let el = event.detail.accordion;
    var closest = el.closest(".accordion");

    switch (accordionLevel) {
      case 1:
        activeLevelTwoAccordion = 0;
        activeLevelThreeAccordion = 0;

        if (activeLevelOneAccordion === accordionIndex) {
          return (activeLevelOneAccordion = 0);
        }

        return (activeLevelOneAccordion = accordionIndex);
        break;

      case 2:
        if (animateToTop) {
          setTimeout(function () {
            closest.scrollIntoView({
              alignToTop: true,
              behavior: "smooth",
            });
          }, 200);
        }

        activeLevelThreeAccordion = 0;

        if (activeLevelTwoAccordion === accordionIndex) {
          return (activeLevelTwoAccordion = 0);
        }

        return (activeLevelTwoAccordion = accordionIndex);
        break;

      case 3:
        setTimeout(function () {
          closest.scrollIntoView({
            alignToTop: true,
            behavior: "smooth",
          });
        }, 200);

        if (activeLevelThreeAccordion === accordionIndex) {
          return (activeLevelThreeAccordion = 0);
        }

        return (activeLevelThreeAccordion = accordionIndex);

      default:
        break;
    }
  };

  const checkLicense = (license) => {
    return !userDetails.includes(license) && !userDetails.includes("pro");
  };
</script>

{#each tabs as tab, mainIndex (tab.name)}
  <Accordion
    {vscode}
    isActive={activeLevelOneAccordion === mainIndex + 1}
    headerText={tab.name.replace("-", "").trim() + " components"}
    fontWeight="500"
    showActiveBorder
    showCheckoutButton={checkLicense(tab.name.replace("_", ""))}
    on:toggleAccordion={(event) => {
      toggleAccordion(event, mainIndex + 1, 1);
    }}
  >
    {#each tab.children as category, subIndex}
      <Accordion
        isActive={activeLevelOneAccordion === mainIndex + 1 &&
          activeLevelTwoAccordion === subIndex + 1}
        headerText={capitalizeFirstLetter(
          category.name.replace("_", " ").trim()
        )}
        showActiveBorder={category.children[0].children}
        on:toggleAccordion={(event) => {
          toggleAccordion(
            event,
            subIndex + 1,
            2,
            !category.children[0].children
          );
        }}
      >
        <div class="component-section">
          {#if !category.children[0].children}
            {#each category.children as component}
              <ComponentItem {component} {framework} {vscode} {token} />
            {/each}
          {:else}
            {#each category.children as subCategory, subSubIndex}
              <Accordion
                isActive={activeLevelOneAccordion === mainIndex + 1 &&
                  activeLevelTwoAccordion === subIndex + 1 &&
                  activeLevelThreeAccordion === subSubIndex + 1}
                headerText={capitalizeFirstLetter(
                  subCategory.name.replace("_", " ").trim()
                )}
                on:toggleAccordion={(event) => {
                  toggleAccordion(event, subSubIndex + 1, 3, true);
                }}
              >
                <div class="component-section">
                  {#each subCategory.children as component}
                    <ComponentItem {component} {framework} {vscode} {token} />
                  {/each}
                </div>
              </Accordion>
            {/each}
          {/if}
        </div>
      </Accordion>
    {/each}
  </Accordion>
{:else}
  <Skeleton />
{/each}
