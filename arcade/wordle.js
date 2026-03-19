const WORDS = [
  "orbit",
  "neons",
  "drift",
  "aster",
  "laser",
  "pixel",
  "glide",
  "arena",
  "space",
  "shift",
  "flare",
  "novae",
  "dream",
  "pulse",
  "stack",
  "score",
];

const boardEl = document.getElementById("wordle-board");
const statusEl = document.getElementById("wordle-status");
const keyboardEl = document.getElementById("wordle-keyboard");

const state = {
  target: WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase(),
  guesses: Array.from({ length: 6 }, () => Array(5).fill("")),
  currentRow: 0,
  currentCol: 0,
  finished: false,
};

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const setStatus = (text) => {
  statusEl.textContent = text;
};

const buildBoard = () => {
  boardEl.innerHTML = "";
  state.guesses.forEach((row, rowIndex) => {
    const rowEl = document.createElement("div");
    rowEl.className = "wordle-row";
    row.forEach((letter, colIndex) => {
      const tile = document.createElement("div");
      tile.className = "wordle-tile";
      tile.dataset.row = rowIndex.toString();
      tile.dataset.col = colIndex.toString();
      tile.textContent = letter;
      rowEl.appendChild(tile);
    });
    boardEl.appendChild(rowEl);
  });
};

const buildKeyboard = () => {
  keyboardEl.innerHTML = "";
  KEYBOARD_ROWS.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "wordle-keyboard-row";
    row.split("").forEach((key) => {
      const keyEl = document.createElement("button");
      keyEl.className = "wordle-key";
      keyEl.textContent = key;
      keyEl.dataset.key = key;
      rowEl.appendChild(keyEl);
    });
    keyboardEl.appendChild(rowEl);
  });

  const controlRow = document.createElement("div");
  controlRow.className = "wordle-keyboard-row";
  const enterKey = document.createElement("button");
  enterKey.className = "wordle-key wide";
  enterKey.textContent = "Enter";
  enterKey.dataset.key = "ENTER";
  const backspaceKey = document.createElement("button");
  backspaceKey.className = "wordle-key wide";
  backspaceKey.textContent = "Back";
  backspaceKey.dataset.key = "BACKSPACE";
  controlRow.appendChild(enterKey);
  controlRow.appendChild(backspaceKey);
  keyboardEl.appendChild(controlRow);
};

const updateBoard = () => {
  boardEl.querySelectorAll(".wordle-tile").forEach((tile) => {
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    tile.textContent = state.guesses[row][col];
  });
};

const applyResultStyles = (rowIndex, results) => {
  const rowEl = boardEl.children[rowIndex];
  results.forEach((result, colIndex) => {
    const tile = rowEl.children[colIndex];
    tile.classList.add(`state-${result}`);
  });
};

const updateKeyboard = (letter, stateClass) => {
  const keyEl = keyboardEl.querySelector(`[data-key="${letter}"]`);
  if (!keyEl) {
    return;
  }
  const priority = ["correct", "present", "absent"];
  const existing = priority.find((value) => keyEl.classList.contains(`state-${value}`));
  if (existing && priority.indexOf(existing) <= priority.indexOf(stateClass)) {
    return;
  }
  keyEl.classList.remove("state-correct", "state-present", "state-absent");
  keyEl.classList.add(`state-${stateClass}`);
};

const evaluateGuess = (guess) => {
  const target = state.target.split("");
  const results = Array(5).fill("absent");
  const used = Array(5).fill(false);

  guess.forEach((letter, index) => {
    if (letter === target[index]) {
      results[index] = "correct";
      used[index] = true;
    }
  });

  guess.forEach((letter, index) => {
    if (results[index] === "correct") {
      return;
    }
    const matchIndex = target.findIndex((char, i) => char === letter && !used[i]);
    if (matchIndex !== -1) {
      results[index] = "present";
      used[matchIndex] = true;
    }
  });

  return results;
};

const submitGuess = () => {
  if (state.currentCol < 5) {
    setStatus("Not enough letters.");
    return;
  }
  const guess = state.guesses[state.currentRow].join("");
  const results = evaluateGuess(state.guesses[state.currentRow]);
  applyResultStyles(state.currentRow, results);
  results.forEach((result, index) => {
    updateKeyboard(guess[index], result);
  });

  if (guess === state.target) {
    setStatus("You got it!");
    state.finished = true;
    return;
  }

  if (state.currentRow === 5) {
    setStatus(`Answer: ${state.target}`);
    state.finished = true;
    return;
  }

  state.currentRow += 1;
  state.currentCol = 0;
  setStatus("Keep going!");
};

const handleKey = (key) => {
  if (state.finished) {
    return;
  }
  if (key === "ENTER") {
    submitGuess();
    return;
  }
  if (key === "BACKSPACE") {
    if (state.currentCol > 0) {
      state.currentCol -= 1;
      state.guesses[state.currentRow][state.currentCol] = "";
      updateBoard();
    }
    return;
  }
  if (/^[A-Z]$/.test(key) && state.currentCol < 5) {
    state.guesses[state.currentRow][state.currentCol] = key;
    state.currentCol += 1;
    updateBoard();
  }
};

keyboardEl.addEventListener("click", (event) => {
  const key = event.target.closest(".wordle-key");
  if (!key) {
    return;
  }
  handleKey(key.dataset.key);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleKey("ENTER");
  } else if (event.key === "Backspace") {
    handleKey("BACKSPACE");
  } else if (/^[a-zA-Z]$/.test(event.key)) {
    handleKey(event.key.toUpperCase());
  }
});

buildBoard();
buildKeyboard();
setStatus("Guess the 5-letter word.");
