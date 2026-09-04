/* =========================================
   MOBILE MENU
========================================= */

const menuBtn =
  document.getElementById("menuBtn");

const nav =
  document.querySelector(".nav");


menuBtn.addEventListener(
  "click",
  function () {

    nav.classList.toggle(
      "open"
    );

  }
);


/* Close menu after clicking a nav link */

document
  .querySelectorAll(
    ".nav a"
  )
  .forEach(
    function (link) {

      link.addEventListener(
        "click",
        function () {

          nav.classList.remove(
            "open"
          );

        }
      );

    }
  );


/* =========================================
   TOOLBOX
========================================= */

const toolCards =
  document.querySelectorAll(
    ".tool-card"
  );

const toolOutput =
  document.getElementById(
    "toolOutput"
  );


const toolDescriptions = {

  "Web Search":
    "> WEB SEARCH TOOL CONNECTED\n> Agent can retrieve current public information and analyze results.",

  "Email":
    "> EMAIL TOOL CONNECTED\n> Agent can inspect approved messages, organize information and prepare drafts.",

  "Calendar":
    "> CALENDAR TOOL CONNECTED\n> Agent can inspect schedules, availability and upcoming events.",

  "Files":
    "> FILE TOOL CONNECTED\n> Agent can read approved files, extract information and summarize documents.",

  "Database":
    "> DATABASE TOOL CONNECTED\n> Agent can retrieve structured records and use them in its reasoning process.",

  "Code":
    "> CODE TOOL CONNECTED\n> Agent can run calculations, process information and use programmatic functions."

};


toolCards.forEach(
  function (card) {

    card.addEventListener(
      "click",
      function () {

        toolCards.forEach(
          function (item) {

            item.classList.remove(
              "selected"
            );

          }
        );

        card.classList.add(
          "selected"
        );

        const selectedTool =
          card.dataset.tool;

        toolOutput.textContent =
          toolDescriptions[
            selectedTool
          ];

      }
    );

  }
);


/* =========================================
   AGENT BUILDER
========================================= */

const createAgentBtn =
  document.getElementById(
    "createAgentBtn"
  );

const terminalContent =
  document.getElementById(
    "terminalContent"
  );

const goalSelect =
  document.getElementById(
    "goalSelect"
  );

const instructionInput =
  document.getElementById(
    "instructionInput"
  );


createAgentBtn.addEventListener(
  "click",
  function () {

    const goal =
      goalSelect.value;

    let instructions =
      instructionInput.value.trim();


    if (
      instructions === ""
    ) {

      instructions =
        "Complete the selected goal efficiently and explain the result.";

    }


    const checkedTools =
      document.querySelectorAll(
        ".tool-options input:checked"
      );


    const tools =
      Array.from(
        checkedTools
      ).map(
        function (checkbox) {

          return checkbox.value;

        }
      );


    terminalContent.innerHTML =
      "";


    const lines = [

      {
        text:
          "> AGENT INITIALIZED",
        className:
          "terminal-line success"
      },

      {
        text:
          "> Goal detected: " +
          goal,
        className:
          "terminal-line"
      },

      {
        text:
          "> Instructions: " +
          instructions,
        className:
          "terminal-line"
      },

      {
        text:
          "> Loading tools...",
        className:
          "terminal-line"
      },

      {
        text:
          tools.length
            ? "> Connected tools: " +
              tools.join(", ")
            : "> No external tools selected",
        className:
          "terminal-line"
      },

      {
        text:
          "> Understanding goal...",
        className:
          "terminal-line"
      },

      {
        text:
          "> Creating execution plan...",
        className:
          "terminal-line"
      },

      {
        text:
          "> Selecting next action...",
        className:
          "terminal-line"
      },

      {
        text:
          "> Running simulated task...",
        className:
          "terminal-line"
      },

      {
        text:
          "> Reviewing result...",
        className:
          "terminal-line"
      },

      {
        text:
          "> Mission complete ✓",
        className:
          "terminal-line success"
      }

    ];


    lines.forEach(
      function (
        line,
        index
      ) {

        setTimeout(
          function () {

            const div =
              document.createElement(
                "div"
              );

            div.className =
              line.className;

            div.textContent =
              line.text;

            terminalContent.appendChild(
              div
            );


            terminalContent.scrollTop =
              terminalContent.scrollHeight;

          },
          index * 420
        );

      }
    );

  }
);


/* =========================================
   WORKFLOW HIGHLIGHT
========================================= */

const workflowCards =
  document.querySelectorAll(
    ".workflow-card"
  );

let workflowIndex =
  0;


setInterval(
  function () {

    workflowCards.forEach(
      function (card) {

        card.classList.remove(
          "active"
        );

      }
    );


    workflowCards[
      workflowIndex
    ].classList.add(
      "active"
    );


    workflowIndex++;

    if (
      workflowIndex >=
      workflowCards.length
    ) {

      workflowIndex =
        0;

    }

  },
  1800
);


/* =========================================
   SCROLL REVEAL
========================================= */

const revealTargets =
  document.querySelectorAll(
    ".comparison-card, .definition-panel, .tool-card, .mission-card, .level-item"
  );


const revealObserver =
  new IntersectionObserver(
    function (entries) {

      entries.forEach(
        function (entry) {

          if (
            entry.isIntersecting
          ) {

            entry.target.classList.add(
              "revealed"
            );

          }

        }
      );

    },
    {
      threshold: 0.12
    }
  );


revealTargets.forEach(
  function (target) {

    target.style.opacity =
      "0";

    target.style.transform =
      "translateY(28px)";

    target.style.transition =
      "opacity 0.7s ease, transform 0.7s ease";


    revealObserver.observe(
      target
    );

  }
);


/* Add reveal styles dynamically */

const style =
  document.createElement(
    "style"
  );

style.textContent = `

  .revealed {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }

`;

document.head.appendChild(
  style
);