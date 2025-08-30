import './music-player.js';

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMsg = document.getElementById('welcome-message');
    const noteForm = document.getElementById('note-form');
    const noteContentInput = document.getElementById('note-content');
    const noteTagSelect = document.getElementById('note-tag-select');
    const notesList = document.getElementById('notes-list');
    const messageDiv = document.getElementById('message');
    const searchInput = document.getElementById('note-search');
    const tagFilterSelect = document.getElementById('tag-filter-select');
    
    let notes = [];
    let filterTag = '';
    let searchQuery = '';
    let messageTimeout;

    function showMessage(text, cls) {
        messageDiv.textContent = text;
        messageDiv.className = cls;
        if (messageTimeout) clearTimeout(messageTimeout);
        if (cls === "error" || cls === "success") {
            messageTimeout = setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
            }, 4000);
        }
    }

    async function checkSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            if (!data.loggedIn) window.location.href = '/login.html';
            else welcomeMsg.textContent = `Welcome, ${data.username}!`;
        } catch (error) {
            console.error('Session check failed:', error);
            window.location.href = '/login.html';
        }
    }

    async function loadNotes() {
        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            if (data.success) {
                notes = data.notes;
                renderNotes();
            } else {
                showMessage("Could not load notes.", "error");
            }
        } catch (error) {
            showMessage("Could not load notes.", "error");
        }
    }

    function renderNotes() {
        const filteredNotes = notes.filter(note => {
            const matchesTag = filterTag === '' || note.tag === filterTag;
            const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTag && matchesSearch;
        });

        notesList.innerHTML = '';
        if (filteredNotes.length === 0) {
            notesList.innerHTML = `<p style="text-align: center; color: #666;">No notes found.</p>`;
            return;
        }
        filteredNotes.forEach(note => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <div class="note-content">${note.content}</div>
                <div class="note-meta">
                    <span>${new Date(note.created_at).toLocaleDateString()}</span>
                    <span class="tag tag-${note.tag}">${note.tag}</span>
                    <div class="actions">
                        <button class="edit-btn">Edit</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
            `;
            noteDiv.querySelector('.edit-btn').onclick = () => editNote(note.id, noteDiv, note.content, note.tag);
            noteDiv.querySelector('.delete-btn').onclick = () => deleteNote(note.id);
            notesList.appendChild(noteDiv);
        });
    }

    noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = noteContentInput.value;
        const tag = noteTagSelect.value;
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, tag })
            });
            const data = await response.json();
            if (data.success) {
                noteContentInput.value = '';
                noteTagSelect.value = 'none';
                await loadNotes();
                showMessage("Note saved!", "success");
            } else {
                showMessage("Could not save note.", "error");
            }
        } catch {
            showMessage("Could not save note.", "error");
        }
    });

    function editNote(id, noteDiv, oldContent, oldTag) {
        const contentDiv = noteDiv.querySelector('.note-content');
        const metaDiv = noteDiv.querySelector('.note-meta');

        contentDiv.innerHTML = `<textarea class="edit-textarea">${oldContent}</textarea>`;
        metaDiv.innerHTML = `
            <select class="edit-tag-select">
                <option value="none">None</option>
                <option value="important">Important</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="idea">Idea</option>
                <option value="todo">ToDo</option>
            </select>
            <div class="actions">
                <button class="save-edit">Save</button>
                <button class="cancel-edit delete-btn">Cancel</button>
            </div>
        `;
        const tagSelect = noteDiv.querySelector('.edit-tag-select');
        tagSelect.value = oldTag;

        noteDiv.querySelector('.save-edit').onclick = async () => {
            const newContent = noteDiv.querySelector('.edit-textarea').value;
            const newTag = noteDiv.querySelector('.edit-tag-select').value;
            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: newContent, tag: newTag })
                });
                const data = await response.json();
                if (data.success) {
                    await loadNotes();
                    showMessage("Note updated!", "success");
                } else {
                    showMessage("Could not update note.", "error");
                }
            } catch {
                showMessage("Could not update note.", "error");
            }
        };
        noteDiv.querySelector('.cancel-edit').onclick = () => loadNotes();
    }

    async function deleteNote(id) {
        try {
            const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                await loadNotes();
                showMessage("Note deleted!", "success");
            } else {
                showMessage("Could not delete note.", "error");
            }
        } catch {
            showMessage("Could not delete note.", "error");
        }
    }

    searchInput.oninput = () => {
        searchQuery = searchInput.value;
        renderNotes();
    };
    tagFilterSelect.onchange = () => {
        filterTag = tagFilterSelect.value;
        renderNotes();
    };

    checkSession();
    loadNotes();
});
