/**
 * Mock Server class to manage data in localStorage.
 * This simulates a server environment without a real backend,
 * ensuring data persists in the user's browser.
 */
class Server {
    constructor() {
        // The admin's primary identifier is the email from Google Sign-In.
        this.ADMIN_EMAIL = 'at41rv@gmail.com';
    }

    /**
     * Generates a unique user ID from a username.
     * @param {string} username - The username to create an ID for.
     * @returns {string} A unique ID string, e.g., "john-doe-16x4k2"
     */
    generateUniqueId(username) {
        const timestamp = Date.now().toString(36).slice(-4);
        const randomPart = Math.random().toString(36).substring(2, 6);
        return `${username.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomPart}`;
    }

    /**
     * Retrieves all users from storage.
     * @returns {Array} An array of user objects.
     */
    getUsers() {
        return JSON.parse(localStorage.getItem('allAppUsers')) || [];
    }

    /**
     * Saves or updates user data in the list of all users.
     * @param {object} userData - The user object {id, name/username, etc.}.
     */
    saveUser(userData) {
        if (!userData || !userData.id) return;
        let users = this.getUsers();
        // Use a Map to easily handle adding new users or updating existing ones.
        let userMap = new Map(users.map(u => [u.id, u]));
        userMap.set(userData.id, userData);
        localStorage.setItem('allAppUsers', JSON.stringify(Array.from(userMap.values())));
    }

    /**
     * Saves chat history for a specific user ID.
     * @param {string} userId - The unique ID of the user.
     * @param {Array} history - The conversation history array.
     */
    saveChatHistory(userId, history) {
        if (userId && history) {
            localStorage.setItem(`chatHistory_${userId}`, JSON.stringify(history));
        }
    }

    /**
     * Retrieves chat history for a specific user ID.
     * @param {string} userId - The unique ID of the user.
     * @returns {Array|null} The user's conversation history or null if not found.
     */
    getChatHistory(userId) {
        const history = localStorage.getItem(`chatHistory_${userId}`);
        return history ? JSON.parse(history) : null;
    }
}


class AIChat {
    constructor() {
        this.server = new Server(); // Use the mock server for all data operations
        this.apiKey = '';
        this.baseUrl = '';
        this.model = 'llama-3.1-8b-instant';
        this.conversationHistory = [];
        this.currentUser = null;
        this.autoSave = true;
        this.isSidebarOpen = false;
        this.isAdmin = false;

        this.initializeElements();
        this.attachEventListeners();
        this.checkSession();

        this.setModelConfig(this.model);
    }

    setModelConfig(modelName) {
        if (modelName === 'llama-3.1-8b-instant') {
            this.apiKey = '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';
            this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        } else if (modelName === 'deepseek-r1-distill-llama-70b') {
            this.apiKey = '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';
            this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        }
        this.model = modelName;
    }

    checkSession() {
        const sessionUser = localStorage.getItem('aiChatCurrentUser');
        if (sessionUser) {
            this.startSession(JSON.parse(sessionUser));
        } else {
            this.showWelcomeScreen();
        }
    }
    
    startSession(userObject) {
        this.currentUser = userObject;
        this.isAdmin = this.currentUser.email === this.server.ADMIN_EMAIL;
        
        this.loadSavedSettings();
        this.showChatInterface();
        this.updateUserInfoDisplay();
    }
    
    loadSavedSettings() {
        const autoSave = localStorage.getItem('autoSave');
        if (autoSave !== null) {
            this.autoSave = JSON.parse(autoSave);
            if (this.autoSaveToggle) this.autoSaveToggle.checked = this.autoSave;
        }

        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            this.model = savedModel;
            if (this.modelSelector) this.modelSelector.value = savedModel;
            this.setModelConfig(savedModel);
        }

        if (this.currentUser && this.autoSave) {
            const savedHistory = this.server.getChatHistory(this.currentUser.id);
            if (savedHistory) {
                this.conversationHistory = savedHistory;
                this.loadConversationHistory();
            }
        }
        this.updateAdminUI();
    }

    showWelcomeScreen() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = 'flex';
        if (this.chatInterface) this.chatInterface.classList.add('hidden');
    }

    showChatInterface() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = 'none';
        if (this.chatInterface) {
            this.chatInterface.classList.remove('hidden');
            if (this.chatMessages && this.conversationHistory.length === 0) {
                this.resetChatMessages();
            }
            this.messageInput.focus();
        }
    }
    
    updateUserInfoDisplay() {
        if (!this.currentUser) return;
        
        // Use 'name' from Google or 'username' from manual creation
        const displayName = this.currentUser.name || this.currentUser.username;
        
        if (this.userName) this.userName.textContent = displayName;
        
        if (this.currentUser.email) {
            if (this.userEmail) this.userEmail.textContent = this.currentUser.email;
            if (this.userAvatar) {
                this.userAvatar.src = this.currentUser.picture;
                this.userAvatar.classList.remove('hidden');
            }
        } else {
             if (this.userEmail) this.userEmail.textContent = `ID: ${this.currentUser.id}`;
             if (this.userAvatar) this.userAvatar.classList.add('hidden');
        }

        if (this.userInfo) this.userInfo.classList.remove('hidden', 'items-center');
        if (this.userInfo) this.userInfo.classList.add('flex', 'items-center');
    }

    initializeElements() {
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.usernameInput = document.getElementById('usernameInput');
        this.createUserButton = document.getElementById('createUserButton');
        this.usernameError = document.getElementById('usernameError');

        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');
        this.logoutButton = document.getElementById('logoutButton');

        this.chatInterface = document.getElementById('chatInterface');
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.modelSelector = document.getElementById('modelSelector');

        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearChatButton = document.getElementById('clearChatButton');
        this.historyButton = document.getElementById('historyButton');
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.closeHistoryButton = document.getElementById('closeHistoryButton');

        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');
        
        this.adminButton = document.getElementById('adminButton');
        this.adminModal = document.getElementById('adminModal');
        this.closeAdminModal = document.getElementById('closeAdminModal');
        this.adminUserList = document.getElementById('adminUserList');
        this.adminChatView = document.getElementById('adminChatView');
    }

    attachEventListeners() {
        if (this.createUserButton) this.createUserButton.addEventListener('click', () => this.createUser());
        if (this.usernameInput) this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createUser();
        });
        if (this.modelSelector) this.modelSelector.addEventListener('change', (e) => {
            this.setModelConfig(e.target.value);
            localStorage.setItem('selectedModel', this.model);
        });
        if (this.logoutButton) this.logoutButton.addEventListener('click', () => this.logout());
        this.attachSettingsListeners();
        this.attachAdminListeners();
        if (this.historyButton) this.historyButton.addEventListener('click', () => this.toggleSidebar());
        if (this.closeHistoryButton) this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        document.addEventListener('click', (e) => {
            if (this.chatHistorySidebar && this.chatHistorySidebar.classList.contains('active') && !e.target.closest('#chatHistorySidebar') && !e.target.closest('#historyButton')) {
                this.toggleSidebar();
            }
        });
        if (this.autoSaveToggle) this.autoSaveToggle.addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
            if (this.currentUser && this.autoSave) this.saveConversationHistory();
        });
        if (this.clearChatButton) this.clearChatButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the conversation?')) this.clearConversation();
        });
        if (this.sendButton) this.sendButton.addEventListener('click', () => this.sendMessage());
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.messageInput.addEventListener('input', () => {
                this.sendButton.disabled = this.messageInput.value.trim().length === 0;
            });
        }
        if (this.closeErrorModal) this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
    }

    createUser() {
        const username = this.usernameInput.value.trim();
        if (username.length < 3 || username.length > 15) {
            this.usernameError.classList.remove('hidden');
            return;
        }
        this.usernameError.classList.add('hidden');

        const userId = this.server.generateUniqueId(username);
        const userObject = { username: username, id: userId };
        
        this.server.saveUser(userObject);
        localStorage.setItem('aiChatCurrentUser', JSON.stringify(userObject));
        
        this.startSession(userObject);
    }
    
    logout() {
        if(confirm("Are you sure you want to log out? Your chat history will be saved.")) {
            localStorage.removeItem('aiChatCurrentUser');
            if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
            }
            this.currentUser = null;
            this.isAdmin = false;
            this.conversationHistory = [];
            this.hideSettings();
            this.showWelcomeScreen();
        }
    }
    
    showSettings() {
        if (this.settingsModal) {
            if (this.currentUser) {
                const displayName = this.currentUser.name || this.currentUser.username;
                document.getElementById('settingsUsername').textContent = `User: ${displayName}`;
                document.getElementById('settingsUserId').textContent = `ID: ${this.currentUser.id}`;
                const avatar = document.getElementById('settingsUserAvatar');
                if(this.currentUser.picture) {
                    avatar.src = this.currentUser.picture;
                    avatar.classList.remove('hidden');
                } else {
                    avatar.classList.add('hidden');
                }
            }
            this.settingsModal.style.display = 'flex';
            requestAnimationFrame(() => {
                this.settingsModal.classList.remove('hidden');
                this.settingsModal.style.opacity = '1';
            });
        }
    }
    
    hideSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.opacity = '0';
            setTimeout(() => {
                this.settingsModal.classList.add('hidden');
                this.settingsModal.style.display = 'none';
            }, 200);
        }
    }
    
    attachSettingsListeners() {
        if (this.settingsButton) this.settingsButton.addEventListener('click', () => this.showSettings());
        if (this.closeSettingsModal) this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        if (this.settingsModal) this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideSettings();
        });
    }
    
    toggleSidebar() {
        if (this.chatHistorySidebar) {
            this.isSidebarOpen = !this.isSidebarOpen;
            this.chatHistorySidebar.classList.toggle('active');
            if (this.isSidebarOpen) this.loadChatHistory();
        }
    }
    
    loadChatHistory() {
        const chatHistoryList = document.getElementById('chatHistoryList');
        if (!chatHistoryList) return;
        chatHistoryList.innerHTML = '';
        const sessions = this.conversationHistory.reduce((acc, msg) => {
            if (msg.role === 'user') acc.push(msg.content);
            return acc;
        }, []);
        if (sessions.length === 0) {
            chatHistoryList.innerHTML = `<div class="text-center py-8 text-gray-500"><p>No chat history yet</p></div>`;
            return;
        }
        sessions.forEach((session) => {
            const messagePreview = session.length > 50 ? session.substring(0, 50) + '...' : session;
            const sessionElement = document.createElement('div');
            sessionElement.className = 'p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all cursor-pointer';
            sessionElement.innerHTML = `<p class="text-sm text-gray-600">${messagePreview}</p>`;
            chatHistoryList.appendChild(sessionElement);
        });
    }

    saveConversationHistory() {
        if (this.currentUser && this.autoSave) {
            this.server.saveChatHistory(this.currentUser.id, this.conversationHistory);
        }
    }

    loadConversationHistory() {
        this.chatMessages.innerHTML = '';
        this.addMessage("Hello! I'm At41rv AI. How can I help you today?", 'assistant');
        this.conversationHistory.forEach(msg => this.addMessage(msg.content, msg.role));
        this.scrollToBottom();
    }
    
    // Unchanged core methods: sendMessage, callAPI, addMessage, formatMessage, etc.
    // ... (All methods from 'sendMessage' to 'clearConversation' can be copied from the previous JS file, they don't need significant changes) ...
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.conversationHistory.push({ role: 'user', content: message });
        this.setInputState(false);
        this.messageInput.value = '';
        this.showTypingIndicator();

        try {
            const response = await this.callAPI(message);
            this.addMessage(response, 'assistant');
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.saveConversationHistory();
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'An error occurred while processing your request.');
        } finally {
            this.hideTypingIndicator();
            this.setInputState(true);
            this.focusInput();
        }
    }

    async callAPI(message) {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`};
        const requestBody = { model: this.model, messages: this.conversationHistory, max_tokens: 1000, stream: false };
        const response = await fetch(this.baseUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error((errorData.error && errorData.error.message) || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        let assistantMessage = data.choices && data.choices[0] ? data.choices[0].message.content : 'Sorry, I could not get a response.';
        if (this.model === 'deepseek-r1-distill-llama-70b') {
            assistantMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }
        if (this.conversationHistory.length > 20) this.conversationHistory = this.conversationHistory.slice(-20);
        return assistantMessage;
    }
    
    resetChatMessages() {
         this.chatMessages.innerHTML = `<div class="message-bubble flex justify-start"><div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl"><p class="text-gray-700 text-lg font-medium leading-relaxed">Hello! I'm At41rv AI. How can I help you today?</p></div></div>`;
    }

    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex';
        if (role === 'user') {
            messageDiv.classList.add('justify-end');
            messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-6 py-4 max-w-lg shadow-md"><p class="font-medium">${this.escapeHtml(content)}</p></div>`;
        } else {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-6 py-4 max-w-lg shadow-md"><p class="text-gray-700 font-medium">${this.formatMessage(content)}</p></div>`;
        }
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        let formatted = this.escapeHtml(content); return formatted.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    setInputState(enabled) { this.messageInput.disabled = !enabled; this.sendButton.disabled = !enabled || this.messageInput.value.trim().length === 0; }

    showTypingIndicator() { if (this.typingIndicator) { this.typingIndicator.classList.remove('hidden'); this.scrollToBottom(); } }
    
    hideTypingIndicator() { if (this.typingIndicator) this.typingIndicator.classList.add('hidden'); }
    
    showError(message) { this.errorMessage.textContent = message; this.errorModal.classList.remove('hidden'); this.errorModal.classList.add('flex'); }

    hideErrorModal() { this.errorModal.classList.add('hidden'); this.errorModal.classList.remove('flex'); }

    scrollToBottom() { setTimeout(() => { if (this.chatMessages) this.chatMessages.scrollTop = this.chatMessages.scrollHeight; }, 100); }
    
    focusInput() { if(this.messageInput) this.messageInput.focus(); }

    clearConversation() { this.conversationHistory = []; this.resetChatMessages(); if (this.currentUser && this.autoSave) { this.server.saveChatHistory(this.currentUser.id, []); }}
    
    // --- ADMIN PANEL LOGIC ---
    updateAdminUI() {
        if (this.adminButton) this.adminButton.classList.toggle('hidden', !this.isAdmin);
    }

    attachAdminListeners() {
        if (this.adminButton) this.adminButton.addEventListener('click', () => this.showAdminPanel());
        if (this.closeAdminModal) this.closeAdminModal.addEventListener('click', () => this.hideAdminPanel());
    }

    showAdminPanel() {
        if (!this.isAdmin) return;
        this.populateAdminUserList();
        if (this.adminModal) {
            this.adminModal.style.display = 'flex';
            requestAnimationFrame(() => { this.adminModal.classList.remove('hidden'); this.adminModal.style.opacity = '1'; });
        }
    }

    hideAdminPanel() {
        if (this.adminModal) {
            this.adminModal.style.opacity = '0';
            setTimeout(() => { this.adminModal.classList.add('hidden'); this.adminModal.style.display = 'none'; }, 200);
        }
    }
    
    populateAdminUserList() {
        if (!this.adminUserList) return;
        const users = this.server.getUsers();
        this.adminUserList.innerHTML = '';
        if(users.length === 0){
            this.adminUserList.innerHTML = `<p class="text-gray-500 text-sm">No user data found in this browser.</p>`;
            return;
        }
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-all';
            userElement.dataset.userId = user.id;
            
            const displayName = this.escapeHtml(user.name || user.username);
            const displayIdentifier = this.escapeHtml(user.email || user.id);
            const avatarHTML = user.picture ? `<img src="${user.picture}" alt="Avatar" class="w-10 h-10 rounded-full">` : `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">${displayName.charAt(0).toUpperCase()}</div>`;

            userElement.innerHTML = `
                ${avatarHTML}
                <div>
                    <div class="font-semibold text-sm text-gray-800">${displayName}</div>
                    <div class="text-xs text-gray-500">${displayIdentifier}</div>
                </div>
            `;
            userElement.addEventListener('click', () => {
                this.adminUserList.querySelectorAll('.bg-indigo-100').forEach(el => el.classList.remove('bg-indigo-100'));
                userElement.classList.add('bg-indigo-100');
                this.displayUserHistory(user.id);
            });
            this.adminUserList.appendChild(userElement);
        });
    }
    
    displayUserHistory(userId) {
        if (!this.adminChatView) return;
        const history = this.server.getChatHistory(userId) || [];
        this.adminChatView.innerHTML = '';
        if (history.length === 0) {
            this.adminChatView.innerHTML = `<p class="text-gray-500 text-center mt-8">This user has no saved chat history.</p>`;
            return;
        }
        history.forEach(msg => {
            const messageDiv = document.createElement('div');
            const bubbleClass = msg.role === 'user' ? 'bg-gray-800 text-white rounded-br-none' : 'bg-white border rounded-bl-none';
            messageDiv.className = `flex my-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;
            messageDiv.innerHTML = `<div class="${bubbleClass} rounded-2xl px-4 py-2 max-w-lg shadow-md text-sm">${this.formatMessage(msg.content)}</div>`;
            this.adminChatView.appendChild(messageDiv);
        });
        this.adminChatView.scrollTop = this.adminChatView.scrollHeight;
    }
}


// Global function to handle Google Sign-In response
window.handleCredentialResponse = function(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userData = {
            id: payload.sub, // Use Google's unique 'sub' as the ID
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        };

        // Save user to our "server" and start the session
        window.aiChat.server.saveUser(userData);
        localStorage.setItem('aiChatCurrentUser', JSON.stringify(userData));
        window.aiChat.startSession(userData);

    } catch (error) {
        console.error('Error handling Google Sign-In:', error);
        window.aiChat.showError('Failed to sign in with Google. Please try again.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
