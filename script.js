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
        auth.onAuthStateChanged(async (user) => { // Make this async
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
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.historyButton.addEventListener('click', () => this.toggleSidebar());
        this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());
        this.clearChatButton.addEventListener('click', () => {
            if (window.confirm('Are you sure you want to start a new conversation? The current one will be saved to your history.')) {
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
            if (!this.sendButton.dataset.busy) {
                this.sendButton.disabled = this.messageInput.value.trim().length === 0;
            }
        });

        // Settings modal listeners
        this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        this.signOutButton.addEventListener('click', () => this.signOut());
        this.autoSaveToggle.addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
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
        this.closeAdminPanel.addEventListener('click', () => this.hideAdminPanel());
        this.addProUserButton.addEventListener('click', () => this.addProUser());

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
            if (this.settingsModal.style.display === 'flex') {
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
    }

    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
    }

    showChatInterface() {
        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        if (!this.currentChatId) {
            this.clearConversation();
        }
        this.messageInput.focus();
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden', 'opacity-0');
        this.settingsModal.style.display = 'flex';
        this.updateUserInfoUI(this.currentUser);
        if (!this.currentUser) {
            this.switchAuthTab('signIn');
        }
    }

    hideSettings() {
        this.settingsModal.classList.add('opacity-0');
        setTimeout(() => {
            this.settingsModal.style.display = 'none';
        }, 200);
    }
    
    // ==================================
    // Subscription and Admin Methods
    // ==================================
    
    showSubscriptionModal() {
        this.subscriptionModal.classList.remove('hidden');
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
        }, 300);
    }

    showAdminPanel() {
        this.hideSettings(); // Hide settings modal first
        this.adminPanelModal.classList.remove('hidden');
        setTimeout(() => {
            this.adminPanelModal.classList.remove('opacity-0');
            this.adminPanelContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    hideAdminPanel() {
        this.adminPanelModal.classList.add('opacity-0');
        this.adminPanelContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.adminPanelModal.classList.add('hidden');
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
        localStorage.setItem('selectedModel', selectedModel);
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
            adminButton.className = 'w-full mt-4 bg-gray-800 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-900 transition-all duration-300';
            adminButton.textContent = 'Admin Panel';
            adminButton.addEventListener('click', () => this.showAdminPanel());
            
            const signOutButton = document.getElementById('signOutButton');
            settingsContainer.insertBefore(adminButton, signOutButton);
        }
    }


    showSignedOutState() {
        if (this.signedOutState) this.signedOutState.classList.remove('hidden');
        if (this.signedInState) this.signedInState.classList.add('hidden');
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        this.chatHistorySidebar.classList.toggle('active');
    }

    listenForUserConversations() {
        if (!this.currentUser) return;

        if (this.historyListenerUnsubscribe) {
            this.historyListenerUnsubscribe(); // Unsubscribe from previous listener if it exists
        }

        this.historyListenerUnsubscribe = db.collection('chats').doc(this.currentUser.id).collection('conversations').orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    this.chatHistoryList.innerHTML = `<div class="text-center py-8 text-gray-500"><p>No chat history yet</p></div>`;
                    return;
                }
                this.chatHistoryList.innerHTML = '';
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
                    this.chatHistoryList.appendChild(sessionElement);
                });
            }, error => {
                console.error("Error listening to chat history:", error);
                this.chatHistoryList.innerHTML = `<div class="text-center py-8 text-red-500"><p>Could not load history.</p></div>`;
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
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error saving conversation:", error);
            this.showError("Could not save your conversation. Your database rules might be incorrect.");
        }
    }

    async loadSpecificConversation(chatId) {
        if (!this.currentUser) return;
        this.currentChatId = chatId;
        try {
            const doc = await db.collection('chats').doc(this.currentUser.id).collection('conversations').doc(chatId).get();
            if (doc.exists) {
                this.conversationHistory = doc.data().messages;
                this.chatMessages.innerHTML = '';
                this.conversationHistory.forEach(msg => {
                    this.addMessageToUI(msg.content, msg.role);
                });
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
            this.sendButton.removeAttribute('data-busy');
            this.sendButton.disabled = this.messageInput.value.trim().length === 0;
        } else {
            this.sendButton.setAttribute('data-busy', 'true');
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

        this.showTypingIndicator();

        try {
            const response = await this.callAPI(message, this.model);
            this.conversationHistory.push({ role: 'assistant', content: response });
            this.addMessageToUI(response, 'assistant');
            await this.saveConversationHistory();
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
        let assistantMessage = data.choices && data.choices[0] ? data.choices[0].message.content : "Sorry, I couldn't get a response.";

        if (currentModel === 'deepseek-r1-distill-llama-70b') {
            assistantMessage = assistantMessage.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
        return assistantMessage;
    }

    addMessageToUI(content, role) {
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
        }, 100);
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
        this.chatMessages.innerHTML = `<div class="message-bubble flex justify-start"><div class="ai-message welcome-message rounded-2xl rounded-bl-lg px-8 py-6 max-w-2xl"><p class="text-gray-700 text-lg font-medium leading-relaxed">Hello! I'm At41rv AI. How can I help you today?</p></div></div>`;
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
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message-bubble flex';
                    if (msg.role === 'user') {
                        messageDiv.classList.add('justify-end');
                        messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-6 py-4 max-w-lg shadow-md"><p class="font-medium">${new AIChat().escapeHtml(msg.content)}</p></div>`;
                    } else {
                        messageDiv.classList.add('justify-start');
                        messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-6 py-4 max-w-lg shadow-md"><p class="text-gray-700 font-medium">${new AIChat().formatMessage(msg.content)}</p></div>`;
                    }
                    sharedMessagesContainer.appendChild(messageDiv);
                });
            } else {
                sharedMessagesContainer.innerHTML = '<p class="text-center text-red-500">Sorry, this shared chat could not be found.</p>';
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
    const inSharedView = await handleSharedChatView();
    if (!inSharedView) {
        window.aiChat = new AIChat();
    }
});
