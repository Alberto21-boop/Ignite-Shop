<script>
  import Accordion from "../Accordion/Accordion.svelte";

  export let vscode;
  export let token;
  export let userDetails;

  let moreInfoIsActive = false;
  let email = "";
  let subject = "";
  let message = "";

  const submitMessage = (event) => {
    event.preventDefault();
    fetch(
      "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/support/email",
      {
        method: "POST",
        header: new Headers({
          key: "Content-Type",
          value: "application/json",
        }),
        body: JSON.stringify({ email, subject, message }),
      }
    )
      .then((response) => response.json())
      .then((response) => {
        if (response.success) {
          vscode.postMessage({
            type: "onMessage",
            message:
              "Thanks for reaching out to us. We will get back to you soon.",
          });
          return;
        }
        throw new Error("Something went wrong! Please try again later");
      })
      .catch((error) => {
        vscode.postMessage({
          type: "onError",
          message: error.message || JSON.stringify(error),
        });
      });
  };
</script>

<div class="more-info-container">
  <Accordion
    isActive={moreInfoIsActive}
    headerText="Help and feedback"
    fontWeight="500"
    icon="helpIcon"
    showDropIcon={false}
    showLogout
    bind:token
    bind:userDetails
    {vscode}
    on:toggleAccordion={() => {
      moreInfoIsActive = !moreInfoIsActive;
    }}
  >
    <form on:submit={(event) => submitMessage(event)}>
      <input type="email" bind:value={email} placeholder="Email" required />
      <input type="text" bind:value={subject} placeholder="Subject" required />
      <textarea
        type="text"
        bind:value={message}
        placeholder="Message"
        required
      />
      <button type="submit">Submit</button>
    </form>
  </Accordion>
</div>

<style>
  .more-info-container {
    z-index: 99;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--vscode-editorWidget-background);
    padding: 3px 17px;
    min-width: 287px;
    margin: 0;
    border-right: 3px solid var(--vscode-input-background);
  }
</style>
