const stockEl = document.getElementById("stock");
const wasteEl = document.getElementById("waste");
const tableauEl = document.getElementById("tableau");
const foundationsEl = document.getElementById("foundations");
const stateEl = document.getElementById("state");
const movesEl = document.getElementById("moves");

const suits = ["S", "H", "D", "C"];
const colors = { S: "black", H: "red", D: "red", C: "black" };
const ranks = [
  { value: 1, label: "A" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
  { value: 11, label: "J" },
  { value: 12, label: "Q" },
  { value: 13, label: "K" },
];

const state = {
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  selected: null,
  moves: 0,
};

const setStatus = (text) => {
  stateEl.textContent = text;
};

const updateMoves = () => {
  movesEl.textContent = state.moves.toString();
};

const buildDeck = () => {
  const deck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({
        suit,
        color: colors[suit],
        rank: rank.value,
        label: rank.label,
        faceUp: false,
      });
    });
  });
  return deck;
};

const shuffle = (deck) => {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const deal = () => {
  const deck = shuffle(buildDeck());
  state.tableau = [[], [], [], [], [], [], []];
  state.foundations = [[], [], [], []];
  state.waste = [];
  state.stock = [];
  state.selected = null;
  state.moves = 0;

  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      const card = deck.pop();
      card.faceUp = j === i;
      state.tableau[i].push(card);
    }
  }
  state.stock = deck;
  updateMoves();
  setStatus("Ready");
};

const topCard = (pile) => pile[pile.length - 1];

const canMoveToFoundation = (card, pile) => {
  if (!card) {
    return false;
  }
  if (!pile.length) {
    return card.rank === 1;
  }
  const top = topCard(pile);
  return card.suit === top.suit && card.rank === top.rank + 1;
};

const canMoveToTableau = (card, pile) => {
  if (!card) {
    return false;
  }
  if (!pile.length) {
    return card.rank === 13;
  }
  const top = topCard(pile);
  return card.color !== top.color && card.rank === top.rank - 1;
};

const cardLabel = (card) => `${card.label} ${card.suit}`;

const clearSelected = () => {
  state.selected = null;
};

const selectCard = (source, pileIndex, cardIndex) => {
  state.selected = { source, pileIndex, cardIndex };
};

const recordMove = () => {
  state.moves += 1;
  updateMoves();
};

const moveCard = (source, target, targetIndex) => {
  const srcPile = source === "waste" ? state.waste : state.tableau[source];
  const card = srcPile.pop();
  if (target === "foundation") {
    state.foundations[targetIndex].push(card);
  } else if (target === "tableau") {
    state.tableau[targetIndex].push(card);
  }
  if (source !== "waste") {
    const newTop = topCard(srcPile);
    if (newTop && !newTop.faceUp) {
      newTop.faceUp = true;
    }
  }
  recordMove();
  clearSelected();
};

const checkWin = () => state.foundations.every((pile) => pile.length === 13);

const renderPile = (pileEl, pile, options = {}) => {
  pileEl.innerHTML = "";
  pile.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    if (card.color === "red") {
      cardEl.classList.add("red");
    }
    if (!card.faceUp) {
      cardEl.classList.add("face-down");
      cardEl.textContent = "";
    } else {
      cardEl.textContent = cardLabel(card);
    }
    cardEl.style.top = `${index * (options.offset ?? 0)}px`;
    cardEl.dataset.source = options.source || "";
    cardEl.dataset.pile = options.pileIndex?.toString() || "";
    cardEl.dataset.card = index.toString();
    if (
      state.selected &&
      state.selected.source === options.source &&
      state.selected.pileIndex === options.pileIndex &&
      state.selected.cardIndex === index
    ) {
      cardEl.classList.add("selected");
    }
    pileEl.appendChild(cardEl);
  });
};

const renderStock = () => {
  stockEl.innerHTML = "";
  if (state.stock.length) {
    const cardEl = document.createElement("div");
    cardEl.className = "card face-down";
    cardEl.textContent = "";
    stockEl.appendChild(cardEl);
  }
};

const renderWaste = () => {
  renderPile(wasteEl, state.waste.slice(-1), { source: "waste", pileIndex: 0 });
};

const renderFoundations = () => {
  foundationsEl.querySelectorAll(".foundation").forEach((pileEl, index) => {
    const pile = state.foundations[index];
    renderPile(pileEl, pile.slice(-1), { source: "foundation", pileIndex: index });
  });
};

const renderTableau = () => {
  tableauEl.querySelectorAll(".tableau").forEach((pileEl, index) => {
    renderPile(pileEl, state.tableau[index], {
      source: "tableau",
      pileIndex: index,
      offset: 20,
    });
  });
};

const render = () => {
  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
};

const drawFromStock = () => {
  if (!state.stock.length) {
    if (!state.waste.length) {
      return;
    }
    state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    state.waste = [];
    recordMove();
    render();
    return;
  }
  const card = state.stock.pop();
  card.faceUp = true;
  state.waste.push(card);
  recordMove();
  render();
};

const handleCardClick = (cardEl) => {
  const source = cardEl.dataset.source;
  const pileIndex = Number(cardEl.dataset.pile);
  const cardIndex = Number(cardEl.dataset.card);
  if (source === "foundation") {
    return;
  }
  if (source === "waste") {
    selectCard("waste", 0, cardIndex);
    render();
    return;
  }
  if (source === "tableau") {
    const pile = state.tableau[pileIndex];
    if (cardIndex !== pile.length - 1) {
      return;
    }
    const card = pile[cardIndex];
    if (!card.faceUp) {
      card.faceUp = true;
      recordMove();
      render();
      return;
    }
    selectCard("tableau", pileIndex, cardIndex);
    render();
  }
};

const handleFoundationClick = (index) => {
  if (!state.selected) {
    return;
  }
  const card =
    state.selected.source === "waste"
      ? topCard(state.waste)
      : topCard(state.tableau[state.selected.pileIndex]);
  if (canMoveToFoundation(card, state.foundations[index])) {
    moveCard(state.selected.source === "waste" ? "waste" : state.selected.pileIndex, "foundation", index);
    render();
    if (checkWin()) {
      setStatus("Cleared");
    }
  }
};

const handleTableauClick = (index) => {
  if (!state.selected) {
    return;
  }
  const card =
    state.selected.source === "waste"
      ? topCard(state.waste)
      : topCard(state.tableau[state.selected.pileIndex]);
  if (canMoveToTableau(card, state.tableau[index])) {
    moveCard(state.selected.source === "waste" ? "waste" : state.selected.pileIndex, "tableau", index);
    render();
  }
};

stockEl.addEventListener("click", () => drawFromStock());
wasteEl.addEventListener("click", (event) => {
  const cardEl = event.target.closest(".card");
  if (cardEl) {
    handleCardClick(cardEl);
  }
});

tableauEl.addEventListener("click", (event) => {
  const cardEl = event.target.closest(".card");
  const pileEl = event.target.closest(".tableau");
  if (cardEl) {
    handleCardClick(cardEl);
    return;
  }
  if (pileEl) {
    handleTableauClick(Number(pileEl.dataset.tableau));
  }
});

foundationsEl.addEventListener("click", (event) => {
  const pileEl = event.target.closest(".foundation");
  if (!pileEl) {
    return;
  }
  handleFoundationClick(Number(pileEl.dataset.foundation));
});

deal();
render();
