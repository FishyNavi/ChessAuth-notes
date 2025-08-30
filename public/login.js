import { setupChess } from './utils.js';
import './music-player.js';

document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector('chess-board');
    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const notationDisplay = document.getElementById('notation-display');
    const messageDiv = document.getElementById('message');
    const resetButton = document.getElementById('reset-board');
    const moveCountDisplay = document.getElementById('moveCount');
    let messageTimeout;

    function showMessage(text, cls) {
        messageDiv.textContent = text;
        messageDiv.className = cls;
        if (messageTimeout) clearTimeout(messageTimeout);
        if (cls === "error" || cls === "success") {
            messageTimeout = setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
            }, 5000);
        }
    }

    function updateUI(state) {
        if (board && typeof board.render === 'function') {
            board.render(
                state.boardState,
                state.selectedSquare,
                state.validMoves,
                state.turn,
                state.isCheck,
                state.lastMove
            );
        }
        notationDisplay.value = state.notation || '';
        if (moveCountDisplay) moveCountDisplay.textContent = state.moveCount ?? 0;
        if (state.isAwaitingPromotion) {
            board.togglePromotionDialog(true, state.turn);
        } else {
            board.togglePromotionDialog(false);
        }
    }

    const chessHandler = setupChess(board, updateUI);
    chessHandler.reset();

    usernameInput.addEventListener('input', () => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    });

    resetButton.addEventListener('click', () => {
        chessHandler.reset();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: notationDisplay.value.trim()
                })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Login successful!', 'success');
                window.location.href = '/home.html';
            } else {
                showMessage(result.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});
