class AIChat {
    constructor() {
        this.apiKey = ''; // This will be set based on the selected model
        this.baseUrl = ''; // This will be set based on the selected model
        this.model = 'llama-3.1-8b-instant'; // Default to Model 1
        this.conversationHistory = [];
        this.currentUser = null;
        this.autoSave = true;
        this.isSidebarOpen = false;

        this.initializeElements();
        this.attachEventListeners();
        this.loadSavedSettings();
        this.showWelcomeScreen();

        // Set initial model based on default
        this.setModelConfig(this.model);
    }

    // New method to set API key and base URL based on selected model
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

    loadSavedSettings() {
        const savedUser = localStorage.getItem('aiChatUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        const autoSave = localStorage.getItem('autoSave');
        if (autoSave !== null) {
            this.autoSave = JSON.parse(autoSave);
            if (this.autoSaveToggle) {
                this.autoSaveToggle.checked = this.autoSave;
            }
        }

        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            this.model = savedModel;
            if (this.modelSelector) {
                this.modelSelector.value = savedModel;
            }
            this.setModelConfig(savedModel); // Set config based on saved model
        }


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
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');

        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');

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
    }

    attachEventListeners() {
        if (this.continueWithoutLogin) {
            this.continueWithoutLogin.addEventListener('click', () => this.startChatting());
        }

        if (this.signInForSync) {
            this.signInForSync.addEventListener('click', () => this.showSettings());
        }

        if (this.modelSelector) {
            this.modelSelector.addEventListener('change', (e) => {
                this.setModelConfig(e.target.value); // Update model and its config
                localStorage.setItem('selectedModel', this.model); // Save selected model
            });
        }

        this.attachSettingsListeners();

        if (this.historyButton) {
            this.historyButton.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.closeHistoryButton) {
            this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        }

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

        const signOutButton = document.getElementById('signOutButton');
        if (signOutButton) {
            signOutButton.addEventListener('click', () => this.signOut());
        }

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
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

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
        const previousUserId = this.currentUser ? this.currentUser.id : null;
        if (previousUserId && this.autoSave) {
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

    checkForLiveSearchIntent(message) {
        const keywords = ['weather', 'news', 'latest', 'date', 'time', 'temperature', 'forecast', 'current events', 'stock price'];
        const lowerCaseMessage = message.toLowerCase();
        return keywords.some(keyword => lowerCaseMessage.includes(keyword));
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

        // --- Start of new logic for custom responses ---
        const lowerCaseMessage = message.toLowerCase();
        const modelKeywords = [
            'which model', 'what model', 'your model', 'model name',
            'who are you', 'what are you', 'tell me about yourself',
            'are you a model', 'model'
        ];

        // Check if the exact message is "model" or contains any of the keywords
        if (modelKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
            const responses = [
                "At41rv AI is very best LLM Model by Atharv",
                "see your's face then ask about me - at41rv"
            ];
            const response = responses[Math.floor(Math.random() * responses.length)];

            this.addMessage(response, 'assistant');
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.setInputState(true);
            this.focusInput();
            this.saveConversationHistory();
            return; // Exit the function to prevent API call
        }
        // --- End of new logic ---

        this.showTypingIndicator();

        try {
            let finalResponse = '';

            // Check for live search intent first
            if (this.checkForLiveSearchIntent(message)) {
                // Temporarily override model and API key for search
                const originalModel = this.model;
                const originalApiKey = this.apiKey;
                const originalBaseUrl = this.baseUrl;

                this.model = 'XenAI/gpt-4o-search-preview'; // This model isn't in your provided list, keeping the original from the file
                this.baseUrl = 'https://samuraiapi.in/v1/chat/completions'; // Keeping the original base URL from the file
                this.apiKey = '78632757386'; // Keeping the original API key from the file

                const searchResponse = await this.callAPI(message, this.model); // Pass the model explicitly
                finalResponse = searchResponse;

                // Restore original model and API key
                this.model = originalModel;
                this.apiKey = originalApiKey;
                this.baseUrl = originalBaseUrl;

                // Add search response to history only if it's distinct
                if (searchResponse.trim() !== '') {
                    this.addMessage(searchResponse, 'assistant');
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: searchResponse
                    });
                }
            }

            // Always call the currently selected model
            const mainResponse = await this.callAPI(message, this.model); // Use the currently selected model
            if (finalResponse === '' || finalResponse !== mainResponse) { // Avoid duplicate messages if search and main give same answer
                this.addMessage(mainResponse, 'assistant');
                this.conversationHistory.push({
                    role: 'assistant',
                    content: mainResponse
                });
            }


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


    async callAPI(message, currentModel) {
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        let requestBody = {};
        if (currentModel === 'deepseek-r1-distill-llama-70b') {
            requestBody = {
                contents: this.conversationHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{
                        text: msg.content
                    }]
                }))
            };
            // Gemini API uses 'model' as role for assistant. Adjusting it back for consistency if needed later.
            requestBody.contents[requestBody.contents.length - 1].role = 'user'; // Last message is always user's
            if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'assistant') {
                requestBody.contents[0].role = 'model';
            }


        } else { // For Groq (llama-3.1-8b-instant) and others
            requestBody = {
                model: currentModel,
                messages: this.conversationHistory,
                max_tokens: 1000,
                stream: false
            };
        }

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
        let assistantMessage = '';

        if (currentModel === 'deepseek-r1-distill-llama-70b') {
            assistantMessage = data.candidates[0].content.parts[0].text;
        } else {
            assistantMessage = data.choices[0].message.content;
        }


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
        if (this.typingIndicator) {
            this.typingIndicator.classList.remove('hidden');
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.classList.add('hidden');
        }
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

        window.aiChat.hideSettings();
        window.aiChat.showChatInterface();
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
