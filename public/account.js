import { setupChess } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMsg = document.getElementById('welcome-message');
    const messageDiv = document.getElementById('message');
    const notationDisplay = document.getElementById('notation-display');
    const board = document.querySelector('chess-board');
    const moveCountDisplay = document.getElementById('moveCount');
    const accountUpdateForm = document.getElementById('account-update-form');
    const newUsernameInput = document.getElementById('new-username');
    const currentUsernameInput = document.getElementById('current-username');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const resetButton = document.getElementById('reset-board');
    const confirmModal = document.getElementById('confirmation-modal');
    const confirmText = document.getElementById('confirm-text');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    const confirmChecks = [
        document.getElementById('confirm-check1'),
        document.getElementById('confirm-check2'),
        document.getElementById('confirm-check3'),
        document.getElementById('confirm-check4'),
        document.getElementById('confirm-check5'),
        document.getElementById('confirm-check6'),
        document.getElementById('confirm-check7'),
        document.getElementById('confirm-check8'),
        document.getElementById('confirm-check9'),
        document.getElementById('confirm-check10')
    ];

    let chessHandler;
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

    // Function to check and update session status
    async function checkSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            if (data.loggedIn) {
                welcomeMsg.textContent = `Welcome, ${data.username}!`;
                currentUsernameInput.value = data.username;
            } else {
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Session check failed:', error);
            window.location.href = '/login.html';
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

    chessHandler = setupChess(board, updateUI);
    chessHandler.reset();

    resetButton.addEventListener('click', () => {
        chessHandler.reset();
    });

    accountUpdateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newUsername = newUsernameInput.value.trim();
        const newPassword = notationDisplay.value.trim();
        const newMoveCount = parseInt(moveCountDisplay.textContent, 10);

        // Check if both fields are empty. If so, do nothing.
        if (!newUsername && !newPassword) {
            showMessage('Please enter a new username or a new password pattern.', 'error');
            return;
        }
        
        // If a new password is being set, validate its length with the move count
        if (newPassword && newMoveCount < 20) {
            showMessage('Your new password pattern must be at least 20 moves long.', 'error');
            return;
        }

        const updates = {};
        if (newUsername) updates.newUsername = newUsername;
        if (newPassword) updates.newPassword = newPassword;

        try {
            const response = await fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message || 'Account updated successfully!', 'success');
                if (newUsername) {
                    welcomeMsg.textContent = `Welcome, ${newUsername}!`;
                    currentUsernameInput.value = newUsername;
                }
            } else {
                showMessage(result.message || 'Account update failed.', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
    
    // Function to update the state of the confirmation button
    function updateConfirmButtonState() {
        confirmYesBtn.disabled = !confirmChecks.every(cb => cb.checked);
    }

    
    confirmNoBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    confirmYesBtn.addEventListener('click', async () => {
        confirmModal.style.display = 'none';
        try {
            const response = await fetch('/api/account', { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showMessage('Account deleted successfully.', 'success');
                setTimeout(() => window.location.href = '/login.html', 2000);
            } else {
                showMessage(result.message, 'error');
            }
        } catch {
            showMessage('An error occurred. Please try again.', 'error');
        }
    });

    confirmChecks.forEach(cb => cb.addEventListener('change', updateConfirmButtonState));

    deleteAccountBtn.addEventListener('click', () => {
        confirmModal.style.display = 'flex';
        confirmText.textContent = "Are you sure you want to delete your account? This action cannot be undone.";
        confirmChecks.forEach(cb => cb.checked = false);
        updateConfirmButtonState();
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    checkSession();
});