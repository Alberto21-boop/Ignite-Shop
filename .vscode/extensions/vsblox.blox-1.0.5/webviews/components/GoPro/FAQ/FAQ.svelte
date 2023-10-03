<script>
  import FAQBox from "./FAQBox/FAQBox.svelte";
</script>

<h2 class="heading-2">Frequently Asked Questions</h2>
<p class="faq__subtitle">Get all your blox related queries answered</p>
<div class="faqs">
  <FAQBox
    question="What is blox?"
    answer="blox is a one-of-a-kind VS code extension that provides developers with
      1500 code blocks (1100 available now) from different UI categories of Web
      Application, Ecommerce and Marketing. blox allows devs to fast track their
      workflow and increase productivity all while maintaining the highest
      development standards with drop-in-ready code blocks."
  />
  <FAQBox
    question="Who is it for?"
    answer="blox is for savvy front-end and back-end devs who are looking to speed up their process of developing UIs or just devs who simply want to save their precious everyday development hours."
  />
  <FAQBox
    question="Who is behind blox?"
    answer="blox is maintained by a team of expert designers, veteran front-end devs, and battle-tested QA specialists, all dedicated towards making the developer experience as seamless as it gets"
  />
  <FAQBox
    question="What Javascript Frameworks are supported?"
    answer="The currently supported Javascript frameworks include React, Angular & Vue. Do keep an eye out because more are on their way"
  />
  <FAQBox
    question="What CSS Frameworks are supported?"
    answer="During early access, all the code blocks will support Tailwind CSS but more frameworks like Bootstrap, Material UI & Svelte will also be added in the future."
  />
  <FAQBox
    question="What are the plans for Bootstrap support?"
    answer="Bootstrap code blocks are already in our roadmap and our team is working hard to bring it on board for Bootstrap developers ASAP."
  />
  <FAQBox
    question="Do the code blocks come with baked-in Integrations & Interactions?"
    answer="Yes, currently all of our code blocks come with Integrations & Interactions supported for React, Angular, and Vue. We're working on Integration & Interaction support for other JS frameworks as well which will be relased soon via weekly updates."
  />
  <FAQBox
    question="What do you mean by `Early Access`?"
    answer="While blox comes pre-loaded with a large number of premium code blocks, the extension is still in its early access program which means that the team of designers and developers are planning on releasing more code blocks with support for many other developer favourite frameworks like MaterialUI, Booststrap, Alpine.js & many more. The main benefit of purchasing the license in Early acces is that all the upcoming updates will be provided free of charge to our early access customers"
  />
  <FAQBox
    question="Where will I get all the updates?"
    answer="Our news and updates are mainly published via email. Furthermore, we keep the blox family in the loop regarding all the happenings through our discord community."
  />
  <FAQBox
    question="Am I authorized to use the code blocks in client projects?"
    answer="Yes, you are authorized to use blox's code to make numerous products for yourself or your customers. You may also sell your finished product."
  />
  <FAQBox
    question="What can't I do?"
    answer="The code blocks cannot be redistributed or sold as stock items. The same goes either with a tool, template, or source files. You can't do all this with a code block individuallly or bundled with other code blocks. You can't make the code block available for purchasing as-is or with abstract tailoring."
  />
  <FAQBox
    question="Does blox offer a trial?"
    answer="Yes, after installing the extension, you have access to 250 free code blocks from different UI categories. Give them a try, and for more, head over to the Pro membership of the extension to access the library of 1500 components (1100 available now)."
  />
  <FAQBox
    question="Does blox Pro have a refund policy?"
    answer="We guarantee you that our product works exactly the way it claims. If you don't agree with us in any case and have a substantial explanation for specific reasons, we're glad to send you a refund through Stripe within seven days of your buy. Send us an email at support@vsblox.com"
  />
  <FAQBox
    question="I want a license for my whole team. What should I do?"
    answer="To get access to blox for your entire team contact our support at support@vsblox.com"
  />
</div>

<style>
  .heading-2 {
    background: linear-gradient(89.99deg, #b7f7d2 3.41%, #78acf8 98.01%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    font-weight: bold;
    font-size: 48px;
    margin-bottom: 30px;
    margin-top: 60px;
  }
  .faq__subtitle {
    color: #9ca3af;
    font-size: 20px;
    line-height: 1.5;
    font-family: "PJSR";
    text-align: center;
    margin-bottom: 60px;
  }
  .faqs {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    grid-gap: 20px;
    align-items: start;
  }
</style>
