export class ChessHandler {
    constructor(Chess, onUpdate) {
        this.Chess = Chess;
        this.onUpdate = onUpdate;
        this.moveAudio = new Audio('move.mp3');
        this.captureAudio = new Audio('capture.mp3');
        this.checkAudio = new Audio('check.mp3');
        this.castleAudio = new Audio('move.mp3'); 
        this.promotionAudio = new Audio('move.mp3');
        this.gameOverAudio = new Audio('game_end.mp3');

        this.moveAudio.onerror = () => console.error("Could not load move.mp3");
        this.captureAudio.onerror = () => console.error("Could not load capture.mp3");
        this.checkAudio.onerror = () => console.error("Could not load check.mp3");
        this.castleAudio.onerror = () => console.error("Could not load castle sound");
        this.promotionAudio.onerror = () => console.error("Could not load promotion sound");
        this.gameOverAudio.onerror = () => console.error("Could not load game_end.mp3");
    }

    reset() {
        this.chess = new this.Chess();
        this.selectedSquare = null;
        this.validMoves = [];
        this.promotionMove = null;
        this.moveHistory = [];
        this.lastMove = null;
        this.update();
    }

    handleSquareClick(squareId) {
        if (this.selectedSquare) {
            // Check for promotion condition before making a move
            const piece = this.chess.get(this.selectedSquare);
            if (piece && piece.type === 'p' && (squareId[1] === '8' || squareId[1] === '1')) {
                this.promotionMove = { from: this.selectedSquare, to: squareId };
                this.update();
            } else {
                this.makeMove(this.selectedSquare, squareId);
                this.selectedSquare = null;
                this.validMoves = [];
            }
        } else {
            const piece = this.chess.get(squareId);
            if (piece && piece.color === this.chess.turn()) {
                this.selectedSquare = squareId;
                this.validMoves = this.chess.moves({ square: squareId, verbose: true }).map(m => m.to);
            } else {
                this.selectedSquare = null;
                this.validMoves = [];
            }
        }
        this.update();
    }
    
    handlePieceDrag(squareId) {
        const piece = this.chess.get(squareId);
        if (piece && piece.color === this.chess.turn()) {
            this.selectedSquare = squareId;
            this.validMoves = this.chess.moves({ square: squareId, verbose: true }).map(m => m.to);
            this.update();
        }
    }

    handleDragDrop(from, to) {
        const piece = this.chess.get(from);
        if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
            this.promotionMove = { from, to };
        } else {
            this.makeMove(from, to);
        }
        this.selectedSquare = null;
        this.validMoves = [];
        this.update();
    }
    
    handlePromotion(piece) {
        if (this.promotionMove) {
            this.makeMove(this.promotionMove.from, this.promotionMove.to, piece);
            this.promotionMove = null;
            this.update();
        }
    }

    makeMove(from, to, promotionPiece) {
        let move = null;
        try {
            move = this.chess.move({ from, to, promotion: promotionPiece });
        } catch (error) {
            console.error("Illegal move attempt:", error.message);
        }

        if (move) {
            this.moveHistory.push(move);
            this.lastMove = { from: move.from, to: move.to };
            this.playMoveSound(move);
        }
    }

    playMoveSound(move) {
        if (this.isGameOver()) {
            this.gameOverAudio.play().catch(e => console.error("Audio playback failed:", e));
        } else if (this.chess.inCheck()) {
            this.checkAudio.play().catch(e => console.error("Audio playback failed:", e));
        } else if (move.flags.includes('c')) {
            this.captureAudio.play().catch(e => console.error("Audio playback failed:", e));
        } else {
            this.moveAudio.play().catch(e => console.error("Audio playback failed:", e));
        }
    }

    getGameStateFlags() {
        return {
            checkmate: this.chess.isCheckmate(),
            stalemate: this.chess.isStalemate(),
            threefoldRepetition: this.chess.isThreefoldRepetition(),
            insufficientMaterial: this.chess.isInsufficientMaterial(),
            draw: this.chess.isDraw(),
        };
    }

    isGameOver() {
        return this.chess.isGameOver();
    }

    getKingPositions() {
        const positions = {};
        const board = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = board[r][c];
                if (square && square.type === 'k') {
                    positions[square.color] = square.square;
                }
            }
        }
        return positions;
    }

    update() {
        if (this.onUpdate) {
            this.onUpdate({
                boardState: this.chess.board(),
                selectedSquare: this.selectedSquare,
                validMoves: this.validMoves,
                notation: this.getNotationString(),
                turn: this.chess.turn(),
                isAwaitingPromotion: !!this.promotionMove,
                moveCount: this.moveHistory.length,
                gameStatus: this.getGameStatus(),
                isGameOver: this.isGameOver(),
                gameStateFlags: this.getGameStateFlags(),
                kingPositions: this.getKingPositions(),
                isCheck: this.chess.inCheck(),
                lastMove: this.lastMove
            });
        }
    }
    
    getNotationString() {
        return this.chess.history().join(' ');
    }
    
    getGameStatus() {
        if (this.chess.isCheckmate()) {
            return 'Checkmate!';
        } else if (this.chess.isStalemate()) {
            return 'Stalemate!';
        } else if (this.chess.isThreefoldRepetition()) {
            return 'Threefold repetition!';
        } else if (this.chess.isInsufficientMaterial()) {
            return 'Insufficient material!';
        } else if (this.chess.isDraw()) {
            return 'Draw!';
        } else if (this.chess.inCheck()) {
            return 'Check!';
        } else {
            return '';
        }
    }
}