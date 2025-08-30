/**
 * ChessNotes Server
 * ----------------------------------------
 * Express.js server with SQLite backend.
 * Handles authentication (username + chess pattern),
 * note CRUD (with tags), session management, and music playlist API.
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security check for session secret
if (!process.env.SESSION_SECRET) {
    console.error('FATAL ERROR: SESSION_SECRET is not defined in the .env file.');
    process.exit(1);
}

const app = express();
const port = 3000;
const minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH, 10) || 8;

// Initialize DB and create tables
const db = new sqlite3.Database('./chessnotes.db', (err) => {
    if (err) console.error("Database connection error:", err);
    else console.log("Connected to database");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        tag TEXT DEFAULT 'none',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
});

// Use Helmet to set security-related HTTP headers
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}

// Rate limiter middleware for login route
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts from this IP, please try again after 15 minutes"
});

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < minPasswordLength) {
        return res.status(400).json({ success: false, message: `Username and password (min ${minPasswordLength} chars) required.` });
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash], function(err) {
            if (err) {
                console.error('Error during user registration:', err);
                return res.status(500).json({ success: false, message: 'Failed to register user.' });
            }
            res.json({ success: true, message: 'Registration successful.' });
        });
    } catch (err) {
        console.error('Error hashing password:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required.' });
    }
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Error fetching user during login:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true, message: 'Login successful.' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session on logout:', err);
            return res.status(500).json({ success: false, message: 'Logout failed.' });
        }
        res.json({ success: true });
    });
});

app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- Account Management ---
app.put('/api/account', requireLogin, async (req, res) => {
    const { newUsername, newPassword } = req.body;
    const userId = req.session.userId;
    if (!newUsername && !newPassword) {
        return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    if (newPassword) {
        if (newPassword.length < minPasswordLength) {
            return res.status(400).json({ success: false, message: `New password must be at least ${minPasswordLength} characters.` });
        }
        try {
            const newPassword_hash = await bcrypt.hash(newPassword, 10);
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword_hash, userId], function(err) {
                if (err) {
                    console.error('Error updating password:', err);
                    return res.status(500).json({ success: false, message: 'Server error updating password.' });
                }
                // On success, respond after the update completes
                res.json({ success: true, message: 'Account updated successfully.' });
            });
        } catch (err) {
            console.error('Error hashing new password:', err);
            return res.status(500).json({ success: false, message: 'Server error updating password.' });
        }
    }

    if (newUsername) {
        db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], (err) => {
            if (err) {
                console.error('Error updating username:', err);
                return res.status(400).json({ success: false, message: 'Username already taken.' });
            }
            req.session.username = newUsername;
            res.json({ success: true, message: 'Account updated successfully.' });
        });
    }
});

app.delete('/api/account', requireLogin, (req, res) => {
    const userId = req.session.userId;
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            console.error('Error deleting account:', err);
            return res.status(500).json({ success: false, message: 'Failed to delete account.' });
        }
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Account not found.' });
        req.session.destroy(destroyErr => {
            if (destroyErr) {
                console.error('Error destroying session after account deletion:', destroyErr);
            }
            res.json({ success: true, message: 'Account deleted.' });
        });
    });
});

// --- Notes ---
app.get('/api/notes', requireLogin, (req, res) => {
    db.all('SELECT id, content, tag, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId], (err, notes) => {
        if (err) {
            console.error('Error retrieving notes:', err);
            return res.status(500).json({ success: false, message: 'Failed to retrieve notes.' });
        }
        res.json({ success: true, notes });
    });
});

app.post('/api/notes', requireLogin, (req, res) => {
    let { content, tag } = req.body;
    content = typeof content === 'string' ? content.trim() : '';
    tag = typeof tag === 'string' ? tag.trim() : 'none';
    if (!content) return res.status(400).json({ success: false, message: 'Note content required.' });
    db.run(
        'INSERT INTO notes (user_id, content, tag) VALUES (?, ?, ?)',
        [req.session.userId, content, tag || 'none'],
        function (err) {
            if (err) {
                console.error('Error saving note:', err);
                return res.status(500).json({ success: false, message: 'Failed to save note.' });
            }
            db.get('SELECT id, content, tag, created_at FROM notes WHERE id = ?', [this.lastID], (err, note) => {
                if (err) {
                    console.error('Error fetching newly added note:', err);
                    return res.status(500).json({ success: false, message: 'Note added but failed to fetch.' });
                }
                if (!note) {
                    return res.status(500).json({ success: false, message: 'Note added but not found.' });
                }
                res.json({ success: true, note });
            });
        }
    );
});

app.put('/api/notes/:id', requireLogin, (req, res) => {
    const noteId = req.params.id;
    let { content, tag } = req.body;
    content = typeof content === 'string' ? content.trim() : '';
    tag = typeof tag === 'string' ? tag.trim() : 'none';
    if (!content) return res.status(400).json({ success: false, message: 'Note content required.' });
    db.run(
        'UPDATE notes SET content = ?, tag = ? WHERE id = ? AND user_id = ?',
        [content, tag || 'none', noteId, req.session.userId],
        function (err) {
            if (err) {
                console.error('Error updating note:', err);
                return res.status(500).json({ success: false, message: 'Failed to update note.' });
            }
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Note not found or you do not have permission to edit it.' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/notes/:id', requireLogin, (req, res) => {
    const userId = req.session.userId;
    const noteId = req.params.id;
    db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId], function(err) {
        if (err) {
            console.error('Error deleting note:', err);
            return res.status(500).json({ success: false, message: 'Failed to delete note.' });
        }
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Note not found or you do not have permission to delete it.' });
        res.json({ success: true });
    });
});

// --- Music Playlist API ---
app.get('/api/music', (req, res) => {
    const musicDir = path.join(__dirname, 'public', 'music');
    fs.access(musicDir, fs.constants.F_OK, (accessErr) => {
        if (accessErr) {
            fs.mkdir(musicDir, { recursive: true }, (mkdirErr) => {
                if (mkdirErr) {
                    console.error('Error creating music directory:', mkdirErr);
                    return res.status(500).json({ success: false, message: 'Music directory missing and could not be created.' });
                }
                return res.json([]);
            });
        } else {
            fs.readdir(musicDir, (err, files) => {
                if (err) {
                    console.error('Error reading music directory:', err);
                    return res.status(500).json({ success: false, message: 'Server error retrieving playlist.' });
                }
                const playlist = files
                    .filter(file => /\.(mp3|wav|ogg|m4a)$/i.test(file))
                    .map(file => `/music/${file}`);
                res.json(playlist);
            });
        }
    });
});

// --- Static Pages ---
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/home.html');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/home.html', (req, res) => {
    if (!req.session.userId) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something broke!' });
});

const host = '0.0.0.0';
app.listen(process.env.PORT || port, host, () => {
    console.log(`ChessNotes server running at http://localhost:${process.env.PORT || port}`);
});