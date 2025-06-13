// =================================================================
// 1. FIREBASE CONFIGURATION
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDVqMiGSndJ_-emkCp1VUwOWXYwtjtzLM4",
    authDomain: "at41rvai-1abf9.firebaseapp.com",
    projectId: "at41rvai-1abf9",
    storageBucket: "at41rvai-1abf9.appspot.com",
    messagingSenderId: "127944898254",
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

// =================================================================
// 2. MAIN APP CLASS
// =================================================================
class AIChat {
    constructor() {
        this.apiKey = '';
        this.baseUrl = '';
        this.model = 'llama-3.1-8b-instant';
        this.conversationHistory = [];
        this.currentChatId = null;
        this.currentUser = null;
        this.autoSave = true;
        this.isSidebarOpen = false;
        this.historyListenerUnsubscribe = null;

        this.initializeElements();
        this.attachEventListeners();
        this.initializeAuthStateListener();
        this.setModelConfig(this.model);
    }

    // ==================================
    // 2a. FIREBASE AUTHENTICATION
    // ==================================

    initializeAuthStateListener() {
        auth.onAuthStateChanged(async(user) => { // Make this async
            // First, handle the case where there is no user (signed out)
            if (!user) {
                sessionStorage.removeItem('auth_just_reloaded'); // Clear flag on sign out
                this.currentUser = null;
                this.updateUserInfoUI(null);

                // Only show welcome screen if not viewing a shared chat
                const params = new URLSearchParams(window.location.search);
                if (!params.has('share')) {
                    this.showWelcomeScreen();
                }

                if (this.historyListenerUnsubscribe) this.historyListenerUnsubscribe();
                return;
            }

            // Check for Pro status
            let isPro = false;
            try {
                const proDoc = await db.collection('pro_users').doc(user.email).get();
                if (proDoc.exists) {
                    isPro = true;
                }
            } catch (error) {
                console.error("Could not check Pro status:", error);
            }

            // If there IS a user, check for our reload flag
            if (sessionStorage.getItem('auth_just_reloaded')) {
                // This is the execution AFTER the reload.
                // The flag is present, so we can proceed to show the chat interface.
                sessionStorage.removeItem('auth_just_reloaded'); // Clear the flag now that we've used it

                // Set up the user object and UI
                const userData = {
                    id: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    picture: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.charAt(0).toUpperCase()}&background=random&color=fff&size=128`,
                    isPro: isPro // Add pro status to user object
                };
                this.currentUser = userData;
                this.updateUserInfoUI(this.currentUser);
                this.loadSavedSettings();
                this.listenForUserConversations();

                // CRITICAL FIX: Directly show the chat interface, hiding the welcome screen.
                this.showChatInterface();
                this.hideSettings();

                // Check if admin to show admin button
                if (this.currentUser.email === 'at41rv@gmail.com') {
                    this.addAdminPanelButton();
                }

            } else {
                // This is the first execution right after a login/signup action.
                // The flag is NOT present, so we set it and trigger the one-time reload.
                sessionStorage.setItem('auth_just_reloaded', 'true');
                window.location.reload();
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
                    if (button.id !== 'googleSignInButton') {
                        button.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
                    } else {
                        button.classList.add('opacity-50');
                    }
                } else {
                    button.innerHTML = button.dataset.originalText || button.innerHTML;
                    if (button.id === 'googleSignInButton') {
                        button.classList.remove('opacity-50');
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
        if (this.historyListenerUnsubscribe) {
            this.historyListenerUnsubscribe();
            this.historyListenerUnsubscribe = null;
        }
        auth.signOut().catch((error) => {
            console.error('Sign out error', error);
        });
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
        this.appContainer = document.getElementById('appContainer');
        this.sharedChatView = document.getElementById('sharedChatView');
        this.sharedChatMessages = document.getElementById('sharedChatMessages');

        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');
        this.startFree = document.getElementById('startFree');

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
        this.chatHistoryList = document.getElementById('chatHistoryList');

        //this.homeButton = document.getElementById('homeButton'); // Removed in new UI
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.autoSaveToggle = document.getElementById('autoSaveToggle');
        this.signOutButton = document.getElementById('signOutButton');

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

        this.settingsUserAvatar = document.getElementById('settingsUserAvatar');
        this.settingsUserName = document.getElementById('settingsUserName');
        this.settingsUserEmail = document.getElementById('settingsUserEmail');

        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorModal = document.getElementById('closeErrorModal');

        // Subscription Modal
        this.subscriptionModal = document.getElementById('subscriptionModal');
        this.subscriptionModalContent = document.getElementById('subscriptionModalContent');
        this.continueFree = document.getElementById('continueFree');
        this.closeSubscriptionModal = document.getElementById('closeSubscriptionModal');

        // Admin Panel
        this.adminPanelButton = document.getElementById('adminPanelButton');
        this.adminPanelModal = document.getElementById('adminPanelModal');
        this.adminPanelContent = document.getElementById('adminPanelContent');
        this.closeAdminPanel = document.getElementById('closeAdminPanel');
        this.proUserEmail = document.getElementById('proUserEmail');
        this.addProUserButton = document.getElementById('addProUserButton');
        this.adminMessage = document.getElementById('adminMessage');
    }

    attachEventListeners() {
        // Landing page buttons
        this.continueWithoutLogin.addEventListener('click', () => this.showChatInterface());
        this.startFree.addEventListener('click', () => this.showChatInterface());
        this.signInForSync.addEventListener('click', () => this.signInWithGoogle());

        // Chat interface buttons
        //this.homeButton.addEventListener('click', () => this.showWelcomeScreen());
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.historyButton.addEventListener('click', () => this.toggleSidebar());
        this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        if (document.querySelector('.sidebar-overlay')) {
            document.querySelector('.sidebar-overlay').addEventListener('click', () => this.toggleSidebar());
        }

        this.clearChatButton.addEventListener('click', () => {
            if (this.conversationHistory.length > 0) {
                this.clearConversation();
            }
        });
        this.shareButton.addEventListener('click', () => this.shareConversation());
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Message input listeners
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = this.messageInput.value.trim().length === 0;
        });

        // Settings modal listeners
        this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        this.signOutButton.addEventListener('click', () => this.signOut());
        this.autoSaveToggle.addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            if (this.currentUser) localStorage.setItem(`autoSave_${this.currentUser.id}`, JSON.stringify(this.autoSave));
        });

        // Auth form listeners
        this.googleSignInButton.addEventListener('click', () => this.signInWithGoogle());
        this.signInButton.addEventListener('click', () => this.signInWithEmail());
        this.signUpButton.addEventListener('click', () => this.signUpWithEmail());
        this.signInTabButton.addEventListener('click', () => this.switchAuthTab('signIn'));
        this.signUpTabButton.addEventListener('click', () => this.switchAuthTab('signUp'));
        this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());

        // Subscription and Admin Panel Listeners
        this.continueFree.addEventListener('click', () => this.hideSubscriptionModal());
        this.closeSubscriptionModal.addEventListener('click', () => this.hideSubscriptionModal());
        if (this.closeAdminPanel) this.closeAdminPanel.addEventListener('click', () => this.hideAdminPanel());
        if (this.addProUserButton) this.addProUserButton.addEventListener('click', () => this.addProUser());

        // Model selector listener
        this.modelSelector.addEventListener('change', (e) => this.handleModelChange(e.target.value));
    }

    updateUserInfoUI(user) {
        if (user) {
            [this.userInfo, this.signedInState].forEach(el => el.classList.remove('hidden'));
            this.signedOutState.classList.add('hidden');

            [this.userAvatar, this.settingsUserAvatar].forEach(el => el.src = user.picture);
            [this.userName, this.settingsUserName].forEach(el => el.textContent = user.name);
            [this.userEmail, this.settingsUserEmail].forEach(el => el.textContent = user.email);

        } else {
            this.userInfo.classList.add('hidden');
            if (this.settingsModal.classList.contains('flex')) {
                this.signedInState.classList.add('hidden');
                this.signedOutState.classList.remove('hidden');
            }
        }
    }

    switchAuthTab(tab) {
        this.authError.textContent = '';
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
        if (!this.currentUser) return;

        const autoSave = localStorage.getItem(`autoSave_${this.currentUser.id}`);
        if (autoSave !== null) {
            this.autoSave = JSON.parse(autoSave);
        } else {
            this.autoSave = true; // Default to true
        }
        this.autoSaveToggle.checked = this.autoSave;

        const savedModel = localStorage.getItem(`selectedModel_${this.currentUser.id}`);
        if (savedModel) {
            this.model = savedModel;
            this.modelSelector.value = savedModel;
            this.setModelConfig(savedModel);
        }
    }

    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
    }

    showChatInterface() {
        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.chatInterface.classList.add('flex');
        if (!this.currentChatId) {
            this.clearConversation();
        }
        this.messageInput.focus();
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden');
        this.settingsModal.classList.add('flex');
        this.updateUserInfoUI(this.currentUser);
        if (!this.currentUser) {
            this.switchAuthTab('signIn');
        }
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
        this.settingsModal.classList.remove('flex');
    }

    // ==================================
    // Subscription and Admin Methods
    // ==================================

    showSubscriptionModal() {
        this.subscriptionModal.classList.remove('hidden');
        this.subscriptionModal.classList.add('flex');
        setTimeout(() => {
            this.subscriptionModal.classList.remove('opacity-0');
            this.subscriptionModalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    hideSubscriptionModal() {
        this.subscriptionModal.classList.add('opacity-0');
        this.subscriptionModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.subscriptionModal.classList.add('hidden');
            this.subscriptionModal.classList.remove('flex');
        }, 300);
    }

    showAdminPanel() {
        this.hideSettings(); // Hide settings modal first
        if (!this.adminPanelModal) return;
        this.adminPanelModal.classList.remove('hidden');
        this.adminPanelModal.classList.add('flex');
        setTimeout(() => {
            this.adminPanelModal.classList.remove('opacity-0');
            this.adminPanelContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    hideAdminPanel() {
        if (!this.adminPanelModal) return;
        this.adminPanelModal.classList.add('opacity-0');
        this.adminPanelContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.adminPanelModal.classList.add('hidden');
            this.adminPanelModal.classList.remove('flex');
        }, 300);
    }

    async handleModelChange(selectedModel) {
        if (selectedModel === 'deepseek-r1-distill-llama-70b') {
            if (!this.currentUser || !this.currentUser.isPro) {
                // Revert the selection
                this.modelSelector.value = 'llama-3.1-8b-instant';
                // Show the subscription modal
                this.showSubscriptionModal();
                return;
            }
        }
        this.setModelConfig(selectedModel);
        if (this.currentUser) localStorage.setItem(`selectedModel_${this.currentUser.id}`, selectedModel);
    }

    async addProUser() {
        const email = this.proUserEmail.value.trim();
        if (!email) {
            this.adminMessage.textContent = 'Please enter an email.';
            this.adminMessage.style.color = 'red';
            return;
        }

        this.adminMessage.textContent = 'Processing...';
        this.adminMessage.style.color = 'gray';

        try {
            await db.collection('pro_users').doc(email).set({
                isPro: true,
                grantedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.adminMessage.textContent = `Successfully granted Pro access to ${email}.`;
            this.adminMessage.style.color = 'green';
            this.proUserEmail.value = '';

        } catch (error) {
            console.error("Error granting Pro access:", error);
            this.adminMessage.textContent = 'Error: Could not grant access.';
            this.adminMessage.style.color = 'red';
        }
    }

    addAdminPanelButton() {
        const settingsContainer = document.getElementById('signedInState');
        if (settingsContainer && !document.getElementById('adminPanelButton')) { // Check if it doesn't exist
            const adminButton = document.createElement('button');
            adminButton.id = 'adminPanelButton';
            adminButton.className = 'w-full mt-2 bg-gray-700 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-all';
            adminButton.textContent = 'Admin Panel';
            adminButton.addEventListener('click', () => this.showAdminPanel());

            const signOutButton = document.getElementById('signOutButton');
            settingsContainer.insertBefore(adminButton, signOutButton);
        }
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        this.chatHistorySidebar.classList.toggle('active');
    }

    listenForUserConversations() {
        if (!this.currentUser) return;

        if (this.historyListenerUnsubscribe) {
            this.historyListenerUnsubscribe();
        }

        const conversationsRef = db.collection('chats').doc(this.currentUser.id).collection('conversations').orderBy('timestamp', 'desc');
        this.historyListenerUnsubscribe = conversationsRef.onSnapshot(snapshot => {
            if (snapshot.empty) {
                this.chatHistoryList.innerHTML = `<div class="text-center py-8 text-gray-500 text-sm px-4"><p>Your saved chats will appear here.</p></div>`;
                return;
            }
            this.chatHistoryList.innerHTML = '';
            snapshot.forEach(doc => {
                const session = doc.data();
                if (!session.messages || session.messages.length === 0) return;

                const firstMessage = session.messages.find(m => m.role === 'user');
                const title = firstMessage ? firstMessage.content : 'New Chat';
                const sessionElement = document.createElement('a');
                sessionElement.href = '#';
                sessionElement.className = `block p-3 mx-2 rounded-lg hover:bg-gray-100 truncate ${this.currentChatId === doc.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`;
                sessionElement.textContent = title;
                sessionElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.currentChatId !== doc.id) this.loadSpecificConversation(doc.id);
                    if (window.innerWidth < 768) this.toggleSidebar(); // Close sidebar on mobile after selection
                });
                this.chatHistoryList.appendChild(sessionElement);
            });
        }, error => {
            console.error("Error listening to chat history:", error);
            this.chatHistoryList.innerHTML = `<div class="text-center py-8 text-red-500 px-4"><p>Could not load chat history.</p></div>`;
        });
    }

    async saveConversationHistory() {
        if (!this.currentUser || !this.autoSave || this.conversationHistory.length === 0) {
            return;
        }
        try {
            const docRef = this.currentChatId ?
                db.collection('chats').doc(this.currentUser.id).collection('conversations').doc(this.currentChatId) :
                db.collection('chats').doc(this.currentUser.id).collection('conversations').doc();

            if (!this.currentChatId) {
                this.currentChatId = docRef.id;
            }

            await docRef.set({
                messages: this.conversationHistory,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                model: this.model
            }, { merge: true });

        } catch (error) {
            console.error("Error saving conversation:", error);
            this.showError("Could not save your conversation. Check your connection or Firestore rules.");
        }
    }

    async loadSpecificConversation(chatId) {
        if (!this.currentUser) return;

        try {
            const doc = await db.collection('chats').doc(this.currentUser.id).collection('conversations').doc(chatId).get();
            if (doc.exists) {
                const data = doc.data();
                this.conversationHistory = data.messages || [];
                this.currentChatId = chatId;
                this.chatMessages.innerHTML = '';
                this.conversationHistory.forEach(msg => {
                    this.addMessageToUI(msg.content, msg.role);
                });

                // Update model selector if model was saved with chat
                if (data.model) {
                    this.modelSelector.value = data.model;
                    this.setModelConfig(data.model);
                }

                // Visually update selected chat in history
                Array.from(this.chatHistoryList.children).forEach(child => {
                    child.classList.remove('bg-indigo-50', 'text-indigo-700', 'font-semibold');
                    if (child.textContent === (this.conversationHistory[0] ? .content || 'New Chat')) {
                        // A bit fragile, better would be to use data-id
                    }
                });
                // A better approach would be adding data-id to sessionElement and finding it here

                this.scrollToBottom();
            }
        } catch (error) {
            console.error("Error loading specific conversation:", error);
            this.showError("Could not load the selected chat.");
        }
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        if (enabled) {
            this.sendButton.disabled = this.messageInput.value.trim().length === 0;
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.setInputState(false);

        if (this.conversationHistory.length === 0) {
            this.chatMessages.innerHTML = '';
        }

        this.addMessageToUI(message, 'user');
        this.conversationHistory.push({ role: 'user', content: message });
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto'; // Reset height

        this.showTypingIndicator();
        this.scrollToBottom();

        try {
            const response = await this.callAPI(message, this.model);
            this.conversationHistory.push({ role: 'assistant', content: response });

            this.hideTypingIndicator(); // Hide typing before adding message for smoother feel
            this.addMessageToUI(response, 'assistant');
            await this.saveConversationHistory();
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToUI(`Error: ${error.message || 'An error occurred.'}`, 'error');
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
        // Keep conversation history concise
        const history = this.conversationHistory.slice(-10);

        let requestBody = {
            model: currentModel,
            messages: history,
            max_tokens: 2048,
            stream: false
        };

        const response = await fetch(this.baseUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error((errorData.error && errorData.error.message) || `API Error: ${response.status}`);
        }
        const data = await response.json();
        let assistantMessage = data.choices && data.choices[0] ? data.choices[0].message.content : "Sorry, I couldn't get a response.";

        return assistantMessage.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    }

    addMessageToUI(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex';

        if (role === 'user') {
            messageDiv.classList.add('justify-end');
            messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-5 py-3 max-w-lg shadow-sm"><p>${this.escapeHtml(content)}</p></div>`;
        } else if (role === 'error') {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `<div class="bg-red-100 text-red-700 border border-red-200 rounded-2xl rounded-bl-none px-5 py-3 max-w-lg shadow-sm"><p>${this.escapeHtml(content)}</p></div>`;
        } else { // assistant
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-5 py-3 max-w-lg shadow-sm"><div class="prose prose-sm max-w-none">${this.formatMessage(content)}</div></div>`;
        }
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Basic formatting, can be expanded with a library like Marked.js
        let formatted = this.escapeHtml(content);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    focusInput() {
        this.messageInput.focus();
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
        }, 50);
    }

    async shareConversation() {
        if (!this.currentUser) {
            this.showError("You must be logged in to share a conversation.");
            return;
        }
        if (!this.currentChatId || this.conversationHistory.length === 0) {
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
                alert(`Shareable link copied to clipboard!`);
            }, () => {
                this.showError("Failed to copy link. You can manually copy it:\n" + shareUrl);
            });
        } catch (error) {
            this.showError(`Could not share conversation: ${error.message}`);
        }
    }

    clearConversation() {
        this.conversationHistory = [];
        this.currentChatId = null;
        this.chatMessages.innerHTML = `<div class="message-bubble flex justify-start"><div class="ai-message rounded-2xl rounded-bl-none px-5 py-3 max-w-lg shadow-sm"><p class="font-medium">Hello! I'm At41rv AI. How can I help you today?</p></div></div>`;
        this.listenForUserConversations(); // To reset the active state in history
    }
}

// =================================================================
// 3. APP INITIALIZATION & SHARED CHAT HANDLER
// =================================================================

async function handleSharedChatView() {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');

    if (shareId) {
        const appContainer = document.getElementById('appContainer');
        const sharedView = document.getElementById('sharedChatView');
        const sharedMessagesContainer = document.getElementById('sharedChatMessages');

        appContainer.classList.add('hidden');
        sharedView.classList.remove('hidden');

        sharedMessagesContainer.innerHTML = '<p class="text-center text-gray-500">Loading shared conversation...</p>';

        try {
            const doc = await db.collection('shared_chats').doc(shareId).get();
            if (doc.exists) {
                const chatData = doc.data();
                sharedMessagesContainer.innerHTML = '';
                chatData.messages.forEach(msg => {
                    const tempChat = new AIChat(); // For formatting functions
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message-bubble flex';
                    if (msg.role === 'user') {
                        messageDiv.classList.add('justify-end');
                        messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-5 py-3 max-w-lg shadow-sm"><p>${tempChat.escapeHtml(msg.content)}</p></div>`;
                    } else {
                        messageDiv.classList.add('justify-start');
                        messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-5 py-3 max-w-lg shadow-sm"><div class="prose prose-sm max-w-none">${tempChat.formatMessage(msg.content)}</div></div>`;
                    }
                    sharedMessagesContainer.appendChild(messageDiv);
                });
            } else {
                sharedMessagesContainer.innerHTML = '<p class="text-center text-red-500">Sorry, this shared chat could not be found or has been deleted.</p>';
            }
        } catch (error) {
            console.error("Error loading shared chat:", error);
            sharedMessagesContainer.innerHTML = '<p class="text-center text-red-500">An error occurred while trying to load this chat.</p>';
        }

        return true;
    }
    return false;
}


document.addEventListener('DOMContentLoaded', async() => {
    const isSharedView = await handleSharedChatView();
    if (!isSharedView) {
        window.aiChat = new AIChat();
    }
});
