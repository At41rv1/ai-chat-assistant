// --- script.js (Updated) ---

class AIChat {
    constructor() {
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.isLoginMode = false;
        this.isSidebarOpen = false;
        
        // VERY IMPORTANT: REPLACE THIS URL WITH YOUR LIVE RENDER URL
        this.apiServerUrl = 'https://at41rv-chat-backend.onrender.com';
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkSession();
    }

    initializeElements() {
        // Screens
        this.loginScreen = document.getElementById('loginScreen');
        this.chatInterface = document.getElementById('chatInterface');

        // Login Screen Elements
        this.loginTitle = document.getElementById('loginTitle');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
        this.confirmPasswordInput = document.getElementById('confirmPasswordInput');
        this.authError = document.getElementById('authError');
        this.authButton = document.getElementById('authButton');
        this.authToggle = document.getElementById('authToggle');
        
        // Main Chat Interface Elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.newChatButton = document.getElementById('newChatButton');
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.logoutButton = document.getElementById('logoutButton');
        this.modelSelector = document.getElementById('modelSelector');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
    }

    attachEventListeners() {
        // Login screen
        this.authButton.addEventListener('click', () => this.handleAuthFormSubmit());
        this.authToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });

        // Sidebar and user
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.logoutButton.addEventListener('click', () => this.logout());
        this.newChatButton.addEventListener('click', () => this.resetChat());

        // Chat input listeners for send button state and auto-growing textarea
        this.messageInput.addEventListener('input', () => this.onInput());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.sendButton.addEventListener('click', () => this.sendMessage());
    }

    // --- VIEW / SCREEN MANAGEMENT ---

    showLoginScreen(isLogin = false) {
        this.loginScreen.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
        this.isLoginMode = isLogin;
        this.toggleAuthMode(isLogin);
    }

    showChatInterface() {
        this.loginScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.updateUserInfo();
    }
    
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        this.sidebar.classList.toggle('active');
    }

    // --- AUTHENTICATION & SESSION ---
    
    async checkSession() {
        const token = localStorage.getItem('jwtToken');
        const user = localStorage.getItem('aiChatCurrentUser');
        if (token && user) {
            this.jwtToken = token;
            this.currentUser = JSON.parse(user);
            this.isAdmin = this.currentUser.role === 'admin';
            this.showChatInterface();
        } else {
            this.showLoginScreen(true); // Default to login mode
        }
    }

    toggleAuthMode(isLogin = !this.isLoginMode) {
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
    }

    async handleAuthFormSubmit() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        this.authError.classList.add('hidden');

        try {
            const endpoint = this.isLoginMode ? '/api/auth/login' : '/api/auth/signup';
            if (!this.isLoginMode && password !== this.confirmPasswordInput.value) {
                throw new Error("Passwords do not match.");
            }
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
    }

    loginSuccess(data) {
        this.jwtToken = data.token;
        this.currentUser = data.user;
        this.isAdmin = data.user.role === 'admin';
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('aiChatCurrentUser', JSON.stringify(data.user));
        this.showChatInterface();
    }
    
    logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('aiChatCurrentUser');
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.showLoginScreen(true);
    }
    
    updateUserInfo() {
        if (!this.currentUser) return;
        const displayName = this.currentUser.name || this.currentUser.username;
        this.userName.textContent = displayName;
        if (this.currentUser.picture) {
            this.userAvatar.src = this.currentUser.picture;
        } else {
            // Use first letter as avatar fallback
            this.userAvatar.outerHTML = `<div class="avatar-fallback">${displayName.charAt(0).toUpperCase()}</div>`;
        }
    }

    // --- CORE CHAT LOGIC ---

    onInput() {
        const input = this.messageInput;
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';
        // Toggle send button state
        if (input.value.trim().length > 0) {
            this.sendButton.classList.add('active');
        } else {
            this.sendButton.classList.remove('active');
        }
    }

    sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (messageText.length === 0) return;

        this.addMessage(messageText, 'user');
        
        // Reset input field after sending
        this.messageInput.value = '';
        this.onInput(); // Recalculate size and button state

        // TODO: Add your fetch logic here to call the AI and get a response
        // For now, we'll just simulate an AI response
        setTimeout(() => {
            this.addMessage("This is a simulated response from the AI.", 'ai');
        }, 1000);
    }

    addMessage(text, role) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${role}-message-wrapper`;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        // Replace with actual avatar logic
        avatar.src = role === 'user' ? (this.currentUser.picture || `https://ui-avatars.com/api/?name=${this.currentUser.username}&background=374151&color=fff`) : 'https://i.imgur.com/G5iwwS0.png';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        messageWrapper.appendChild(messageDiv);
        
        this.chatMessages.appendChild(messageWrapper);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    resetChat() {
        this.chatMessages.innerHTML = `
            <div class="message-wrapper">
                <div class="message ai-message">
                    <img src="https://i.imgur.com/G5iwwS0.png" alt="AI" class="avatar">
                    <div class="content">A new chat has started. How can I help?</div>
                </div>
            </div>`;
    }
}

// --- GLOBAL SCOPE ---
function handleGoogleResponse(response) {
    if (window.aiChat) {
        window.aiChat.handleGoogleLogin(response);
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
