// Utility to initialize chess board and handler with event bindings

import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';
import { ChessHandler } from './chess-handler.js';
import './chess-board.js';

export function setupChess(board, updateUI) {
    const chessHandler = new ChessHandler(Chess, updateUI);

    board.addEventListener('square-click', e => chessHandler.handleSquareClick(e.detail.square));
    board.addEventListener('piece-dragged', e => chessHandler.handlePieceDrag(e.detail.square));
    board.addEventListener('piece-dropped', e => chessHandler.handleDragDrop(e.detail.from, e.detail.to));
    board.addEventListener('promotion-selected', e => chessHandler.handlePromotion(e.detail.piece));

    return chessHandler;
}
