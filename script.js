// =================================================================
// 1. FIREBASE CONFIGURATION
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDVqMiGSndJ_-emkCp1VUwOWXYwtjtzLM4",
    authDomain: "at41rvai-1abf9.firebaseapp.com",
    projectId: "at41rvai-1abf9",
    storageBucket: "at41rvai-1abf9.appspot.com",
    messagingSenderId: "127944898254", // From your project details
    appId: "ADD_YOUR_APP_ID_HERE" // Recommended: Get from Firebase Console
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase initialization error. Please check your firebaseConfig.", e);
    alert("Could not connect to the server. Please check your Firebase configuration.");
}

const auth = firebase.auth();
const db = firebase.firestore();

class AIChat {
    constructor() {
        // ... (rest of constructor is the same)
        this.apiKey = '';
        this.baseUrl = '';
        this.model = 'llama-3.1-8b-instant';
        this.conversationHistory = [];
        this.currentChatId = null;
        this.currentUser = null;
        this.autoSave = true;
        this.isSidebarOpen = false;

        this.initializeElements();
        this.attachEventListeners();
        this.initializeAuthStateListener();
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

    // =================================================================
    // 2. FIREBASE AUTHENTICATION
    // =================================================================

    initializeAuthStateListener() {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userData = {
                    id: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    picture: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.split('@')[0]}&background=random`,
                };
                this.currentUser = userData;
                this.updateUserInfoUI(this.currentUser);
                this.loadSavedSettings();
                this.showChatInterface();
                this.hideSettings();
            } else {
                this.currentUser = null;
                this.updateUserInfoUI(null);
                this.showSignedOutState();
                this.showWelcomeScreen();
            }
        });
    }

    setAuthButtonLoadingState(isLoading) {
        const buttons = [this.signInButton, this.signUpButton, this.googleSignInButton];
        buttons.forEach(button => {
            if (button) {
                button.disabled = isLoading;
                if (isLoading) {
                    button.dataset.originalText = button.innerHTML;
                    button.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
                    // For Google button, keep the text
                    if (button.id === 'googleSignInButton') {
                        button.innerHTML = button.dataset.originalText;
                        button.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                } else {
                    button.innerHTML = button.dataset.originalText || button.innerHTML;
                    if (button.id === 'googleSignInButton') {
                        button.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }
            }
        });
    }

    signUpWithEmail() {
        const email = this.signUpEmail.value;
        const password = this.signUpPassword.value;
        this.authError.textContent = '';

        if (!email || !password) {
            this.authError.textContent = 'Please enter both email and password.';
            return;
        }

        this.setAuthButtonLoadingState(true);
        auth.createUserWithEmailAndPassword(email, password)
            .catch(error => {
                this.authError.textContent = error.message;
                this.setAuthButtonLoadingState(false);
            });
    }

    signInWithEmail() {
        const email = this.signInEmail.value;
        const password = this.signInPassword.value;
        this.authError.textContent = '';

        if (!email || !password) {
            this.authError.textContent = 'Please enter both email and password.';
            return;
        }

        this.setAuthButtonLoadingState(true);
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                this.authError.textContent = error.message;
                this.setAuthButtonLoadingState(false);
            });
    }

    signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.setAuthButtonLoadingState(true);
        auth.signInWithPopup(provider).catch(error => {
            this.authError.textContent = `Google Sign-In Error: ${error.message}`;
            this.setAuthButtonLoadingState(false);
        });
    }

    signOut() {
        auth.signOut().catch((error) => {
            console.error('Sign out error', error);
        });
    }

    // ... (rest of the script is the same as the previous version)

    updateUserInfoUI(user) {
        if (user) {
            this.userInfo.classList.remove('hidden');
            this.userAvatar.src = user.picture;
            this.userName.textContent = user.name;
            this.userEmail.textContent = user.email;
        } else {
            this.userInfo.classList.add('hidden');
        }
    }

    // =================================================================
    // 3. UI and APP LOGIC
    // =================================================================

    initializeElements() {
        // Welcome Screen
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');

        // Main Chat UI
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
        this.shareButton = document.getElementById('shareButton');
        this.historyButton = document.getElementById('historyButton');
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.closeHistoryButton = document.getElementById('closeHistoryButton');

        // Settings & Auth Modal
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');
        this.signOutButton = document.getElementById('signOutButton');

        // Auth Forms
        this.signedInState = document.getElementById('signedInState');
        this.signedOutState = document.getElementById('signedOutState');
        this.authError = document.getElementById('authError');

        this.signInTabButton = document.getElementById('signInTabButton');
        this.signUpTabButton = document.getElementById('signUpTabButton');

        this.signInForm = document.getElementById('signInForm');
        this.signInEmail = document.getElementById('signInEmail');
        this.signInPassword = document.getElementById('signInPassword');
        this.signInButton = document.getElementById('signInButton');
        this.googleSignInButton = document.getElementById('googleSignInButton');

        this.signUpForm = document.getElementById('signUpForm');
        this.signUpEmail = document.getElementById('signUpEmail');
        this.signUpPassword = document.getElementById('signUpPassword');
        this.signUpButton = document.getElementById('signUpButton');

        // Error Modal
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');
    }

    attachEventListeners() {
        // Welcome Screen Buttons
        this.continueWithoutLogin.addEventListener('click', () => this.showChatInterface());
        this.signInForSync.addEventListener('click', () => this.showSettings());

        // Main UI Buttons
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.historyButton.addEventListener('click', () => this.toggleSidebar());
        this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        this.clearChatButton.addEventListener('click', () => {
            if (window.confirm('Are you sure you want to clear the conversation?')) {
                this.clearConversation();
            }
        });
        this.shareButton.addEventListener('click', () => this.shareConversation());

        // Chat Input
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = this.messageInput.value.trim().length === 0;
        });

        // Settings and Auth Modal Listeners
        this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        this.signOutButton.addEventListener('click', () => this.signOut());
        this.autoSaveToggle.addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
        });

        // Auth Form Listeners
        this.googleSignInButton.addEventListener('click', () => this.signInWithGoogle());
        this.signInButton.addEventListener('click', () => this.signInWithEmail());
        this.signUpButton.addEventListener('click', () => this.signUpWithEmail());

        this.signInTabButton.addEventListener('click', () => this.switchAuthTab('signIn'));
        this.signUpTabButton.addEventListener('click', () => this.switchAuthTab('signUp'));

        // Generic Modal Listeners
        this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
    }

    switchAuthTab(tab) {
        this.authError.textContent = ''; // Clear errors on tab switch
        if (tab === 'signIn') {
            this.signInTabButton.classList.add('active');
            this.signUpTabButton.classList.remove('active');
            this.signInForm.classList.remove('hidden');
            this.signUpForm.classList.add('hidden');
        } else {
            this.signInTabButton.classList.remove('active');
            this.signUpTabButton.classList.add('active');
            this.signInForm.classList.add('hidden');
            this.signUpForm.classList.remove('hidden');
        }
    }

    loadSavedSettings() {
        const autoSave = localStorage.getItem('autoSave');
        if (autoSave !== null) {
            this.autoSave = JSON.parse(autoSave);
            this.autoSaveToggle.checked = this.autoSave;
        }

        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            this.model = savedModel;
            this.modelSelector.value = savedModel;
            this.setModelConfig(savedModel);
        }

        if (this.currentUser && this.autoSave) {
            this.loadAllUserConversations();
        }
    }

    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
    }

    showChatInterface() {
        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        if (this.conversationHistory.length === 0) {
            this.clearConversation();
        }
        this.messageInput.focus();
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden', 'opacity-0');
        this.settingsModal.style.display = 'flex';
        if (this.currentUser) {
            this.signedInState.classList.remove('hidden');
            this.signedOutState.classList.add('hidden');
        } else {
            this.signedInState.classList.add('hidden');
            this.signedOutState.classList.remove('hidden');
            this.switchAuthTab('signIn'); // Default to sign-in tab
        }
    }

    hideSettings() {
        this.settingsModal.classList.add('opacity-0');
        setTimeout(() => {
            this.settingsModal.classList.add('hidden');
        }, 200);
    }

    showSignedOutState() {
        if (this.signedOutState) this.signedOutState.classList.remove('hidden');
        if (this.signedInState) this.signedInState.classList.add('hidden');
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        this.chatHistorySidebar.classList.toggle('active');
        if (this.isSidebarOpen && this.currentUser) {
            this.loadAllUserConversations();
        }
    }

    async loadAllUserConversations() {
        const chatHistoryList = document.getElementById('chatHistoryList');
        if (!chatHistoryList || !this.currentUser) return;

        chatHistoryList.innerHTML = '<div class="text-center py-8 text-gray-500"><p>Loading history...</p></div>';

        try {
            const snapshot = await db.collection('chats').doc(this.currentUser.id).collection('conversations').orderBy('timestamp', 'desc').get();

            if (snapshot.empty) {
                chatHistoryList.innerHTML = `<div class="text-center py-8 text-gray-500"><p>No chat history yet</p></div>`;
                return;
            }

            chatHistoryList.innerHTML = '';
            snapshot.forEach(doc => {
                const session = doc.data();
                const firstMessage = session.messages.find(m => m.role === 'user');
                const messagePreview = firstMessage ? firstMessage.content.substring(0, 50) + '...' : 'Chat session';

                const sessionElement = document.createElement('div');
                sessionElement.className = 'p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all cursor-pointer';

                const date = session.timestamp ? session.timestamp.toDate() : new Date();
                const formattedDate = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                sessionElement.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm font-medium text-gray-900 truncate">${messagePreview}</div>
                        <div class="text-xs text-gray-500 flex-shrink-0 ml-2">${formattedDate}</div>
                    </div>`;

                sessionElement.addEventListener('click', () => {
                    this.loadSpecificConversation(doc.id);
                    this.toggleSidebar();
                });
                chatHistoryList.appendChild(sessionElement);
            });
        } catch (error) {
            console.error("Error loading chat history:", error);
            chatHistoryList.innerHTML = `<div class="text-center py-8 text-red-500"><p>Could not load history.</p></div>`;
        }
    }


    async saveConversationHistory() {
        if (this.currentUser && this.autoSave && this.conversationHistory.length > 0) {
            try {
                if (!this.currentChatId) {
                    const newChatRef = db.collection('chats').doc(this.currentUser.id).collection('conversations').doc();
                    this.currentChatId = newChatRef.id;
                }
                await db.collection('chats').doc(this.currentUser.id).collection('conversations').doc(this.currentChatId).set({
                    messages: this.conversationHistory,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error("Error saving conversation:", error);
                this.showError("Could not save your conversation.");
            }
        }
    }

    async loadSpecificConversation(chatId) {
        this.currentChatId = chatId;
        try {
            const doc = await db.collection('chats').doc(this.currentUser.id).collection('conversations').doc(chatId).get();
            if (doc.exists) {
                this.conversationHistory = doc.data().messages;
                this.chatMessages.innerHTML = '';
                this.conversationHistory.forEach(msg => {
                    this.addMessage(msg.content, msg.role);
                });
                this.scrollToBottom();
            }
        } catch (error) {
            console.error("Error loading specific conversation:", error);
            this.showError("Could not load the selected chat.");
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
        this.conversationHistory.push({ role: 'user', content: message });
        this.setInputState(false);
        this.messageInput.value = '';
        this.sendButton.disabled = true;

        const lowerCaseMessage = message.toLowerCase();
        const modelKeywords = ['which model', 'what model', 'your model', 'model name', 'who are you', 'what are you', 'tell me about yourself', 'are you a model', 'model'];

        if (modelKeywords.some(keyword => lowerCaseMessage.includes(keyword))) {
            const responses = ["At41rv AI is very best LLM Model by Atharv", "see your's face then ask about me - at41rv"];
            const response = responses[Math.floor(Math.random() * responses.length)];
            this.addMessage(response, 'assistant');
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.setInputState(true);
            this.focusInput();
            this.saveConversationHistory();
            return;
        }

        this.showTypingIndicator();

        try {
            if (this.checkForLiveSearchIntent(message)) {
                const originalModel = this.model;
                this.setModelConfig('XenAI/gpt-4o-search-preview');
                this.baseUrl = 'https://samuraiapi.in/v1/chat/completions';
                this.apiKey = '78632757386';

                const searchResponse = await this.callAPI(message, 'XenAI/gpt-4o-search-preview');

                this.setModelConfig(originalModel);

                if (searchResponse.trim() !== '') {
                    this.addMessage(searchResponse, 'assistant');
                    this.conversationHistory.push({ role: 'assistant', content: searchResponse });
                }
            } else {
                const mainResponse = await this.callAPI(message, this.model);
                this.addMessage(mainResponse, 'assistant');
                this.conversationHistory.push({ role: 'assistant', content: mainResponse });
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
        let requestBody = {
            model: currentModel,
            messages: this.conversationHistory,
            max_tokens: 1000,
            stream: false
        };

        const response = await fetch(this.baseUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error((errorData.error && errorData.error.message) || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        let assistantMessage = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            assistantMessage = data.choices[0].message.content;
        }
        if (currentModel === 'deepseek-r1-distill-llama-70b') {
            assistantMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/, '').trim();
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
            messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-6 py-4 max-w-lg shadow-md"><p class="font-medium">${this.escapeHtml(content)}</p></div>`;
        } else {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-6 py-4 max-w-lg shadow-md"><p class="text-gray-700 font-medium">${this.formatMessage(content)}</p></div>`;
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

    focusInput() {
        if (this.messageInput) {
            this.messageInput.focus();
        }
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled || this.messageInput.value.trim().length === 0;
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

    async shareConversation() {
        if (!this.currentChatId) {
            this.showError("Please start a conversation before sharing.");
            return;
        }

        try {
            await db.collection('shared_chats').doc(this.currentChatId).set({
                messages: this.conversationHistory,
                sharedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${this.currentChatId}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert(`Shareable link copied to clipboard:\n${shareUrl}`);
            }, () => {
                this.showError("Failed to copy the link. You can manually copy it from here:\n" + shareUrl);
            });
        } catch (error) {
            this.showError(`Could not share conversation: ${error.message}`);
        }
    }

    clearConversation() {
        this.conversationHistory = [];
        this.currentChatId = null; // Start a new chat session
        this.chatMessages.innerHTML = `<div class="message-bubble flex justify-start"><div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl"><p class="text-gray-700 text-lg font-medium leading-relaxed">Hello! I'm At41rv AI. How can I help you today?</p></div></div>`;
    }

}


document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (window.aiChat && window.confirm('Clear conversation history?')) {
            window.aiChat.clearConversation();
        }
    }
});
