// --- script.js ---

class AIChat {
    constructor() {
        this.currentUser = null;
        this.jwtToken = null;
        this.isAdmin = false;
        this.isLoginMode = false; // To toggle between login/signup
        this.apiServerUrl = 'http://localhost:3000'; // Change when deploying
        
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
        // ... other chat elements
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
        // ... other chat event listeners
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
        // Reset chat messages on entry
        this.chatMessages.innerHTML = `<div class="ai-message ...">Hello! I'm At41rv AI. How can I help you?</div>`;
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
            if (this.isLoginMode) {
                // Handle Login
                response = await fetch(`${this.apiServerUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
            } else {
                // Handle Sign Up
                const confirmPassword = this.confirmPasswordInput.value;
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                }
                response = await fetch(`${this.apiServerUrl}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
            }

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
    
    // All other methods (for chat, admin, etc.) remain largely the same.
    // They will continue to use `this.jwtToken` for authorized requests.
}

// --- GLOBAL SCOPE ---
window.handleGoogleResponse = async function(response) {
    try {
        const res = await fetch(`${window.aiChat.apiServerUrl}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        window.aiChat.loginSuccess(data);
    } catch (error) {
        // Can't show error on login screen if it's not visible
        alert('Google Sign-In Failed: ' + error.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
