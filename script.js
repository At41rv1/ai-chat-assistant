class AIChat {
    constructor() {
        this.apiKey = 'ddc-a4f-796282249bb7466383eaabebc348d027';
        this.baseUrl = 'https://api.a4f.co/v1/chat/completions';
        this.model = 'provider-4/gpt-4.1';
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

        // Mobile sidebar toggle
        const toggleSidebarButton = document.getElementById('toggleSidebarButton');
        const closeSidebarButton = document.getElementById('closeSidebarButton');

        if (toggleSidebarButton) {
            toggleSidebarButton.addEventListener('click', () => this.toggleSidebar());
        }

        if (closeSidebarButton) {
            closeSidebarButton.addEventListener('click', () => this.closeSidebar());
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isSidebarOpen && 
                !e.target.closest('#chatHistorySidebar') && 
                !e.target.closest('#toggleSidebarButton')) {
                this.closeSidebar();
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
                    this.sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    this.sendButton.classList.add('opacity-50', 'cursor-not-allowed');
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
        
        if (this.historyButton) {
            this.historyButton.addEventListener('click', () => this.toggleChatHistory());
        }

        if (this.closeHistoryButton) {
            this.closeHistoryButton.addEventListener('click', () => this.toggleChatHistory());
        }
    }

    startChatting() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.remove('hidden');
            
            // Initialize chat with welcome message if no history
            if (this.chatMessages && this.chatMessages.children.length === 0) {
                this.chatMessages.innerHTML = `
                    <div class="message-bubble flex justify-start">
                        <div class="ai-message welcome-message rounded-3xl rounded-bl-lg px-8 py-6 max-w-md">
                            <p class="text-gray-700 font-medium">
                                Hello! I'm your AI assistant. How can I help you today?
                            </p>
                        </div>
                    </div>
                `;
            }

            // Re-initialize elements that are now visible
            this.settingsButton = document.getElementById('settingsButton');
            this.settingsModal = document.getElementById('settingsModal');
            this.closeSettingsModal = document.getElementById('closeSettingsModal');
            
            // Re-attach settings listeners
            this.attachSettingsListeners();
            
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
        this.isSidebarOpen = !this.isSidebarOpen;
        const sidebar = document.getElementById('chatHistorySidebar');
        const backdrop = sidebar.querySelector('.bg-black\\/50');
        const panel = sidebar.querySelector('.glass-effect');
        
        if (this.isSidebarOpen) {
            sidebar.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // Wait a bit for the display:none to be removed
            requestAnimationFrame(() => {
                if (backdrop) backdrop.classList.add('opacity-100');
                if (panel) {
                    panel.classList.add('opacity-100');
                    panel.classList.remove('translate-x-full');
                }
            });
        } else {
            this.closeSidebar();
        }
    }

    closeSidebar() {
        if (this.isSidebarOpen) {
            this.isSidebarOpen = false;
            const sidebar = document.getElementById('chatHistorySidebar');
            const backdrop = sidebar.querySelector('.bg-black\\/50');
            const panel = sidebar.querySelector('.glass-effect');
            
            if (backdrop) backdrop.classList.remove('opacity-100');
            if (panel) {
                panel.classList.remove('opacity-100');
                panel.classList.add('translate-x-full');
            }
            document.body.style.overflow = '';
            
            // Wait for the transition to complete before hiding
            setTimeout(() => {
                sidebar.classList.add('hidden');
            }, 300);
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
        if (!chatHistoryList || !this.currentUser) return;

        // Clear existing history
        chatHistoryList.innerHTML = '';

        // Get saved chat sessions
        const savedSessions = localStorage.getItem(`chatSessions_${this.currentUser.id}`);
        const sessions = savedSessions ? JSON.parse(savedSessions) : [];

        sessions.forEach((session, index) => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-all';

            const date = new Date(session.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            sessionElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium text-gray-800">Chat ${index + 1}</div>
                        <div class="text-sm text-gray-500">${formattedDate}</div>
                    </div>
                    <button class="text-gray-400 hover:text-gray-600" data-session-id="${index}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
            `;

            // Add click event to load this chat session
            sessionElement.addEventListener('click', () => {
                this.loadChatSession(session);
            });

            chatHistoryList.appendChild(sessionElement);
        });
    }

    loadChatSession(session) {
        if (!session || !session.messages) return;

        // Clear current chat
        this.conversationHistory = [];
        this.chatMessages.innerHTML = '';

        // Load messages from session
        session.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role);
            this.conversationHistory.push(msg);
        });

        this.scrollToBottom();
    }

    saveChatSession() {
        if (!this.currentUser || !this.autoSave || this.conversationHistory.length === 0) return;

        const savedSessions = localStorage.getItem(`chatSessions_${this.currentUser.id}`);
        let sessions = savedSessions ? JSON.parse(savedSessions) : [];

        // Add new session
        sessions.push({
            timestamp: new Date().toISOString(),
            messages: this.conversationHistory
        });

        // Keep only last 10 sessions
        if (sessions.length > 10) {
            sessions = sessions.slice(-10);
        }

        localStorage.setItem(`chatSessions_${this.currentUser.id}`, JSON.stringify(sessions));
        this.loadChatHistory(); // Refresh the history sidebar
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
        this.chatMessages.innerHTML = ''; // Clear existing messages
        this.conversationHistory.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });
        this.scrollToBottom();
    }

    initializeGoogleAuth() {
        // Check if user is already logged in (from localStorage)
        const savedUser = localStorage.getItem('aiChatUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showChatInterface();
        } else {
            this.showLoginScreen();
        }
    }

    initiateGoogleSignIn() {
        // This will be called by the custom button
        // The actual sign-in is handled by the Google Sign-In button
        console.log('Initiating Google Sign-In...');
    }

    showLoginScreen() {
        if (this.loginScreen) {
            this.loginScreen.classList.remove('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.add('hidden');
        }
    }

    showChatInterface() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
        if (this.chatInterface) {
            this.chatInterface.classList.remove('hidden');
        }

        // Update user info in the interface
        if (this.currentUser) {
            if (this.userAvatar) {
                this.userAvatar.src = this.currentUser.picture || '';
            }
            if (this.userName) {
                this.userName.textContent = this.currentUser.name || '';
            }
            if (this.userEmail) {
                this.userEmail.textContent = this.currentUser.email || '';
            }
            if (this.userInfo) {
                this.userInfo.classList.remove('hidden');
            }
            this.loadChatHistory();
        }

        this.focusInput();
    }
    
    signOut() {
        // Clear user data
        this.currentUser = null;
        localStorage.removeItem('aiChatUser');
    
        // Update UI
        const userInfo = document.getElementById('userInfo');
        const chatHistorySidebar = document.getElementById('chatHistorySidebar');
    
        if (userInfo) {
            userInfo.classList.add('hidden');
        }
    
        if (chatHistorySidebar) {
            chatHistorySidebar.classList.add('hidden');
        }
    
        // Show signed out state in settings
        this.showSignedOutState();
    
        // Clear conversation history if auto-save was enabled
        if (this.autoSave) {
            this.clearConversation();
        }
    
        // Sign out from Google
        if (window.google && window.google.accounts) {
            window.google.accounts.id.disableAutoSelect();
        }
    }

    focusInput() {
        if (this.messageInput) {
            this.messageInput.focus();
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Disable input while processing
        this.setInputState(false);

        // Add user message to chat
        this.addMessage(message, 'user');

        // Clear input
        this.messageInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to API
            const response = await this.callAPI(message);

            // Hide typing indicator
            this.hideTypingIndicator();

            // Add AI response to chat
            this.addMessage(response, 'assistant');
            
            this.saveConversationHistory();



        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.showError(error.message || 'An error occurred while processing your request.');
        } finally {
            // Re-enable input
            this.setInputState(true);
            this.focusInput();
        }
    }

    async callAPI(message) {
        // Add message to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message
        });

        const requestBody = {
            model: this.model,
            messages: this.conversationHistory,
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

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from API');
        }

        const assistantMessage = data.choices[0].message.content;

        // Add assistant response to conversation history
        this.conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        // Keep conversation history manageable (last 20 messages)
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
                <div class="user-message rounded-3xl rounded-br-lg px-8 py-6 max-w-md">
                    <p class="font-medium">${this.escapeHtml(content)}</p>
                </div>
            `;
        } else {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `
                <div class="ai-message rounded-3xl rounded-bl-lg px-8 py-6 max-w-md">
                    <p class="text-gray-700 font-medium">${this.formatMessage(content)}</p>
                </div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Basic formatting for AI responses
        let formatted = this.escapeHtml(content);

        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        // Bold text **text**
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic text *text*
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
            if (this.messageInput.value.trim().length > 0) {
                this.sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } else {
            this.messageInput.classList.add('opacity-50');
            this.sendButton.classList.add('opacity-50', 'cursor-not-allowed');
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

    // Method to clear conversation
    clearConversation() {
        this.conversationHistory = [];
        this.chatMessages.innerHTML = `
            <div class="message-bubble flex justify-start">
                <div class="ai-message welcome-message rounded-3xl rounded-bl-lg px-8 py-6 max-w-md">
                    <p class="text-gray-700 font-medium">
                        Hello! I'm your AI assistant. How can I help you today?
                    </p>
                </div>
            </div>
        `;
        if (this.currentUser) {
            localStorage.removeItem(`chatHistory_${this.currentUser.id}`);
            this.saveChatSession();
        }
    }
}

// Global callback function for Google Sign-In
window.handleCredentialResponse = function(response) {
    try {
        // Decode the JWT token to get user information
        const payload = JSON.parse(atob(response.credential.split('.')[1]));

        const userData = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            given_name: payload.given_name,
            family_name: payload.family_name
        };

        // Save user data
        window.aiChat.currentUser = userData;
        localStorage.setItem('aiChatUser', JSON.stringify(userData));

        // Show chat interface
        window.aiChat.showChatInterface();
        window.aiChat.hideSettings();


        console.log('User signed in successfully:', userData.name);
    } catch (error) {
        console.error('Error handling Google Sign-In:', error);
        window.aiChat.showError('Failed to sign in with Google. Please try again.');
    }
};

// Initialize the chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});

// Add keyboard shortcut for clearing conversation (Ctrl+L or Cmd+L)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (window.aiChat && confirm('Clear conversation history?')) {
            window.aiChat.clearConversation();
        }
    }
});

// End of script
