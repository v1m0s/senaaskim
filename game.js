"use strict";

const $ = (id) => document.getElementById(id);

const loginScreen = $("loginScreen");
const gameScreen = $("gameScreen");
const playerName = $("playerName");
const startButton = $("startButton");

const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = $("scoreValue");
const bestValue = $("bestValue");
const welcomeText = $("welcomeText");

const pauseButton = $("pauseButton");
const soundButton = $("soundButton");
const pauseOverlay = $("pauseOverlay");
const gameOverOverlay = $("gameOverOverlay");

const resumeButton = $("resumeButton");
const restartButton = $("restartButton");
const homeButton = $("homeButton");
const homeFromPauseButton = $("homeFromPauseButton");

const finalScore = $("finalScore");
const finalBest = $("finalBest");
const resultMessage = $("resultMessage");
const countdown = $("countdown");

const leftButton = $("leftButton");
const rightButton = $("rightButton");

let width = 0;
let height = 0;
let running = false;
let paused = false;
let muted = false;
let lastTime = 0;
let score = 0;
let lives = 3;
let spawnTimer = 0;

let best = Number(localStorage.getItem("senaBest") || 0);
bestValue.textContent = best;

const player = {
  x: 0,
  y: 0,
  radius: 24,
  speed: 360
};

const input = {
  left: false,
  right: false,
  targetX: null
};

let objects = [];
let particles = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  player.y = height - 65;

  if (!player.x) {
    player.x = width / 2;
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  objects = [];
  particles = [];

  player.x = width / 2;
  player.y = height - 65;

  input.left = false;
  input.right = false;
  input.targetX = null;

  scoreValue.textContent = "0";
  pauseOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function beginCountdown() {
  running = false;
  countdown.classList.remove("hidden");

  for (const text of ["3", "2", "1", "SENA!"]) {
    countdown.textContent = text;
    await wait(text === "SENA!" ? 400 : 500);
  }

  countdown.classList.add("hidden");
  running = true;
  paused = false;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  const name =
    playerName.value.trim().slice(0, 15) || "Oyuncu";

  welcomeText.textContent = name + " • Neon Ağ";

  loginScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  requestAnimationFrame(() => {
    resizeCanvas();
    resetGame();
    beginCountdown();
  });
}

function goHome() {
  running = false;
  paused = false;

  pauseOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  gameScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function spawnObject() {
  const dangerChance = Math.min(0.42, 0.18 + score / 1700);
  const danger = Math.random() < dangerChance;
  const rare = !danger && Math.random() < 0.12;

  objects.push({
    x: 25 + Math.random() * Math.max(1, width - 50),
    y: -30,
    radius: danger ? 18 : rare ? 14 : 11,
    speed: 170 + Math.random() * 100 + score * 0.05,
    type: danger ? "danger" : rare ? "rare" : "energy",
    rotation: Math.random() * Math.PI * 2
  });
}

function createParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 100;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6,
      color
    });
  }
}

function touches(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = a.radius + b.radius;

  return dx * dx + dy * dy <= distance * distance;
}

function finishGame() {
  running = false;

  if (score > best) {
    best = score;
    localStorage.setItem("senaBest", String(best));
    resultMessage.textContent =
      "Yeni rekor! SENA ağında iz bıraktın.";
  } else {
    resultMessage.textContent =
      "Bir tur daha dene, rekor seni bekliyor.";
  }

  bestValue.textContent = best;
  finalScore.textContent = score;
  finalBest.textContent = best;

  gameOverOverlay.classList.remove("hidden");
}

function update(delta) {
  let direction = 0;

  if (input.left) direction -= 1;
  if (input.right) direction += 1;

  if (input.targetX !== null) {
    const difference = input.targetX - player.x;

    if (Math.abs(difference) > 3) {
      direction = Math.sign(difference);
    }
  }

  player.x += direction * player.speed * delta;

  player.x = Math.max(
    player.radius + 6,
    Math.min(width - player.radius - 6, player.x)
  );

  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnObject();
    spawnTimer = Math.max(0.3, 0.75 - score / 3000);
  }

  for (let i = objects.length - 1; i >= 0; i--) {
    const object = objects[i];

    object.y += object.speed * delta;
    object.rotation += delta * 2;

    if (touches(player, object)) {
      objects.splice(i, 1);

      if (object.type === "danger") {
        lives -= 1;
        createParticles(object.x, object.y, "#ff557d");

        if (lives <= 0) {
          finishGame();
          return;
        }
      } else {
        score += object.type === "rare" ? 30 : 10;
        scoreValue.textContent = score;

        createParticles(
          object.x,
          object.y,
          object.type === "rare" ? "#ff72d2" : "#55ddff"
        );
      }

      continue;
    }

    if (object.y - object.radius > height) {
      objects.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.96;
    particle.vy *= 0.96;

    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, "#10143d");
  gradient.addColorStop(0.55, "#090b25");
  gradient.addColorStop(1, "#050611");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(85,221,255,0.08)";
  ctx.lineWidth = 1;

  for (let y = 40; y < height; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let x = 0; x < width; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.shadowBlur = 25;
  ctx.shadowColor = "#55ddff";

  const gradient = ctx.createLinearGradient(-25, -25, 25, 25);
  gradient.addColorStop(0, "#845dff");
  gradient.addColorStop(1, "#ff5fc9");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#55ddff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", 0, 1);

  ctx.restore();
}

function drawObject(object) {
  ctx.save();
  ctx.translate(object.x, object.y);
  ctx.rotate(object.rotation);

  if (object.type === "danger") {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff557d";
    ctx.fillStyle = "rgba(255,85,125,0.35)";
    ctx.strokeStyle = "#ff557d";
  } else {
    const color =
      object.type === "rare" ? "#ff72d2" : "#55ddff";

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fillStyle =
      object.type === "rare"
        ? "rgba(255,114,210,0.35)"
        : "rgba(85,221,255,0.35)";
    ctx.strokeStyle = color;
  }

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, object.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (object.type === "danger") {
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(7, 7);
    ctx.moveTo(7, -7);
    ctx.lineTo(-7, 7);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 0.6);
    ctx.fillStyle = particle.color;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawInfo() {
  ctx.fillStyle = "rgba(5,6,20,0.7)";
  ctx.fillRect(12, 12, 112, 36);

  ctx.fillStyle = "#ff72d2";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("CAN: " + "◆".repeat(lives), 22, 36);
}

function draw() {
  drawBackground();

  for (const object of objects) {
    drawObject(object);
  }

  drawParticles();
  drawPlayer();
  drawInfo();
}

function gameLoop(time) {
  if (!running || paused) return;

  const delta = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;

  update(delta);
  draw();

  if (running) {
    requestAnimationFrame(gameLoop);
  }
}

function setPaused(value) {
  if (gameScreen.classList.contains("hidden")) return;

  paused = value;
  running = !value;

  pauseOverlay.classList.toggle("hidden", !value);
  pauseButton.textContent = value ? "▶" : "Ⅱ";

  if (!value) {
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

function setDirection(side, value) {
  input[side] = value;
  input.targetX = null;
}

function bindButton(button, side) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setDirection(side, true);
  });

  button.addEventListener("pointerup", () => {
    setDirection(side, false);
  });

  button.addEventListener("pointercancel", () => {
    setDirection(side, false);
  });

  button.addEventListener("pointerleave", () => {
    setDirection(side, false);
  });
}

startButton.addEventListener("click", startGame);

playerName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startGame();
});

pauseButton.addEventListener("click", () => {
  setPaused(!paused);
});

resumeButton.addEventListener("click", () => {
  setPaused(false);
});

restartButton.addEventListener("click", () => {
  resetGame();
  beginCountdown();
});

homeButton.addEventListener("click", goHome);
homeFromPauseButton.addEventListener("click", goHome);

soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.textContent = muted ? "×" : "♪";
});

bindButton(leftButton, "left");
bindButton(rightButton, "right");

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  input.targetX = event.clientX - rect.left;
});

canvas.addEventListener("pointermove", (event) => {
  if (event.buttons > 0) {
    const rect = canvas.getBoundingClientRect();
    input.targetX = event.clientX - rect.left;
  }
});

canvas.addEventListener("pointerup", () => {
  input.targetX = null;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    setDirection("left", true);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    setDirection("right", true);
  }

  if (event.key === " ") {
    event.preventDefault();
    setPaused(!paused);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    setDirection("left", false);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    setDirection("right", false);
  }
});

window.addEventListener("resize", resizeCanvas);
