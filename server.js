// --- server.js (Upgraded) ---
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = '528927342667872763787278625518900888776362'; // Replace with a strong, secret key from your environment variables
const GOOGLE_CLIENT_ID = '465923208288-hb4182d5ro58k30pkshh4knu3i62bvrh.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// --- Database Setup ---
const db = new sqlite3.Database('./chat_app.db', (err) => {
    if (err) return console.error('Error opening database', err.message);
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
        // User table with role management
        db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, username TEXT UNIQUE, password_hash TEXT, google_id TEXT, picture TEXT, name TEXT, role TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        
        // Messages table linked to users
        db.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))`);
    });
});

// --- Middleware ---

// Middleware to verify JWT for protected routes
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'A token is required for authentication' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid Token' });
    }
};

// Middleware to check for admin role
const isAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Requires admin role.' });
    }
};

// --- Authentication Routes ---

// [POST] /api/auth/google - Handles Google Sign-In
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { sub: google_id, email, name, picture } = ticket.getPayload();
        
        // Assign 'admin' role if the email matches
        const role = email === 'at41rv@gmail.com' ? 'admin' : 'user';

        db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, user) => {
            if (err) return res.status(500).json({ message: 'Database error while searching for user.' });

            const handleLogin = (currentUser) => {
                const userPayload = { id: currentUser.id, name: currentUser.name, picture: currentUser.picture, role: currentUser.role };
                const userToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
                res.json({ token: userToken, user: userPayload });
            };

            if (user) { 
                handleLogin(user); 
            } else {
                // Create a new user if they don't exist
                const newUserId = `google-${google_id}`;
                db.run('INSERT INTO users (id, google_id, email, name, picture, role) VALUES (?, ?, ?, ?, ?, ?)', [newUserId, google_id, email, name, picture, role], function (err) {
                    if (err) return res.status(500).json({ message: 'Failed to create new user in database.' });
                    handleLogin({ id: newUserId, name, email, picture, role });
                });
            }
        });
    } catch (error) { 
        res.status(400).json({ message: 'Invalid Google token. Please try again.' }); 
    }
});

// [POST] /api/auth/signup - Handles new user registration with username/password
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
                : res.status(500).json({ message: 'Database error during signup.' });
        }
        const newUser = { id, username, role: 'user' };
        const userToken = jwt.sign(newUser, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token: userToken, user: newUser });
    });
});

// [POST] /api/auth/login - Handles login for existing username/password users
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user || !user.password_hash) {
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


// --- Chat History Route ---

// [POST] /api/chats - Save chat messages to the database
app.post('/api/chats', verifyToken, (req, res) => {
    const { messages } = req.body;
    const userId = req.user.id;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Invalid messages format.'});
    }

    const stmt = db.prepare('INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)');
    messages.forEach(msg => stmt.run(userId, msg.role, msg.content));
    
    stmt.finalize((err) => {
        if (err) return res.status(500).json({ message: 'Failed to save chat history.' });
        res.status(201).json({ message: 'Chat history saved successfully.' });
    });
});


// --- Admin Routes ---

// [GET] /api/admin/dashboard - Get all stats and users in one call
app.get('/api/admin/dashboard', verifyToken, isAdmin, (req, res) => {
    const dashboardData = { stats: {}, users: [] };
    const queries = [
        db.get.bind(db, 'SELECT COUNT(*) as count FROM users', []),
        db.get.bind(db, 'SELECT COUNT(*) as count FROM messages', []),
        db.get.bind(db, "SELECT COUNT(*) as count FROM users WHERE google_id IS NOT NULL", []),
        db.get.bind(db, "SELECT COUNT(*) as count FROM users WHERE google_id IS NULL", []),
        db.all.bind(db, 'SELECT id, name, username, email, picture, role, created_at FROM users ORDER BY created_at DESC', [])
    ];

    Promise.all(queries.map(q => new Promise((resolve, reject) => q((err, row) => err ? reject(err) : resolve(row)))))
        .then(results => {
            dashboardData.stats.totalUsers = results[0].count;
            dashboardData.stats.totalMessages = results[1].count;
            dashboardData.stats.googleUsers = results[2].count;
            dashboardData.stats.usernameUsers = results[3].count;
            dashboardData.users = results[4];
            res.json(dashboardData);
        })
        .catch(err => res.status(500).json({ message: 'Error fetching dashboard data.', error: err.message }));
});


// [GET] /api/admin/chats/:userId - Get a specific user's chat history
app.get('/api/admin/chats/:userId', verifyToken, isAdmin, (req, res) => {
    const { userId } = req.params;
    db.all('SELECT role, content, timestamp FROM messages WHERE user_id = ? ORDER BY timestamp ASC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching user's chat history." });
        res.json(rows);
    });
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
