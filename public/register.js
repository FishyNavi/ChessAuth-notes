import { setupChess } from './utils.js';
import './music-player.js';

document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector('chess-board');
    const form = document.getElementById('register-form');
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
        if (typeof board.render === 'function') {
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

        const username = usernameInput.value.trim();
        const pattern = notationDisplay.value.trim();
        const moveCount = parseInt(moveCountDisplay.textContent, 10);

        if (!username) {
            showMessage('Please enter a username.', 'error');
            return;
        }

        if (moveCount <= 20) {
            showMessage('Your password pattern must be more than 20 moves.', 'error');
            return;
        }

        if (!pattern) {
            showMessage('Please make at least one move for your pattern.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: pattern })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => window.location.href = '/login.html', 2000);
            } else {
                showMessage(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});