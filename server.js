// --- server.js ---

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt =require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_super_secret_key_that_is_long_and_random'; // IMPORTANT: Change this!
const GOOGLE_CLIENT_ID = '465923208288-hb4182d5ro58k30pkshh4knu3i62bvrh.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./chat_app.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                username TEXT UNIQUE,
                password_hash TEXT,
                google_id TEXT,
                picture TEXT,
                name TEXT,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
        });
    }
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'A token is required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(403).json({ message: 'Invalid Token' });
    }
    return next();
};

const isAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') next();
    else res.status(403).json({ message: 'Requires admin role' });
};

// --- AUTHENTICATION ROUTES ---

// [POST] /api/auth/google
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { sub: google_id, email, name, picture } = ticket.getPayload();
        const role = email === 'at41rv@gmail.com' ? 'admin' : 'user';

        db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, user) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            const handleLogin = (currentUser) => {
                const userToken = jwt.sign({ id: currentUser.id, name: currentUser.name, role: currentUser.role }, JWT_SECRET, { expiresIn: '24h' });
                res.json({ token: userToken, user: currentUser });
            };

            if (user) {
                handleLogin(user);
            } else {
                const newUserId = `google-${google_id}`;
                db.run('INSERT INTO users (id, google_id, email, name, picture, role) VALUES (?, ?, ?, ?, ?, ?)', [newUserId, google_id, email, name, picture, role], function(err) {
                    if (err) return res.status(500).json({ message: 'Failed to create user' });
                    const newUser = { id: newUserId, name, email, picture, role };
                    handleLogin(newUser);
                });
            }
        });
    } catch (error) {
        res.status(400).json({ message: 'Invalid Google token' });
    }
});

// [POST] /api/auth/signup (NEW)
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
        return res.status(400).json({ message: 'Username and a password of at least 6 characters are required.' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const id = `user-${Date.now()}`;

    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [id, username, password_hash], function (err) {
        if (err) {
            return err.message.includes('UNIQUE')
                ? res.status(409).json({ message: 'Username already taken.' })
                : res.status(500).json({ message: 'Database error.' });
        }
        const newUser = { id, username, role: 'user' };
        const userToken = jwt.sign(newUser, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token: userToken, user: newUser });
    });
});

// [POST] /api/auth/login (NEW)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const userPayload = { id: user.id, username: user.username, role: user.role };
        const userToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token: userToken, user: userPayload });
    });
});

// All other routes for chat and admin remain the same.

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
