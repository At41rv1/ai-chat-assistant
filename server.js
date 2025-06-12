// --- server.js ---

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
// IMPORTANT: Change this secret key to a long, random string for security!
const JWT_SECRET = '56787654323456784256728828263536627262627382626352551';
const GOOGLE_CLIENT_ID = '465923208288-hb4182d5ro58k30pkshh4knu3i62bvrh.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Middleware Setup ---
app.use(cors()); // Allows your Netlify site to talk to this server
app.use(express.json()); // Allows the server to read JSON data from requests

// --- Database Connection ---
const db = new sqlite3.Database('./chat_app.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the necessary tables if they don't already exist
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

// --- Authentication Middleware ---
// This function checks if a request has a valid JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Expects "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'A token is required for authentication' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user info from the token to the request object
    } catch (err) {
        return res.status(403).json({ message: 'Invalid Token' });
    }
    return next();
};

// This function checks if the logged-in user is an admin
const isAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires admin role.' });
    }
};


// --- API ROUTES ---

// --- Authentication Routes ---

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
                const userPayload = { id: currentUser.id, name: currentUser.name, picture: currentUser.picture, role: currentUser.role };
                const userToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
                res.json({ token: userToken, user: userPayload });
            };

            if (user) {
                // User already exists
                handleLogin(user);
            } else {
                // New user from Google
                const newUserId = `google-${google_id}`;
                db.run('INSERT INTO users (id, google_id, email, name, picture, role) VALUES (?, ?, ?, ?, ?, ?)', [newUserId, google_id, email, name, picture, role], function(err) {
                    if (err) return res.status(500).json({ message: 'Failed to create user' });
                    handleLogin({ id: newUserId, name, email, picture, role });
                });
            }
        });
    } catch (error) {
        res.status(400).json({ message: 'Invalid Google token' });
    }
});

// [POST] /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
        return res.status(400).json({ message: 'Username and a password of at least 6 characters are required.' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const id = `user-${Date.now()}`;

    db.run('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [id, username, password_hash, 'user'], function (err) {
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

// [POST] /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user || !user.password_hash) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }
        const userPayload = { id: user.id, username: user.username, role: user.role };
        const userToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token: userToken, user: userPayload });
    });
});


// --- Chat Routes ---

// [POST] /api/chats - Save chat messages to the database
app.post('/api/chats', verifyToken, (req, res) => {
    const { messages } = req.body; // Expecting an array of messages
    const userId = req.user.id; // Get user ID from the verified token

    const stmt = db.prepare('INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)');
    messages.forEach(msg => {
        stmt.run(userId, msg.role, msg.content);
    });
    stmt.finalize((err) => {
        if (err) return res.status(500).json({ message: 'Failed to save chat history.' });
        res.status(201).json({ message: 'Chat history saved successfully.' });
    });
});


// --- Admin Routes (Protected by two layers of middleware) ---

// [GET] /api/admin/users
app.get('/api/admin/users', verifyToken, isAdmin, (req, res) => {
    db.all('SELECT id, name, username, email, picture, role, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error fetching users.' });
        res.json(rows);
    });
});

// [GET] /api/admin/chats/:userId
app.get('/api/admin/chats/:userId', verifyToken, isAdmin, (req, res) => {
    const { userId } = req.params;
    db.all('SELECT role, content, timestamp FROM messages WHERE user_id = ? ORDER BY timestamp ASC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching user's chat history." });
        res.json(rows);
    });
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
