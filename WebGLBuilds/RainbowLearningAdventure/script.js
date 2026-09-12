const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const rewardScreen = document.getElementById("rewardScreen");

const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");

const categoryBadge = document.getElementById("categoryBadge");
const questionText = document.getElementById("questionText");
const visual = document.getElementById("visual");
const answerGrid = document.getElementById("answerGrid");
const feedback = document.getElementById("feedback");

const scoreEl = document.getElementById("score");
const starsLabel = document.getElementById("starsLabel");
const progressLabel = document.getElementById("progressLabel");
const progressBar = document.getElementById("progressBar");
const finalScore = document.getElementById("finalScore");
const confetti = document.getElementById("confetti");

const TOTAL_QUESTIONS = 12;

const colors = [
  { name: "Red", hex: "#ff4d5a" },
  { name: "Blue", hex: "#4a8cff" },
  { name: "Yellow", hex: "#ffd84d" },
  { name: "Green", hex: "#50d890" },
  { name: "Orange", hex: "#ff9f43" },
  { name: "Purple", hex: "#9b6cff" },
  { name: "Pink", hex: "#ff78b7" }
];

const animals = [
  { name: "Dog", icon: "🐶" },
  { name: "Cat", icon: "🐱" },
  { name: "Lion", icon: "🦁" },
  { name: "Elephant", icon: "🐘" },
  { name: "Frog", icon: "🐸" },
  { name: "Monkey", icon: "🐵" },
  { name: "Rabbit", icon: "🐰" },
  { name: "Bear", icon: "🐻" }
];

const objects = [
  { name: "Ball", icon: "⚽" },
  { name: "Car", icon: "🚗" },
  { name: "Book", icon: "📘" },
  { name: "Cup", icon: "🥤" },
  { name: "Clock", icon: "⏰" },
  { name: "Gift", icon: "🎁" },
  { name: "Pencil", icon: "✏️" },
  { name: "Teddy Bear", icon: "🧸" }
];

const shapeNames = ["Circle", "Square", "Triangle", "Rectangle", "Diamond", "Star"];

const categoryInfo = {
  Colors: "🎨",
  Numbers: "🔢",
  Alphabet: "🔤",
  Shapes: "⭐",
  Animals: "🐶",
  Objects: "🧸"
};

let questions = [];
let currentIndex = 0;
let score = 0;
let locked = false;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWrongAnswers(pool, correct, amount = 2) {
  return shuffle(pool.filter(item => item !== correct)).slice(0, amount);
}

function makeColorQuestion() {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const wrong = pickWrongAnswers(colors.map(c => c.name), color.name);
  return {
    category: "Colors",
    prompt: "What color is this?",
    visualType: "color",
    visualValue: color.hex,
    answer: color.name,
    choices: shuffle([color.name, ...wrong])
  };
}

function makeNumberQuestion() {
  const number = Math.floor(Math.random() * 10) + 1;
  const wrong = shuffle(
    Array.from({ length: 10 }, (_, i) => i + 1).filter(n => n !== number)
  ).slice(0, 2);

  const iconPool = ["⭐", "🍎", "🐞", "🎈", "🧁"];
  const icon = iconPool[Math.floor(Math.random() * iconPool.length)];

  return {
    category: "Numbers",
    prompt: "How many do you see?",
    visualType: "count",
    visualValue: { number, icon },
    answer: String(number),
    choices: shuffle([String(number), ...wrong.map(String)])
  };
}

function makeAlphabetQuestion() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const wrong = pickWrongAnswers(letters, letter);
  return {
    category: "Alphabet",
    prompt: "Which letter is this?",
    visualType: "letter",
    visualValue: letter,
    answer: letter,
    choices: shuffle([letter, ...wrong])
  };
}

function makeShapeQuestion() {
  const shape = shapeNames[Math.floor(Math.random() * shapeNames.length)];
  const wrong = pickWrongAnswers(shapeNames, shape);
  return {
    category: "Shapes",
    prompt: "What shape is this?",
    visualType: "shape",
    visualValue: shape.toLowerCase(),
    answer: shape,
    choices: shuffle([shape, ...wrong])
  };
}

function makeAnimalQuestion() {
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const wrong = pickWrongAnswers(animals.map(a => a.name), animal.name);
  return {
    category: "Animals",
    prompt: "What animal is this?",
    visualType: "emoji",
    visualValue: animal.icon,
    answer: animal.name,
    choices: shuffle([animal.name, ...wrong])
  };
}

function makeObjectQuestion() {
  const object = objects[Math.floor(Math.random() * objects.length)];
  const wrong = pickWrongAnswers(objects.map(o => o.name), object.name);
  return {
    category: "Objects",
    prompt: "What object is this?",
    visualType: "emoji",
    visualValue: object.icon,
    answer: object.name,
    choices: shuffle([object.name, ...wrong])
  };
}

function buildQuestionSet() {
  const makers = [
    makeColorQuestion,
    makeNumberQuestion,
    makeAlphabetQuestion,
    makeShapeQuestion,
    makeAnimalQuestion,
    makeObjectQuestion
  ];

  const set = [];

  // Two questions from every category = 12 total.
  makers.forEach(makeQuestion => {
    set.push(makeQuestion());
    set.push(makeQuestion());
  });

  return shuffle(set);
}

function showScreen(screen) {
  [startScreen, gameScreen, rewardScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function renderVisual(question) {
  visual.className = "visual";
  visual.innerHTML = "";

  if (question.visualType === "color") {
    visual.classList.add("color-swatch");
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = question.visualValue;
    visual.appendChild(swatch);
    return;
  }

  if (question.visualType === "count") {
    visual.classList.add("number-visual");
    visual.style.fontSize = "clamp(3.2rem, 9vw, 6rem)";
    visual.style.lineHeight = "1.05";
    visual.textContent = Array(question.visualValue.number)
      .fill(question.visualValue.icon)
      .join(" ");
    return;
  }

  visual.style.fontSize = "";

  if (question.visualType === "letter") {
    visual.classList.add("letter-visual");
    visual.textContent = question.visualValue;
    return;
  }

  if (question.visualType === "shape") {
    visual.classList.add("shape-visual");
    const shape = document.createElement("div");
    shape.className = `shape ${question.visualValue}`;
    if (question.visualValue === "star") shape.textContent = "⭐";
    visual.appendChild(shape);
    return;
  }

  visual.textContent = question.visualValue;
}

function renderQuestion() {
  locked = false;
  feedback.textContent = "";

  const question = questions[currentIndex];
  categoryBadge.textContent = `${categoryInfo[question.category]} ${question.category}`;
  questionText.textContent = question.prompt;
  renderVisual(question);

  progressLabel.textContent = `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`;
  scoreEl.textContent = score;
  starsLabel.textContent = `${score} ${score === 1 ? "star" : "stars"}`;
  progressBar.style.width = `${(currentIndex / TOTAL_QUESTIONS) * 100}%`;

  answerGrid.innerHTML = "";

  shuffle(question.choices).forEach(choice => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => checkAnswer(choice, button));
    answerGrid.appendChild(button);
  });
}

function checkAnswer(choice, button) {
  if (locked) return;

  const question = questions[currentIndex];

  if (choice === question.answer) {
    locked = true;
    button.classList.add("correct");
    score++;
    scoreEl.textContent = score;
    starsLabel.textContent = `${score} ${score === 1 ? "star" : "stars"}`;
    feedback.textContent = "🎉 Great job!";

    document.querySelectorAll(".answer-button").forEach(btn => {
      btn.disabled = true;
    });

    setTimeout(() => {
      currentIndex++;
      if (currentIndex >= TOTAL_QUESTIONS) {
        finishGame();
      } else {
        renderQuestion();
      }
    }, 850);
  } else {
    button.classList.add("wrong");
    button.disabled = true;
    feedback.textContent = "💛 Try again!";
  }
}

function startGame() {
  questions = buildQuestionSet();
  currentIndex = 0;
  score = 0;
  showScreen(gameScreen);
  renderQuestion();
}

function finishGame() {
  progressBar.style.width = "100%";
  finalScore.textContent = `You earned ${score} out of ${TOTAL_QUESTIONS} stars!`;
  createConfetti();
  showScreen(rewardScreen);
}

function createConfetti() {
  confetti.innerHTML = "";
  const colors = ["#ff66a8", "#ffd84d", "#50d890", "#4eb8ff", "#8a6cff", "#ff9f43"];

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("span");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${3 + Math.random() * 3}s`;
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confetti.appendChild(piece);
  }
}

startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
