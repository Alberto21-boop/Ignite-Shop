<script>
  export let question = "N/A";
  export let answer = "N/A";
</script>

<div class="faq__box">
  <hr class="faq__upper-border" />
  <h3 class="faq__question">{question}</h3>
  <p class="faq__answer">
    {answer}
  </p>
</div>

<style>
  .faq__upper-border {
    height: 2px;
    width: 100%;
    border-radius: 11px;
    border: none;
    background-color: #374151;
  }
  .faq__question {
    color: #f9fafb;
    font-weight: 700;
    font-size: 20px;
    margin: 20px 0;
  }
  .faq__answer {
    color: #9ca3af;
    font-size: 16px;
    line-height: 1.5;
    font-family: "PJSR";
  }
</style>
