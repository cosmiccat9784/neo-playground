const boardEl = document.getElementById("board");
const minesLeftEl = document.getElementById("mines-left");
const timerEl = document.getElementById("timer");
const stateEl = document.getElementById("state");
const resetBtn = document.getElementById("reset-btn");

const config = {
  rows: 10,
  cols: 10,
  mines: 15,
};

const state = {
  cells: [],
  revealed: 0,
  flags: 0,
  started: false,
  timer: 0,
  interval: null,
  gameOver: false,
};

const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const setStatus = (text) => {
  stateEl.textContent = text;
};

const updateMinesLeft = () => {
  const remaining = Math.max(0, config.mines - state.flags);
  minesLeftEl.textContent = remaining.toString();
};

const updateTimer = () => {
  timerEl.textContent = state.timer.toString();
};

const startTimer = () => {
  if (state.interval) {
    clearInterval(state.interval);
  }
  state.interval = setInterval(() => {
    state.timer += 1;
    updateTimer();
  }, 1000);
};

const stopTimer = () => {
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
};

const createCell = (row, col) => ({
  row,
  col,
  mine: false,
  revealed: false,
  flagged: false,
  count: 0,
  el: null,
});

const buildGrid = () => {
  state.cells = [];
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${config.cols}, 32px)`;
  boardEl.style.gridTemplateRows = `repeat(${config.rows}, 32px)`;

  for (let row = 0; row < config.rows; row += 1) {
    const rowCells = [];
    for (let col = 0; col < config.cols; col += 1) {
      const cell = createCell(row, col);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "ms-cell";
      el.dataset.row = row.toString();
      el.dataset.col = col.toString();
      cell.el = el;
      rowCells.push(cell);
      boardEl.appendChild(el);
    }
    state.cells.push(rowCells);
  }
};

const cellAt = (row, col) => {
  if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
    return null;
  }
  return state.cells[row][col];
};

const placeMines = (safeCell) => {
  let placed = 0;
  while (placed < config.mines) {
    const row = Math.floor(Math.random() * config.rows);
    const col = Math.floor(Math.random() * config.cols);
    const cell = cellAt(row, col);
    if (!cell || cell.mine) {
      continue;
    }
    if (cell === safeCell) {
      continue;
    }
    cell.mine = true;
    placed += 1;
  }
};

const computeCounts = () => {
  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      const cell = cellAt(row, col);
      if (!cell || cell.mine) {
        continue;
      }
      let count = 0;
      directions.forEach(([dx, dy]) => {
        const neighbor = cellAt(row + dx, col + dy);
        if (neighbor && neighbor.mine) {
          count += 1;
        }
      });
      cell.count = count;
    }
  }
};

const revealCell = (cell) => {
  if (!cell || cell.revealed || cell.flagged) {
    return;
  }
  cell.revealed = true;
  cell.el.classList.add("revealed");
  if (cell.mine) {
    cell.el.classList.add("mine");
    cell.el.textContent = "✸";
    return;
  }
  state.revealed += 1;
  if (cell.count > 0) {
    cell.el.textContent = cell.count.toString();
    cell.el.classList.add(`n${cell.count}`);
  } else {
    cell.el.textContent = "";
  }
};

const floodReveal = (cell) => {
  const stack = [cell];
  while (stack.length) {
    const current = stack.pop();
    if (!current || current.revealed || current.flagged) {
      continue;
    }
    revealCell(current);
    if (current.count === 0 && !current.mine) {
      directions.forEach(([dx, dy]) => {
        const neighbor = cellAt(current.row + dx, current.col + dy);
        if (neighbor && !neighbor.revealed && !neighbor.flagged) {
          stack.push(neighbor);
        }
      });
    }
  }
};

const revealAllMines = () => {
  state.cells.flat().forEach((cell) => {
    if (cell.mine) {
      cell.el.classList.add("mine");
      cell.el.textContent = "✸";
    }
  });
};

const checkWin = () => {
  const totalSafe = config.rows * config.cols - config.mines;
  return state.revealed >= totalSafe;
};

const handleClick = (cell) => {
  if (state.gameOver || cell.flagged) {
    return;
  }
  if (!state.started) {
    state.started = true;
    placeMines(cell);
    computeCounts();
    startTimer();
    setStatus("Running");
  }

  if (cell.mine) {
    revealCell(cell);
    state.gameOver = true;
    setStatus("Boom");
    revealAllMines();
    stopTimer();
    return;
  }

  if (cell.count === 0) {
    floodReveal(cell);
  } else {
    revealCell(cell);
  }

  if (checkWin()) {
    state.gameOver = true;
    setStatus("Cleared");
    stopTimer();
  }
};

const toggleFlag = (cell) => {
  if (state.gameOver || cell.revealed) {
    return;
  }
  cell.flagged = !cell.flagged;
  cell.el.classList.toggle("flagged", cell.flagged);
  cell.el.textContent = cell.flagged ? "⚑" : "";
  state.flags += cell.flagged ? 1 : -1;
  updateMinesLeft();
};

const bindEvents = () => {
  boardEl.addEventListener("click", (event) => {
    const target = event.target.closest(".ms-cell");
    if (!target) {
      return;
    }
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    const cell = cellAt(row, col);
    handleClick(cell);
  });

  boardEl.addEventListener("contextmenu", (event) => {
    const target = event.target.closest(".ms-cell");
    if (!target) {
      return;
    }
    event.preventDefault();
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    const cell = cellAt(row, col);
    toggleFlag(cell);
  });
};

const resetGame = () => {
  stopTimer();
  state.revealed = 0;
  state.flags = 0;
  state.started = false;
  state.timer = 0;
  state.gameOver = false;
  updateTimer();
  updateMinesLeft();
  setStatus("Ready");
  buildGrid();
};

resetBtn.addEventListener("click", () => resetGame());

bindEvents();
resetGame();
