class AIChat {
    constructor() {
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
        this.loadSavedSettings();
        this.updateWelcomeScreenUI();
        this.updateAdminUI();

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

    initializeElements() {
        // Welcome Screen
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');
        this.loggedOutButtons = document.getElementById('loggedOutButtons');
        this.loggedInButtons = document.getElementById('loggedInButtons');
        this.goToChatButton = document.getElementById('goToChatButton');
        this.welcomeName = document.getElementById('welcomeName');
        this.originalWelcomeText = this.welcomeName.textContent;

        // Chat Interface
        this.chatInterface = document.getElementById('chatInterface');
        this.backToMainButton = document.getElementById('backToMainButton');
        this.userInfo = document.getElementById('userInfo');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.modelSelector = document.getElementById('modelSelector');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearChatButton = document.getElementById('clearChatButton');
        
        // History
        this.historyButton = document.getElementById('historyButton');
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.closeHistoryButton = document.getElementById('closeHistoryButton');

        // Settings
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');
        
        // Admin
        this.adminButton = document.getElementById('adminButton');
        this.adminModal = document.getElementById('adminModal');
        this.closeAdminModal = document.getElementById('closeAdminModal');
        this.adminUserList = document.getElementById('adminUserList');
        this.adminChatView = document.getElementById('adminChatView');
    }

    attachEventListeners() {
        // Welcome Screen listeners
        this.continueWithoutLogin?.addEventListener('click', () => this.startChatting());
        this.signInForSync?.addEventListener('click', () => this.showSettings());
        this.goToChatButton?.addEventListener('click', () => this.startChatting());

        // Chat Interface listeners
        this.backToMainButton?.addEventListener('click', () => this.showMainPage());
        this.sendButton?.addEventListener('click', () => this.sendMessage());
        this.clearChatButton?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the conversation?')) {
                this.clearConversation();
            }
        });

        this.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput?.addEventListener('input', () => {
            const message = this.messageInput.value.trim();
            this.sendButton.disabled = message.length === 0;
        });

        this.modelSelector?.addEventListener('change', (e) => {
            this.setModelConfig(e.target.value);
            localStorage.setItem('selectedModel', this.model);
        });

        // Modal and Sidebar listeners
        this.attachSettingsListeners();
        this.attachAdminListeners();
        this.historyButton?.addEventListener('click', () => this.toggleSidebar());
        this.closeHistoryButton?.addEventListener('click', () => this.toggleSidebar());
    }

    loadSavedSettings() {
        const savedUser = localStorage.getItem('aiChatUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            if (this.currentUser.email === 'at41rv@gmail.com') {
                this.isAdmin = true;
            }
        }

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
            const savedHistory = localStorage.getItem(`chatHistory_${this.currentUser.id}`);
            if (savedHistory) {
                this.conversationHistory = JSON.parse(savedHistory);
                this.loadConversationHistory();
            }
        }
    }

    updateWelcomeScreenUI() {
        if (this.currentUser) {
            this.welcomeName.textContent = `Welcome back, ${this.currentUser.name}! Ready to continue?`;
            this.loggedInButtons.classList.remove('hidden');
            this.loggedOutButtons.classList.add('hidden');
        } else {
            this.welcomeName.textContent = this.originalWelcomeText;
            this.loggedInButtons.classList.add('hidden');
            this.loggedOutButtons.classList.remove('hidden');
        }
    }

    showMainPage() {
        this.chatInterface.classList.add('hidden');
        this.welcomeScreen.classList.remove('hidden');
    }
    
    startChatting() {
        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.showChatInterface();
        this.messageInput.focus();
    }
    
    showChatInterface() {
        if (this.currentUser) {
            this.userName.textContent = this.currentUser.name || '';
            this.userEmail.textContent = this.currentUser.email || '';
            this.userInfo.classList.remove('hidden');
            if (this.conversationHistory.length === 0) {
                 this.loadConversationHistory();
            }
        }
        this.updateAdminUI();
        this.focusInput();
    }

    // --- Sign In / Sign Out ---
    handleSignIn(userData) {
        this.currentUser = userData;
        localStorage.setItem('aiChatUser', JSON.stringify(userData));
        
        this.trackUser(userData);
        
        if(userData.email === 'at41rv@gmail.com') {
            this.isAdmin = true;
        }

        this.hideSettings();
        this.updateWelcomeScreenUI();
        this.updateAdminUI();
        this.loadSavedSettings();
    }

    signOut() {
        this.currentUser = null;
        localStorage.removeItem('aiChatUser');
        this.isAdmin = false;
        
        this.userInfo.classList.add('hidden');
        this.showSignedOutState();
        this.clearConversation();
        this.updateWelcomeScreenUI();
        this.updateAdminUI();

        if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
        }
    }

    // --- Message Handling ---
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.conversationHistory.push({ role: 'user', content: message });
        this.setInputState(false);
        this.messageInput.value = '';

        this.showTypingIndicator();

        try {
            const mainResponse = await this.callAPI(message, this.model);
            this.addMessage(mainResponse, 'assistant');
            this.conversationHistory.push({ role: 'assistant', content: mainResponse });
            this.saveConversationHistory();
        } catch (error) {
            console.error('Error:', error);
            this.addMessage(`Sorry, an error occurred: ${error.message}`, 'assistant');
        } finally {
            this.hideTypingIndicator();
            this.setInputState(true);
            this.focusInput();
        }
    }

    async callAPI(message, currentModel) {
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
        let requestBody = {
            model: currentModel,
            messages: this.conversationHistory,
            max_tokens: 1000,
            stream: false
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error((errorData.error && errorData.error.message) || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
    }

    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex';
        const isUser = role === 'user';

        messageDiv.classList.add(isUser ? 'justify-end' : 'justify-start');
        messageDiv.innerHTML = `
            <div class="${isUser ? 'user-message' : 'ai-message'} rounded-2xl ${isUser ? 'rounded-br-none' : 'rounded-bl-none'} px-6 py-4 max-w-lg shadow-md">
                <p class="font-medium">${this.formatMessage(content)}</p>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // --- UI and State Management ---
    
    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled || this.messageInput.value.trim().length === 0;
    }

    showTypingIndicator() {
        this.typingIndicator?.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator?.classList.add('hidden');
    }

    scrollToBottom() {
        setTimeout(() => {
            if (this.chatMessages) {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }, 100);
    }

    clearConversation() {
        this.conversationHistory = [];
        this.chatMessages.innerHTML = `
            <div class="message-bubble flex justify-start">
                <div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl">
                    <p class="text-gray-700 text-lg font-medium leading-relaxed">Hello! I'm At41rv AI. How can I help you today?</p>
                </div>
            </div>
        `;
        if (this.currentUser && this.autoSave) {
            localStorage.removeItem(`chatHistory_${this.currentUser.id}`);
        }
    }
    
    saveConversationHistory() {
        if (this.currentUser && this.autoSave) {
            localStorage.setItem(`chatHistory_${this.currentUser.id}`, JSON.stringify(this.conversationHistory));
        }
    }

    loadConversationHistory() {
        this.chatMessages.innerHTML = '';
        this.addMessage("Hello! I'm At41rv AI. How can I help you today?", 'assistant');
        this.conversationHistory.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });
        this.scrollToBottom();
    }

    // --- Modals and Sidebars ---

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        this.chatHistorySidebar?.classList.toggle('active');
        if (this.isSidebarOpen) this.loadChatHistoryForSidebar();
    }

    attachSettingsListeners() {
        this.settingsButton?.addEventListener('click', () => this.showSettings());
        this.closeSettingsModal?.addEventListener('click', () => this.hideSettings());
        this.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideSettings();
        });
        this.autoSaveToggle?.addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
        });
        document.getElementById('signOutButton')?.addEventListener('click', () => this.signOut());
    }

    showSettings() {
        if (this.currentUser) this.showSignedInState();
        else this.showSignedOutState();
        this.settingsModal.classList.remove('hidden');
        this.settingsModal.style.display = 'flex';
        requestAnimationFrame(() => this.settingsModal.style.opacity = '1');
    }

    hideSettings() {
        this.settingsModal.style.opacity = '0';
        setTimeout(() => {
            this.settingsModal.classList.add('hidden');
            this.settingsModal.style.display = 'none';
        }, 200);
    }
    
    showSignedInState() {
        document.getElementById('signedOutState').classList.add('hidden');
        const signedInState = document.getElementById('signedInState');
        signedInState.classList.remove('hidden');
        document.getElementById('settingsUserName').textContent = this.currentUser.name || '';
        document.getElementById('settingsUserEmail').textContent = this.currentUser.email || '';
    }

    showSignedOutState() {
        document.getElementById('signedOutState').classList.remove('hidden');
        document.getElementById('signedInState').classList.add('hidden');
    }
    
    loadChatHistoryForSidebar() {
        // Implementation for listing past chats in the sidebar
    }

    // --- Admin Panel ---

    updateAdminUI() {
        if (this.adminButton) {
            this.adminButton.classList.toggle('hidden', !this.isAdmin);
        }
    }

    attachAdminListeners() {
        this.adminButton?.addEventListener('click', () => this.showAdminPanel());
        this.closeAdminModal?.addEventListener('click', () => this.hideAdminPanel());
    }

    showAdminPanel() {
        if (!this.isAdmin) return;
        this.populateAdminUserList();
        this.adminModal.classList.remove('hidden');
        this.adminModal.style.display = 'flex';
        requestAnimationFrame(() => this.adminModal.style.opacity = '1');
    }

    hideAdminPanel() {
        this.adminModal.style.opacity = '0';
        setTimeout(() => {
            this.adminModal.classList.add('hidden');
            this.adminModal.style.display = 'none';
        }, 200);
    }
    
    populateAdminUserList() {
        if (!this.adminUserList) return;
        const users = JSON.parse(localStorage.getItem('allAppUsers')) || [];
        this.adminUserList.innerHTML = '';
        
        if(users.length === 0){
            this.adminUserList.innerHTML = `<p class="text-gray-500 text-sm">No user data found.</p>`;
            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100';
            userElement.dataset.userId = user.id;
            
            userElement.innerHTML = `
                <div>
                    <div class="font-semibold text-sm text-gray-800">${this.escapeHtml(user.name)}</div>
                    <div class="text-xs text-gray-500">${this.escapeHtml(user.email)}</div>
                </div>
            `;
            
            userElement.addEventListener('click', () => {
                this.adminUserList.querySelectorAll('.bg-gray-200').forEach(el => el.classList.remove('bg-gray-200'));
                userElement.classList.add('bg-gray-200');
                this.displayUserHistory(user.id);
            });
            this.adminUserList.appendChild(userElement);
        });
    }
    
    displayUserHistory(userId) {
        if (!this.adminChatView) return;
        const history = JSON.parse(localStorage.getItem(`chatHistory_${userId}`)) || [];
        this.adminChatView.innerHTML = '';
        
        if (history.length === 0) {
            this.adminChatView.innerHTML = `<p class="text-gray-500 text-center mt-8">This user has no saved chat history.</p>`;
            return;
        }
        
        history.forEach(msg => {
             const messageDiv = document.createElement('div');
            messageDiv.className = 'message-bubble flex';
            const isUser = msg.role === 'user';
            
            messageDiv.classList.add(isUser ? 'justify-end' : 'justify-start');
            messageDiv.innerHTML = `
                <div class="${isUser ? 'bg-gray-800 text-white' : 'bg-white border'} rounded-2xl ${isUser ? 'rounded-br-none' : 'rounded-bl-none'} px-4 py-2 max-w-lg shadow-md">
                    <p class="text-sm font-medium">${this.formatMessage(msg.content)}</p>
                </div>
            `;
            this.adminChatView.appendChild(messageDiv);
        });
        this.adminChatView.scrollTop = this.adminChatView.scrollHeight;
    }

    trackUser(userData) {
        if (!userData?.id) return;
        let users = JSON.parse(localStorage.getItem('allAppUsers')) || [];
        let userMap = new Map(users.map(u => [u.id, u]));
        userMap.set(userData.id, userData);
        localStorage.setItem('allAppUsers', JSON.stringify(Array.from(userMap.values())));
    }
    
    // --- UTILITIES ---
    formatMessage(content) {
        let formatted = this.escapeHtml(content);
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    focusInput() {
        this.messageInput?.focus();
    }
}

// --- Global Scope ---

window.handleCredentialResponse = function(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userData = {
            id: payload.sub,
            name: payload.name,
            email: payload.email
        };
        window.aiChat.handleSignIn(userData);
    } catch (error) {
        console.error('Error handling Google Sign-In:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
