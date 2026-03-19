const gridEl = document.getElementById("ttt-grid");
const stateEl = document.getElementById("state");
const resetBtn = document.getElementById("reset-btn");

const state = {
  board: Array(9).fill(""),
  current: "X",
  finished: false,
};

const setStatus = (text) => {
  stateEl.textContent = text;
};

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const getWinner = () => {
  for (const [a, b, c] of winningLines) {
    if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
      return state.board[a];
    }
  }
  return null;
};

const isDraw = () => state.board.every((cell) => cell);

const render = () => {
  gridEl.querySelectorAll(".ttt-cell").forEach((cell) => {
    const index = Number(cell.dataset.index);
    cell.textContent = state.board[index];
  });
};

const handleMove = (index) => {
  if (state.finished || state.board[index]) {
    return;
  }
  state.board[index] = state.current;
  const winner = getWinner();
  if (winner) {
    state.finished = true;
    setStatus(`${winner} wins`);
  } else if (isDraw()) {
    state.finished = true;
    setStatus("Draw");
  } else {
    state.current = state.current === "X" ? "O" : "X";
    setStatus(`${state.current}'s turn`);
  }
  render();
};

const resetGame = () => {
  state.board = Array(9).fill("");
  state.current = "X";
  state.finished = false;
  setStatus("Ready");
  render();
};

gridEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".ttt-cell");
  if (!cell) {
    return;
  }
  handleMove(Number(cell.dataset.index));
});

resetBtn.addEventListener("click", () => resetGame());

resetGame();
