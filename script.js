// --- script.js (Upgraded) ---
class AIChat {
    constructor() {
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.isLoginMode = false;
        this.isSidebarOpen = false;
        this.apiServerUrl = 'https://your-backend-name.onrender.com'; // IMPORTANT: Set your Render URL
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkSession();
    }

    initializeElements() {
        // Views
        this.loginScreen = document.getElementById('loginScreen');
        this.chatInterface = document.getElementById('chatInterface');
        this.adminPanel = document.getElementById('adminPanel');

        // Auth
        this.loginTitle = document.getElementById('loginTitle');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
        this.confirmPasswordInput = document.getElementById('confirmPasswordInput');
        this.authError = document.getElementById('authError');
        this.authButton = document.getElementById('authButton');
        this.authToggle = document.getElementById('authToggle');
        
        // Chat UI
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatButton = document.getElementById('newChatButton');
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.logoutButton = document.getElementById('logoutButton');
        this.adminNavButton = document.getElementById('adminNavButton');
        this.modelSelector = document.getElementById('modelSelector');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');

        // Admin Panel
        this.closeAdminPanel = document.getElementById('closeAdminPanel');
        this.totalUsersStat = document.getElementById('totalUsersStat');
        this.totalMessagesStat = document.getElementById('totalMessagesStat');
        this.googleUsersStat = document.getElementById('googleUsersStat');
        this.usernameUsersStat = document.getElementById('usernameUsersStat');
        this.userSearchInput = document.getElementById('userSearchInput');
        this.userTableBody = document.getElementById('userTableBody');
        this.adminChatView = document.getElementById('adminChatView');
        this.allUsers = []; // To store users for searching
    }

    attachEventListeners() {
        // Auth
        this.authButton.addEventListener('click', () => this.handleAuthFormSubmit());
        this.authToggle.addEventListener('click', (e) => { e.preventDefault(); this.toggleAuthMode(); });

        // Main UI
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.logoutButton.addEventListener('click', () => this.logout());
        this.newChatButton.addEventListener('click', () => this.resetChat());
        this.adminNavButton.addEventListener('click', () => this.showAdminPanel());

        // Chat Input
        this.messageInput.addEventListener('input', () => this.onInput());
        this.messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }});
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Admin
        this.closeAdminPanel.addEventListener('click', () => this.showView('chatInterface'));
        this.userSearchInput.addEventListener('input', () => this.renderUserList());
    }

    showView(viewName) {
        ['loginScreen', 'chatInterface', 'adminPanel'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(viewName).classList.remove('hidden');
    }

    // --- Auth & Session ---
    async checkSession() {
        const token = localStorage.getItem('jwtToken');
        const user = localStorage.getItem('aiChatCurrentUser');
        if (token && user) {
            this.jwtToken = token;
            this.currentUser = JSON.parse(user);
            this.isAdmin = this.currentUser.role === 'admin';
            this.showView('chatInterface');
            this.updateUserInfo();
        } else {
            this.showView('loginScreen');
            this.toggleAuthMode(true);
        }
    }
    
    loginSuccess(data) {
        this.jwtToken = data.token;
        this.currentUser = data.user;
        this.isAdmin = data.user.role === 'admin';
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('aiChatCurrentUser', JSON.stringify(data.user));
        this.showView('chatInterface');
        this.updateUserInfo();
    }
    
    logout() {
        localStorage.clear();
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.showView('loginScreen');
    }
    
    updateUserInfo() {
        if (!this.currentUser) return;
        const displayName = this.currentUser.name || this.currentUser.username;
        this.userName.textContent = displayName;
        this.userAvatar.innerHTML = ''; // Clear previous
        if (this.currentUser.picture) {
            const img = document.createElement('img');
            img.src = this.currentUser.picture;
            img.className = 'avatar';
            this.userAvatar.appendChild(img);
        } else {
            this.userAvatar.className = 'avatar-fallback';
            this.userAvatar.textContent = displayName.charAt(0).toUpperCase();
        }
        this.adminNavButton.classList.toggle('hidden', !this.isAdmin);
    }
    
    // --- Chat Logic ---
    onInput() {
        const input = this.messageInput;
        input.style.height = 'auto';
        input.style.height = `${input.scrollHeight}px`;
        this.sendButton.classList.toggle('active', input.value.trim().length > 0);
    }

    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (!this.sendButton.classList.contains('active')) return;
        this.addMessage(messageText, 'user');
        this.messageInput.value = '';
        this.onInput();
        
        // Fetch AI response
        // const aiResponse = await this.callAIAPI(messageText);
        // this.addMessage(aiResponse, 'ai');
        // await this.saveConversationToServer([{role: 'user', content: messageText}, {role: 'assistant', content: aiResponse}]);
    }
    
    addMessage(text, role) { /* ... Same as previous version ... */ }
    resetChat() { /* ... Same as previous version ... */ }
    
    // --- Admin Panel Logic ---
    async showAdminPanel() {
        if (!this.isAdmin) return;
        this.showView('adminPanel');
        try {
            const response = await fetch(`${this.apiServerUrl}/api/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${this.jwtToken}` }
            });
            if (!response.ok) throw new Error('Failed to load dashboard data.');
            const data = await response.json();
            
            // Populate stats
            this.totalUsersStat.textContent = data.stats.totalUsers;
            this.totalMessagesStat.textContent = data.stats.totalMessages;
            this.googleUsersStat.textContent = data.stats.googleUsers;
            this.usernameUsersStat.textContent = data.stats.usernameUsers;
            
            // Populate user list
            this.allUsers = data.users;
            this.renderUserList();
        } catch (error) {
            alert(error.message);
        }
    }

    renderUserList() {
        const searchTerm = this.userSearchInput.value.toLowerCase();
        const filteredUsers = this.allUsers.filter(user => {
            const name = (user.name || user.username || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(searchTerm) || email.includes(searchTerm);
        });

        this.userTableBody.innerHTML = '';
        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            tr.dataset.userId = user.id;

            const userCell = document.createElement('td');
            userCell.className = 'user-info-cell';
            userCell.innerHTML = `
                <div class="avatar-fallback">${(user.name || user.username).charAt(0).toUpperCase()}</div>
                <div>
                    <div class="name">${user.name || user.username}</div>
                    <div class="email">${user.email || 'N/A'}</div>
                </div>`;
            
            const typeCell = document.createElement('td');
            typeCell.textContent = user.google_id ? 'Google' : 'Username';
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(user.created_at).toLocaleDateString();

            tr.appendChild(userCell);
            tr.appendChild(typeCell);
            tr.appendChild(dateCell);

            tr.addEventListener('click', () => {
                this.userTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
                tr.classList.add('selected');
                this.displayUserHistory(user.id);
            });
            this.userTableBody.appendChild(tr);
        });
    }

    async displayUserHistory(userId) {
        this.adminChatView.innerHTML = `<p class="placeholder">Loading history...</p>`;
        try {
            const response = await fetch(`${this.apiServerUrl}/api/admin/chats/${userId}`, {
                headers: { 'Authorization': `Bearer ${this.jwtToken}` }
            });
            if (!response.ok) throw new Error('Failed to load chat history.');
            const history = await response.json();
            
            this.adminChatView.innerHTML = '';
            if (history.length === 0) {
                this.adminChatView.innerHTML = `<p class="placeholder">No chat history found for this user.</p>`;
                return;
            }
            history.forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `message-wrapper ${msg.role}-message-wrapper`;
                msgDiv.innerHTML = `<div class="message ${msg.role}-message"><div class="content">${msg.content}</div></div>`;
                this.adminChatView.appendChild(msgDiv);
            });
        } catch (error) {
            this.adminChatView.innerHTML = `<p class="placeholder" style="color:red;">${error.message}</p>`;
        }
    }

    // --- Unchanged Methods ---
    toggleSidebar() { this.sidebar.classList.toggle('active'); }
    handleAuthFormSubmit() { /* ... Paste from previous version ... */ }
    toggleAuthMode(isLogin = !this.isLoginMode) { /* ... Paste from previous version ... */ }
}

// Global scope functions
function handleGoogleResponse(response) { if (window.aiChat) window.aiChat.handleGoogleLogin(response); }
AIChat.prototype.handleGoogleLogin = async function(response) { /* ... Paste from previous version ... */ };

document.addEventListener('DOMContentLoaded', () => { window.aiChat = new AIChat(); });

// Fill in unchanged methods
AIChat.prototype.toggleAuthMode = function(isLogin = !this.isLoginMode) {
    this.isLoginMode = isLogin;
    this.authError.classList.add('hidden');
    if (isLogin) {
        this.loginTitle.textContent = 'Welcome Back';
        this.authButton.textContent = 'Log In';
        this.confirmPasswordWrapper.style.display = 'none';
        this.authToggle.innerHTML = `Don't have an account? <a href="#">Sign Up</a>`;
    } else {
        this.loginTitle.textContent = 'Create Account';
        this.authButton.textContent = 'Create Account';
        this.confirmPasswordWrapper.style.display = 'block';
        this.authToggle.innerHTML = `Already have an account? <a href="#">Log In</a>`;
    }
};
AIChat.prototype.handleAuthFormSubmit = async function() {
    const username = this.usernameInput.value;
    const password = this.passwordInput.value;
    this.authError.classList.add('hidden');
    try {
        const endpoint = this.isLoginMode ? '/api/auth/login' : '/api/auth/signup';
        if (!this.isLoginMode && password !== this.confirmPasswordInput.value) throw new Error("Passwords do not match.");
        const response = await fetch(`${this.apiServerUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        this.loginSuccess(data);
    } catch (error) {
        this.authError.textContent = error.message;
        this.authError.classList.remove('hidden');
    }
};
AIChat.prototype.handleGoogleLogin = async function(response) {
    try {
        const res = await fetch(`${this.apiServerUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        this.loginSuccess(data);
    } catch (error) {
        this.authError.textContent = 'Google Sign-In Failed: ' + error.message;
        this.authError.classList.remove('hidden');
    }
};
AIChat.prototype.addMessage = function(text, role) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message-wrapper ${role}-message-wrapper`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    const avatar = document.createElement('div');
    const displayName = role === 'user' ? (this.currentUser.name || this.currentUser.username) : 'AI';
    avatar.className = role === 'user' ? 'avatar-fallback' : 'avatar ai-avatar';
    if(role === 'user' && this.currentUser.picture) {
        avatar.innerHTML = `<img src="${this.currentUser.picture}" class="avatar">`;
    } else {
        avatar.textContent = displayName.charAt(0).toUpperCase();
    }
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = text;
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messageWrapper.appendChild(messageDiv);
    this.chatMessages.appendChild(messageWrapper);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
}
AIChat.prototype.resetChat = function() {
    this.chatMessages.innerHTML = '';
    this.addMessage("A new chat has started. How can I help?", 'ai');
}
