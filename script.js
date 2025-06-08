class AIChat {
    constructor() {
        // !!! SECURITY WARNING !!!
        // EXPOSING YOUR API KEY IN CLIENT-SIDE CODE IS A SEVERE SECURITY RISK.
        // Anyone can view your source code and steal this key.
        // It is strongly recommended to use a backend proxy to handle API requests securely.
        this.apiKey = 'ddc-a4f-796282249bb7466383eaabebc348d027';
        this.baseUrl = 'https://api.a4f.co/v1/chat/completions';
        this.model = 'provider-3/gpt-4.5-preview';
        this.conversationHistory = [];
        this.currentUser = null;
        this.autoSave = true;
        this.isSidebarOpen = false;

        this.initializeElements();
        this.attachEventListeners();
        this.loadSavedSettings();
        this.showWelcomeScreen();
    }

    loadSavedSettings() {
        // Load saved user data
        const savedUser = localStorage.getItem('aiChatUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        // Load auto-save preference
        const autoSave = localStorage.getItem('autoSave');
        if (autoSave !== null) {
            this.autoSave = JSON.parse(autoSave);
            if (this.autoSaveToggle) {
                this.autoSaveToggle.checked = this.autoSave;
            }
        }

        // Load conversation history for logged-in user
        if (this.currentUser && this.autoSave) {
            const savedHistory = localStorage.getItem(`chatHistory_${this.currentUser.id}`);
            if (savedHistory) {
                this.conversationHistory = JSON.parse(savedHistory);
                this.loadConversationHistory();
            }
        }
    }

    showWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.remove('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.add('hidden');
        }
    }

    initializeElements() {
        // Welcome screen elements
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');

        // Settings elements
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');

        // User info elements
        this.chatInterface = document.getElementById('chatInterface');
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');

        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearChatButton = document.getElementById('clearChatButton');
        this.historyButton = document.getElementById('historyButton');
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.closeHistoryButton = document.getElementById('closeHistoryButton');


        // Modal elements
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');
    }

    attachEventListeners() {
        // Welcome screen buttons
        if (this.continueWithoutLogin) {
            this.continueWithoutLogin.addEventListener('click', () => this.startChatting());
        }

        if (this.signInForSync) {
            this.signInForSync.addEventListener('click', () => this.showSettings());
        }

        // Attach settings related listeners
        this.attachSettingsListeners();

        // Chat history toggle
        if (this.historyButton) {
            this.historyButton.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.closeHistoryButton) {
            this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.chatHistorySidebar &&
                this.chatHistorySidebar.classList.contains('active') &&
                !e.target.closest('#chatHistorySidebar') &&
                !e.target.closest('#historyButton')) {
                this.toggleSidebar();
            }
        });


        if (this.autoSaveToggle) {
            this.autoSaveToggle.addEventListener('change', (e) => {
                this.autoSave = e.target.checked;
                localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
                if (this.currentUser && this.autoSave) {
                    this.saveConversationHistory();
                }
            });
        }

        // Authentication event listeners
        if (this.customGoogleSignIn) {
            this.customGoogleSignIn.addEventListener('click', () => this.initiateGoogleSignIn());
        }

        const signOutButton = document.getElementById('signOutButton');
        if (signOutButton) {
            signOutButton.addEventListener('click', () => this.signOut());
        }


        // Chat event listeners
        if (this.clearChatButton) {
            this.clearChatButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the conversation?')) {
                    this.clearConversation();
                }
            });
        }

        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }

        if (this.messageInput) {
            // Enter key press
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Input validation
            this.messageInput.addEventListener('input', () => {
                const message = this.messageInput.value.trim();
                this.sendButton.disabled = message.length === 0;

                if (message.length > 0) {
                    this.sendButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
                } else {
                    this.sendButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
                }
            });
        }

        // Error modal close
        if (this.closeErrorModal) {
            this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
        }

        if (this.errorModal) {
            this.errorModal.addEventListener('click', (e) => {
                if (e.target === this.errorModal) {
                    this.hideErrorModal();
                }
            });
        }
    }


    startChatting() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.remove('hidden');

            // Initialize chat with welcome message if no history
            if (this.chatMessages && this.conversationHistory.length === 0) {
                this.chatMessages.innerHTML = `
                    <div class="message-bubble flex justify-start">
                        <div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl backdrop-blur-sm">
                            <p class="text-gray-700 text-lg font-medium leading-relaxed">
                                Hello! I'm At41rv AI. How can I help you today?
                            </p>
                        </div>
                    </div>
                `;
            }

            this.messageInput.focus();
        }
    }

    showSettings() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('hidden');
            this.settingsModal.style.display = 'flex';
            requestAnimationFrame(() => {
                this.settingsModal.classList.add('flex');
                this.settingsModal.style.opacity = '1';
            });
            if (this.currentUser) {
                this.showSignedInState();
            } else {
                this.showSignedOutState();
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideSettings();
                }
            }, {
                once: true
            });
        }
    }

    attachSettingsListeners() {
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', () => {
                this.showSettings();
            });
        }

        if (this.closeSettingsModal) {
            this.closeSettingsModal.addEventListener('click', () => {
                this.hideSettings();
            });
        }

        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.hideSettings();
                }
            });
        }
    }

    toggleSidebar() {
        if (this.chatHistorySidebar) {
            this.isSidebarOpen = !this.isSidebarOpen;
            this.chatHistorySidebar.classList.toggle('active');
            if (this.isSidebarOpen) {
                this.loadChatHistory();
            }
        }
    }



    hideSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.opacity = '0';
            setTimeout(() => {
                this.settingsModal.classList.add('hidden');
                this.settingsModal.classList.remove('flex');
                this.settingsModal.style.display = 'none';
            }, 200);
        }
    }

    showSignedInState() {
        const signedOutState = document.getElementById('signedOutState');
        const signedInState = document.getElementById('signedInState');

        if (signedOutState) signedOutState.classList.add('hidden');
        if (signedInState) {
            signedInState.classList.remove('hidden');

            // Update user info in settings
            const avatar = document.getElementById('settingsUserAvatar');
            const name = document.getElementById('settingsUserName');
            const email = document.getElementById('settingsUserEmail');

            if (avatar) avatar.src = this.currentUser.picture || '';
            if (name) name.textContent = this.currentUser.name || '';
            if (email) email.textContent = this.currentUser.email || '';
        }
    }

    loadChatHistory() {
        const chatHistoryList = document.getElementById('chatHistoryList');
        if (!chatHistoryList) return;

        chatHistoryList.innerHTML = '';

        const sessions = this.conversationHistory.reduce((acc, msg, index) => {
            if (msg.role === 'user') {
                acc.push({
                    id: index,
                    message: msg.content,
                    timestamp: new Date().toISOString()
                });
            }
            return acc;
        }, []);

        if (sessions.length === 0) {
            chatHistoryList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No chat history yet</p>
                </div>
            `;
            return;
        }

        sessions.forEach((session) => {
            const messagePreview = session.message.length > 50 ?
                session.message.substring(0, 50) + '...' :
                session.message;

            const sessionElement = document.createElement('div');
            sessionElement.className = 'p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all cursor-pointer';

            const date = new Date(session.timestamp);
            const formattedDate = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            sessionElement.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm font-medium text-gray-900">Chat ${session.id + 1}</div>
                    <div class="text-xs text-gray-500">${formattedDate}</div>
                </div>
                <p class="text-sm text-gray-600">${messagePreview}</p>
            `;

            sessionElement.addEventListener('click', () => {
                const messageElement = this.chatMessages.children[session.id + 1]; // +1 to account for initial AI message
                if (messageElement) {
                    messageElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
                this.toggleSidebar();
            });

            chatHistoryList.appendChild(sessionElement);
        });
    }

    showSignedOutState() {
        const signedOutState = document.getElementById('signedOutState');
        const signedInState = document.getElementById('signedInState');

        if (signedOutState) signedOutState.classList.remove('hidden');
        if (signedInState) signedInState.classList.add('hidden');
    }

    saveConversationHistory() {
        if (this.currentUser && this.autoSave) {
            localStorage.setItem(
                `chatHistory_${this.currentUser.id}`,
                JSON.stringify(this.conversationHistory)
            );
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

    showChatInterface() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.remove('hidden');
        }

        if (this.currentUser) {
            if (this.userAvatar) this.userAvatar.src = this.currentUser.picture || '';
            if (this.userName) this.userName.textContent = this.currentUser.name || '';
            if (this.userEmail) this.userEmail.textContent = this.currentUser.email || '';
            if (this.userInfo) this.userInfo.classList.remove('hidden');
            this.loadSavedSettings();
        }

        this.focusInput();
    }

    signOut() {
        const previousUserId = this.currentUser.id;
        if (this.autoSave) {
            localStorage.removeItem(`chatHistory_${previousUserId}`);
        }

        this.currentUser = null;
        localStorage.removeItem('aiChatUser');

        if (this.userInfo) this.userInfo.classList.add('hidden');

        this.showSignedOutState();
        this.clearConversation();

        if (window.google && window.google.accounts) {
            window.google.accounts.id.disableAutoSelect();
        }
    }

    focusInput() {
        if (this.messageInput) {
            this.messageInput.focus();
        }
    }

    checkForSearchIntent(message) {
        const searchKeywords = ['weather', 'news', 'latest', 'date', 'time', 'temperature', 'forecast', 'what is', 'who is', 'define'];
        const lowerCaseMessage = message.toLowerCase();
        return searchKeywords.some(keyword => lowerCaseMessage.includes(keyword));
    }

    async performWebSearch(query) {
        console.log(`Performing web search for: ${query}`);
        if (query.toLowerCase().includes('date')) {
            return `Simulated Search Result: Today's date is ${new Date().toLocaleDateString()}.`;
        }
        if (query.toLowerCase().includes('weather')) {
            return "Simulated Search Result: The weather is currently sunny with a temperature of 25°C.";
        }
        return `No specific live result found for "${query}". General web search results would be here.`;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.conversationHistory.push({
            role: 'user',
            content: message
        });
        this.setInputState(false);
        this.messageInput.value = '';
        this.showTypingIndicator();

        try {
            let searchContext = null;
            if (this.checkForSearchIntent(message)) {
                searchContext = await this.performWebSearch(message);
            }

            const response = await this.callAPI(message, searchContext);

            this.hideTypingIndicator();
            this.addMessage(response, 'assistant');
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });
            this.saveConversationHistory();

        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.showError(error.message || 'An error occurred while processing your request.');
        } finally {
            this.setInputState(true);
            this.focusInput();
        }
    }

    async callAPI(message, searchContext = null) {
        const lowerMsg = message.toLowerCase();
        if (
            lowerMsg.includes('model') ||
            lowerMsg.includes('at41rv') ||
            lowerMsg.includes('what are you') ||
            lowerMsg.includes('tell me about') ||
            lowerMsg.includes('what is your name') ||
            lowerMsg.includes('who are you') ||
            lowerMsg.includes('what model') ||
            lowerMsg.includes('which model')
        ) {
            return "At41rv AI is the best model made by Atharv.\nGoogle-verified, you can ask anything.";
        }

        let apiMessages = [...this.conversationHistory];

        if (searchContext) {
            const augmentedContent = `Based on the following information: "${searchContext}", please answer this question: "${message}"`;
            apiMessages[apiMessages.length - 1] = {
                role: 'user',
                content: augmentedContent
            };
        }

        const requestBody = {
            model: this.model,
            messages: apiMessages,
            max_tokens: 1000,
            temperature: 0.7,
            stream: false
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error((errorData.error && errorData.error.message) || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;

        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        return assistantMessage;
    }


    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex';

        if (role === 'user') {
            messageDiv.classList.add('justify-end');
            messageDiv.innerHTML = `
                <div class="user-message rounded-2xl rounded-br-none px-6 py-4 max-w-lg shadow-md">
                    <p class="font-medium">${this.escapeHtml(content)}</p>
                </div>
            `;
        } else {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `
                <div class="ai-message rounded-2xl rounded-bl-none px-6 py-4 max-w-lg shadow-md">
                    <p class="text-gray-700 font-medium">${this.formatMessage(content)}</p>
                </div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        let formatted = this.escapeHtml(content);
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled || this.messageInput.value.trim().length === 0;

        if (enabled) {
            this.messageInput.classList.remove('opacity-50');
            this.sendButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
        } else {
            this.messageInput.classList.add('opacity-50');
            this.sendButton.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
        }
    }

    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.classList.remove('hidden');
        this.errorModal.classList.add('flex');
    }

    hideErrorModal() {
        this.errorModal.classList.add('hidden');
        this.errorModal.classList.remove('flex');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    clearConversation() {
        this.conversationHistory = [];
        this.chatMessages.innerHTML = `
            <div class="message-bubble flex justify-start">
                <div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl">
                    <p class="text-gray-700 text-lg font-medium leading-relaxed">
                        Hello! I'm At41rv AI. How can I help you today?
                    </p>
                </div>
            </div>
        `;
        if (this.currentUser && this.autoSave) {
            localStorage.removeItem(`chatHistory_${this.currentUser.id}`);
        }
    }
}

window.handleCredentialResponse = function(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));

        const userData = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        };

        window.aiChat.currentUser = userData;
        localStorage.setItem('aiChatUser', JSON.stringify(userData));

        window.aiChat.showChatInterface();
        window.aiChat.hideSettings();

        console.log('User signed in successfully:', userData.name);
    } catch (error) {
        console.error('Error handling Google Sign-In:', error);
        window.aiChat.showError('Failed to sign in with Google. Please try again.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (window.aiChat && confirm('Clear conversation history?')) {
            window.aiChat.clearConversation();
        }
    }
});
