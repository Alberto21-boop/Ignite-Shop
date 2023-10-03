<div class="skeleton-container ">
  <div class="custom-dropdown">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container">
  <div class="search-input">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container">
  <div class="search-input">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container accordion">
  <div class="content">
    <span class="skeleton-loader" />
  </div>
  <div class="circle">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container accordion">
  <div class="content">
    <span class="skeleton-loader" />
  </div>
  <div class="circle">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container accordion">
  <div class="content">
    <span class="skeleton-loader" />
  </div>
  <div class="circle">
    <span class="skeleton-loader" />
  </div>
</div>
<div class="skeleton-container accordion">
  <div class="content">
    <span class="skeleton-loader" />
  </div>
  <div class="circle">
    <span class="skeleton-loader" />
  </div>
</div>

<style>
  .skeleton-container {
    overflow: hidden;
    width: 100%;
  }
  .skeleton-container > * {
    background-color: var(--vscode-editorWidget-background);
    border-radius: 4px;
  }
  .custom-dropdown {
    margin-bottom: 10px;
  }
  .custom-dropdown,
  .search-input {
    height: 33px;
  }
  .search-input {
    margin-bottom: 20px;
  }
  .accordion {
    height: 8px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
  }
  .accordion .content {
    width: 50%;
  }
  .accordion .circle {
    width: 2%;
    clip-path: circle(50%);
  }
  .skeleton-loader {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 4px;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0),
      var(--vscode-editor-background) 50%,
      rgba(255, 255, 255, 0) 80%
    );
    transform: skewX(-20deg);
    background-repeat: repeat-y;
    background-size: 50px 500px;
    background-position: 0 0;
    animation: shine 1s infinite;
  }
  @keyframes shine {
    to {
      background-position: 100% 0, /* move highlight to right */ 0 0;
    }
  }
</style>
