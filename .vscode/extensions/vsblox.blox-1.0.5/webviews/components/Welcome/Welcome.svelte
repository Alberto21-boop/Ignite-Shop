<script>
  import Logo from "../UI/Logo.svelte";
  const vscode = acquireVsCodeApi();
  let email = "";

  const openBrowser = (url) => {
    vscode.postMessage({
      type: "openBrowser",
      url: url,
    });
  };

  const subscribe = (event) => {
    event.preventDefault();
    fetch(
      "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/newsletter/subscribe",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    )
      .then((response) => response.json())
      .then((response) => {
        if (response.success) {
          vscode.postMessage({
            type: "onMessage",
            message: "Subscribed successfully!",
          });
          email = "";
        } else {
          vscode.postMessage({
            type: "onError",
            message: "Something went wrong. Please try again later.",
          });
        }
      })
      .catch((error) => {
        vscode.postMessage({
          type: "onError",
          message: erorr.message || JSON.stringify(error),
        });
      });
  };
</script>

<div class="app">
  <div class="top-bar">
    <div class="logo">
      <Logo />
      <h2>- Component library</h2>
    </div>
    <div class="social-links">Social Links</div>
  </div>
  <hr />
  <div class="data-container">
    <div class="sidebar">
      <div class="navbar">
        <a href="#welcome">Welcome</a>
        <a href="#overview">Overview</a>
        <a href="#new">What's New</a>
        <a href="#about">About blox</a>
        <a href="#resources">Resources</a>
      </div>
    </div>
    <div class="main">
      <div id="welcome">
        <h2>Welcome</h2>
        <p>
          Thanks for installing blox. We’re glad to have you on board. Currently
          you have access to 250 free codeblocks from Web Application, Marketing
          and Ecommerce UI Kits. Get access to all the premium 1000+ code
          snippets with the Pro version.
        </p>
        <div class="welcome-buttons">
          <button
            class="btn btn-primary"
            on:click={() =>
              openBrowser("https://blox-marketing-website.vercel.app/")}
            >Visit Home Page</button
          >
          <button class="btn btn-secondary" on:click={() => openBrowser("")}
            >Join Community</button
          >
        </div>
      </div>
      <div id="overview">
        <h2>Overview</h2>
        <p>
          Watch the following video to understand the working of blox and what
          it offers
        </p>
        <div class="video-box">
          <img
            src="https://cdn.tuk.dev/blox/blox-youtube.png"
            alt="blox Introduction"
            on:click={() =>
              openBrowser("https://www.youtube.com/watch?v=FU9aoR8ZBqI")}
          />
          <button
            class="btn btn-primary btn--large"
            on:click={() => openBrowser("https://www.vsblox.com/pricing")}
            >Go pro</button
          >
        </div>
      </div>
      <div id="new">
        <h2>What's New</h2>
        <p>
          The team behind blox is working very hard to add new code snippets and
          improve the over all developer experience. Follow all the new
          additions and improvements to blox here
        </p>
        <p>Follow all the new updates with our newsletter</p>

        <div class="new-content">
          <div class="update">
            <ul>
              <li>Enhanced 40+ components from Marketing UI Kit</li>
              <li>Added 10+ components in Ecommerce Category</li>
            </ul>
          </div>
          <div class="update">
            <ul>
              <li>Preview added to Code Blocks</li>
              <li>Preview Button Added</li>
              <li>Performance Enhacement</li>
            </ul>
          </div>
          <div class="update">
            <ul>
              <li>VS Code native theme Support</li>
              <li>Fixed minor bugs</li>
              <li>UI Improvements</li>
              <li>Performance Enhancement</li>
            </ul>
          </div>
          <div class="update">
            <ul>
              <li>10 FREE code blocks added</li>
              <li>25 Pro code blocks added</li>
              <li>Support for Angular</li>
            </ul>
          </div>
        </div>

        <form on:submit={(event) => subscribe(event)}>
          <input
            type="email"
            placeholder="Enter your email"
            bind:value={email}
            required
          />
          <button class="btn btn-tertiary"><span>Get notified</span></button>
        </form>
      </div>
      <div id="license">
        <h2>License</h2>
        <p>
          You only get 250 code blocks with the free version.You can Go Pro to
          take advantage of blox’s full potential with 1000+ code blocks from
          WebApplication, Ecommerce and Marekting UI Kits. With the Pro version
          you get:
        </p>
        <ul>
          <li>550+ Web App code blocks</li>
          <li>250+ Marketing code blocks</li>
          <li>200+ Ecommerce code blocks</li>
          <li>Free Bootstrap & MaterialUI update</li>
          <li>React, Angular, & Vue support</li>
          <li>Premium support</li>
          <li>Lifetime access</li>
          <li>Use on Unlimited Projects</li>
        </ul>
        <button
          class="btn btn-primary"
          on:click={() => openBrowser("https://www.vsblox.com/pricing")}
          >Go pro</button
        >
      </div>
      <div id="about">
        <h2>About blox</h2>
        <p>
          We are dedicated to providing you with the best of our product and
          ensuring that you don’t delve into complex things. To make things
          smoother for all the developers out there.
        </p>
        <h3>Usage of the extension:</h3>
        <p>
          Publisher and extension IDs are used to define an extension uniquely.
          If you select the Blox extension, you will automatically see the
          extension’s detail page, where you can find the extension ID.
        </p>
        <p>
          Knowing the extension ID can be very beneficial for you if there are
          multiple extensions with a similar name. Click the install button, and
          your extension will be downloaded and installed from the Marketplace
          by VS Code. The install is changed with a Manage gear button when the
          installation is completed.
        </p>
        <h3>Perks of Blox extension:</h3>
        <p>
          Besides, out of 1500 components, blox provides 250 free code blocks,
          and you can even search for the desired code block by using the
          navigation bar.
        </p>
        <p>
          Moreover, the Blox extension also contributes numerous commands (name
          of the commands if there are any)that you can find in the Commands
          option. These commands let you quickly access the (function that the
          commands provide).
        </p>
      </div>
      <div id="resources">
        <h2>Resources</h2>
        <ul>
          <li>
            <button
              class="btn-link"
              on:click={() =>
                openBrowser("https://blox-marketing-website.vercel.app/")}
              >Website</button
            >
          </li>
          <li>
            <button
              class="btn-link"
              on:click={() =>
                openBrowser(
                  "https://blox-marketing-website.vercel.app/documentation"
                )}>Documentation</button
            >
          </li>
          <li>
            <button
              class="btn-link"
              on:click={() => openBrowser("https://www.vsblox.com/pricing")}
              >Pricing</button
            >
          </li>
          <li>
            <button
              class="btn-link"
              on:click={() =>
                openBrowser(
                  "https://blox-marketing-website.vercel.app/updates"
                )}>Changelog</button
            >
          </li>
          <li>
            <button
              class="btn-link"
              on:click={() =>
                openBrowser("https://blox-marketing-website.vercel.app/faq")}
              >FAQ</button
            >
          </li>
          <li>
            <button
              class="btn-link"
              on:click={() =>
                openBrowser("https://blox-marketing-website.vercel.app/blog")}
              >Blog</button
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  img {
    width: 100%;
    margin-bottom: 20px;
    cursor: pointer;
    border-radius: 8px;
  }
  h2 {
    font-size: 26px;
    font-weight: 400;
    color: white;
    line-height: 26px;
    margin-bottom: 20px;
  }

  h3 {
    font-size: 20px;
    margin-bottom: 10px;
    color: white;
    font-weight: 500;
  }

  ul li,
  p {
    font-size: 14px;
    color: white;
  }

  ul,
  p {
    margin-bottom: 20px;
  }

  button:not(:last-child) {
    margin-right: 12px;
  }

  form {
    display: flex;
    max-width: 500px;
    padding: 2px 4px;
    background-color: #27272a;
    border-radius: 4px;
    border: 1px solid #3f3f46;
  }

  form input {
    background: transparent;
    outline: none;
  }

  form button span {
    pointer-events: none;
    font-weight: 600;
    background: linear-gradient(90.53deg, #10c66d -38.49%, #0261cf 131.7%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .video-box {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  #new .new-content {
    margin: 32px 0;
  }

  #new .new-content .update {
    position: relative;
    border-left: 2px solid white;
    padding-left: 16px;
    padding-top: 20px;
  }

  #new .new-content .update:not(:last-child) {
    padding-bottom: 30px;
  }

  #new .new-content .update ul {
    margin: 0;
  }

  #new .new-content .update::before {
    content: "";
    position: absolute;
    width: 20px;
    height: 1px;
    background-color: white;
    top: 0;
    left: 0;
  }

  #new .new-content .update::after {
    position: absolute;
    top: -13px;
    left: 30px;
  }

  #new .new-content .update:nth-child(1):after {
    content: "26-11-2021";
  }

  #new .new-content .update:nth-child(2):after {
    content: "26-10-2021";
  }

  #new .new-content .update:nth-child(3):after {
    content: "24-10-2021";
  }

  #new .new-content .update:nth-child(4):after {
    content: "18-10-2021";
  }

  .main > div {
    margin-bottom: 48px;
  }

  .welcome-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-top: 15px;
  }

  .btn {
    max-width: 180px;
    height: 32px;
    border-radius: 4px;
    font-size: 14px;
    color: white;
    outline: none;
  }

  .btn-primary {
    background: linear-gradient(90.53deg, #10c66d -38.49%, #0261cf 131.7%);
  }

  .btn-secondary {
    background-color: transparent;
    border: 1px solid white;
  }

  .btn-tertiary {
    background-color: white;
    max-width: 119px;
  }

  .btn-link {
    text-align: start;
    border: none;
    background: none;
    outline: none;
    color: #067daa;
  }

  .btn--large {
    font-size: 20px;
    max-width: 260px;
    height: 49px;
  }

  .logo {
    display: flex;
    align-items: center;
  }
  .logo h2 {
    display: inline-block;
    margin: 0;
    margin-left: 11px;
    color: white;
    font-size: 33px;
    font-weight: 300;
  }
  hr {
    border: none;
    border-bottom: 3px solid var(--vscode-input-background);
    padding-bottom: 15px;
  }
  .app {
    margin: 30px 0;
    width: 100%;
    height: 100%;
    padding: 0 10%;
    background-color: #1e2324;
  }
  .top-bar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .data-container {
    width: 100%;
    display: flex;
    align-items: flex-start;
    margin-top: 30px;
  }
  .sidebar {
    flex: 1;
  }
  .sidebar .navbar a {
    display: block;
    text-decoration: none;
    color: var(--vscode-editorWidget-foreground);
    font-weight: 500;
    font-size: 15px;
    padding: 7px 0;
    transition: all 0.2s;
    border: none;
    outline: none;
  }

  .sidebar .navbar a:hover {
    padding-left: 6px;
    border-left: 3px solid var(--vscode-inputOption-activeForeground);
    color: var(--vscode-inputOption-activeForeground);
  }

  .main {
    flex: 5;
  }
</style>
