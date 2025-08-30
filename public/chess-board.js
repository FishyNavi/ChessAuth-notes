

const PIECE_SYMBOLS = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

class ChessBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --light-square: #f0d9b5;
                    --dark-square: #b58863;
                    --highlight: #d6984e;
                    --gold-metallic: #c4ae4b;
                    --dark-purple: #3a1c43;
                    --last-move-highlight: #a8a05e;
                }
                .board {
                    display: grid;
                    grid-template-rows: repeat(8, min(11.5vw, 50px));
                    grid-template-columns: repeat(8, min(11.5vw, 50px));
                    border: 2px solid var(--gold-metallic);
                    width: min(92vw, 400px);
                    height: min(92vw, 400px);
                    margin: 20px auto;
                }
                .square {
                    width: 100%; height: 100%;
                    display: flex; justify-content: center; align-items: center;
                    position: relative; cursor: pointer;
                }
                .square.light { background-color: var(--light-square); }
                .square.dark { background-color: var(--dark-square); }
                .square.selected { background-color: var(--highlight) !important; }
                .square.last-move-highlight { background-color: var(--last-move-highlight) !important; }
                .piece {
                    user-select: none; cursor: grab; z-index: 1; position: relative;
                    font-size: 2.8em; font-family: "Arial Unicode MS", "Segoe UI Symbol";
                }
                .piece.draggable:hover { transform: scale(1.1); z-index: 2; }
                .piece.dragging { transform: scale(1.2); opacity: 0.8; z-index: 1000; cursor: grabbing; }
                .piece.not-draggable { cursor: default; }
                .square.highlight::after {
                    content: ''; position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30%; height: 30%; background-color: rgba(0,0,0,0.2);
                    border-radius: 50%; pointer-events: none;
                }
                .promotion-dialog {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: var(--dark-purple); border: 3px solid var(--gold-metallic);
                    padding: 10px; display: flex; z-index: 1000;
                }
                .promotion-option {
                    font-size: 2em; padding: 10px; cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .promotion-option:hover { background: var(--highlight); }
            </style>
            <div class="board"></div>
        `;
        this.boardElement = this.shadowRoot.querySelector('.board');
        this.mouseDownSquare = null;
        this.isDragging = false;
        this.createBoardElements();

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        document.addEventListener('mouseup', this.handleMouseUp);
        // document.addEventListener('mousemove', this.handleMouseMove); still worked with it
    }

    createBoardElements() {
        const files = 'abcdefgh'.split('');
        const ranks = '87654321'.split('');
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const squareId = files[f] + ranks[r];
                const square = document.createElement('div');
                square.id = squareId;
                square.classList.add('square', (f + r) % 2 !== 0 ? 'light' : 'dark');
                square.dataset.squareId = squareId;
                square.addEventListener('click', () => this.handleSquareClick(squareId));
                square.addEventListener('mouseup', () => this.handleSquareMouseUp(squareId));
                const pieceEl = document.createElement('div');
                pieceEl.classList.add('piece');
                pieceEl.addEventListener('click', e => {
                    e.stopPropagation();
                    this.handleSquareClick(squareId);
                });
                pieceEl.addEventListener('mousedown', e => this.handleMouseDown(e, squareId));
                square.appendChild(pieceEl);
                this.boardElement.appendChild(square);
            }
        }
    }

    render(boardState, selectedSquare, validMoves, turn, isCheck, lastMove) {
        const files = 'abcdefgh'.split('');
        const ranks = '87654321'.split('');
        Array.from(this.shadowRoot.querySelectorAll('.square')).forEach(square =>
            square.classList.remove('selected', 'highlight', 'last-move-highlight')
        );
        boardState.forEach((rankData, r) => {
            rankData.forEach((squareData, f) => {
                const squareId = files[f] + ranks[r];
                const square = this.shadowRoot.getElementById(squareId);
                const pieceEl = square.querySelector('.piece');
                if (pieceEl && squareData) {
                    pieceEl.textContent = PIECE_SYMBOLS[squareData.type];
                    pieceEl.style.color = squareData.color === 'w' ? 'white' : 'black';
                    pieceEl.classList.toggle('draggable', squareData.color === turn);
                    pieceEl.classList.toggle('not-draggable', squareData.color !== turn);
                } else if (pieceEl) {
                    pieceEl.textContent = '';
                }
                if (squareId === selectedSquare) square.classList.add('selected');
                if (validMoves && validMoves.includes(squareId)) square.classList.add('highlight');
            });
        });
        if (lastMove) {
            ['from', 'to'].forEach(key => {
                const sq = this.shadowRoot.getElementById(lastMove[key]);
                if (sq) sq.classList.add('last-move-highlight');
            });
        }
    }

    handleSquareClick(squareId) {
        this.dispatchEvent(new CustomEvent('square-click', { detail: { square: squareId } }));
    }

    handleMouseDown(e, squareId) {
        e.preventDefault();
        this.mouseDownSquare = squareId;
        this.isDragging = true;
        e.target.classList.add('dragging');
        this.dispatchEvent(new CustomEvent('piece-dragged', { detail: { square: squareId } }));
    }

    handleMouseUp() {
        if (!this.isDragging) return;
        const piece = this.shadowRoot.querySelector('.piece.dragging');
        if (piece) piece.classList.remove('dragging');
        this.isDragging = false;
    }

    handleSquareMouseUp(targetSquareId) {
        if (this.mouseDownSquare && this.mouseDownSquare !== targetSquareId) {
            this.dispatchEvent(new CustomEvent('piece-dropped', {
                detail: { from: this.mouseDownSquare, to: targetSquareId }
            }));
        }
        this.mouseDownSquare = null;
    }

    

    togglePromotionDialog(show, turn = 'w') {
        const existingDialog = this.shadowRoot.querySelector('.promotion-dialog');
        if (existingDialog) existingDialog.remove();
        if (show) {
            const dialog = document.createElement('div');
            dialog.classList.add('promotion-dialog');
            ['q', 'r', 'b', 'n'].forEach(piece => {
                const option = document.createElement('div');
                option.classList.add('promotion-option');
                const pieceChar = turn === 'w' ? piece.toUpperCase() : piece;
                option.textContent = PIECE_SYMBOLS[pieceChar];
                option.style.color = turn === 'w' ? 'white' : 'black';
                option.addEventListener('click', () => {
                    this.dispatchEvent(new CustomEvent('promotion-selected', { detail: { piece } }));
                });
                dialog.appendChild(option);
            });
            this.boardElement.appendChild(dialog);
        }
    }
}

customElements.define('chess-board', ChessBoard);
