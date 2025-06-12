// --- script.js ---

class AIChat {
    constructor() {
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.isLoginMode = false; // To toggle between login/signup

        // =================================================================
        // ▼▼▼ VERY IMPORTANT: REPLACE THIS URL WITH YOUR LIVE RENDER URL ▼▼▼
        // =================================================================
        this.apiServerUrl = 'https://at41rv-chat-backend.onrender.com';
        // =================================================================

        this.initializeElements();
        this.attachEventListeners();
        this.checkSession();
    }

    initializeElements() {
        // Screens
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.loginScreen = document.getElementById('loginScreen');
        this.chatInterface = document.getElementById('chatInterface');

        // Home Page Elements
        this.navLoggedOut = document.getElementById('nav-logged-out');
        this.navLoggedIn = document.getElementById('nav-logged-in');
        this.loginNavButton = document.getElementById('loginNavButton');
        this.signupNavButton = document.getElementById('signupNavButton');
        this.navUserName = document.getElementById('navUserName');
        this.navUserAvatar = document.getElementById('navUserAvatar');
        this.navLogoutButton = document.getElementById('navLogoutButton');
        this.ctaButton = document.getElementById('ctaButton');
        
        // Login Screen Elements
        this.loginTitle = document.getElementById('loginTitle');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
        this.confirmPasswordInput = document.getElementById('confirmPasswordInput');
        this.authError = document.getElementById('authError');
        this.authButton = document.getElementById('authButton');
        this.authToggle = document.getElementById('authToggle');
        
        // Chat Interface Elements
        this.homeButton = document.getElementById('homeButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.modelSelector = document.getElementById('modelSelector');
        this.settingsButton = document.getElementById('settingsButton');
        this.adminButton = document.getElementById('adminButton');
    }

    attachEventListeners() {
        // Home page buttons
        this.loginNavButton.addEventListener('click', () => this.showLoginScreen(true));
        this.signupNavButton.addEventListener('click', () => this.showLoginScreen(false));
        this.navLogoutButton.addEventListener('click', () => this.logout());
        this.ctaButton.addEventListener('click', () => this.handleCtaClick());

        // Login screen buttons
        this.authButton.addEventListener('click', () => this.handleAuthFormSubmit());
        this.authToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });

        // Chat page buttons
        this.homeButton.addEventListener('click', () => this.showHomePage());
        if (this.sendButton) this.sendButton.addEventListener('click', () => this.sendMessage());
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }});
            this.messageInput.addEventListener('input', () => { this.sendButton.disabled = this.messageInput.value.trim().length === 0; });
        }
    }

    // --- VIEW / SCREEN MANAGEMENT ---

    showHomePage() {
        this.welcomeScreen.style.display = 'block';
        this.loginScreen.style.display = 'none';
        this.chatInterface.classList.add('hidden');
        this.updateHomePageUI();
    }
    
    showLoginScreen(isLogin = false) {
        this.welcomeScreen.style.display = 'none';
        this.loginScreen.style.display = 'flex';
        this.chatInterface.classList.add('hidden');
        this.isLoginMode = isLogin;
        this.toggleAuthMode(isLogin);
    }

    showChatInterface() {
        this.welcomeScreen.style.display = 'none';
        this.loginScreen.style.display = 'none';
        this.chatInterface.classList.remove('hidden');
        if (this.chatMessages) {
             this.chatMessages.innerHTML = `<div class="message-bubble flex justify-start"><div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl"><p class="text-gray-700 text-lg font-medium leading-relaxed">Hello! I'm At41rv AI. How can I help you today?</p></div></div>`;
        }
    }

    updateHomePageUI() {
        if (this.currentUser) {
            // Logged-in state
            this.navLoggedOut.style.display = 'none';
            this.navLoggedIn.style.display = 'flex';
            this.navUserName.textContent = this.currentUser.name || this.currentUser.username;
            if (this.currentUser.picture) {
                this.navUserAvatar.src = this.currentUser.picture;
                this.navUserAvatar.classList.remove('hidden');
            } else {
                this.navUserAvatar.classList.add('hidden');
            }
            this.ctaButton.textContent = 'Go to Chat';
        } else {
            // Logged-out state
            this.navLoggedOut.style.display = 'flex';
            this.navLoggedIn.style.display = 'none';
            this.ctaButton.textContent = 'Get Started';
        }
    }

    // --- AUTHENTICATION & SESSION ---

    async checkSession() {
        const token = localStorage.getItem('jwtToken');
        const user = localStorage.getItem('aiChatCurrentUser');
        if (token && user) {
            this.jwtToken = token;
            this.currentUser = JSON.parse(user);
            this.isAdmin = this.currentUser.role === 'admin';
        }
        this.showHomePage();
    }

    handleCtaClick() {
        if (this.currentUser) {
            this.showChatInterface();
        } else {
            this.showLoginScreen(false); // Default to sign up
        }
    }

    toggleAuthMode(isLogin = !this.isLoginMode) {
        this.isLoginMode = isLogin;
        this.authError.classList.add('hidden');
        if (isLogin) {
            this.loginTitle.textContent = 'Log In';
            this.authButton.textContent = 'Log In';
            this.confirmPasswordWrapper.style.display = 'none';
            this.authToggle.innerHTML = `Don't have an account? <a href="#" class="font-medium text-indigo-600">Sign Up</a>`;
        } else {
            this.loginTitle.textContent = 'Sign Up';
            this.authButton.textContent = 'Create Account';
            this.confirmPasswordWrapper.style.display = 'block';
            this.authToggle.innerHTML = `Already have an account? <a href="#" class="font-medium text-indigo-600">Log In</a>`;
        }
    }

    async handleAuthFormSubmit() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        this.authError.classList.add('hidden');

        try {
            let response;
            const endpoint = this.isLoginMode ? '/api/auth/login' : '/api/auth/signup';
            
            if (!this.isLoginMode) {
                const confirmPassword = this.confirmPasswordInput.value;
                if (password !== confirmPassword) throw new Error("Passwords do not match.");
            }

            response = await fetch(`${this.apiServerUrl}${endpoint}`, {
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
        this.showHomePage();
    }
    
    logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('aiChatCurrentUser');
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.showHomePage();
    }
    
    // --- Core Chat Logic ---
    async sendMessage() {
        // This is a placeholder for your chat logic.
        // It should get the message from messageInput, call the AI,
        // display the messages, and save them to your backend.
        console.log("Sending message...");
    }
}

// --- GLOBAL SCOPE ---
function handleGoogleResponse(response) {
    window.aiChat.handleGoogleLogin(response);
}

// Add the handleGoogleLogin method to the AIChat class
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
        alert('Google Sign-In Failed: ' + error.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
