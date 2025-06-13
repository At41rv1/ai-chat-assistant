class AIChat {
    constructor() {
        this.apiKey = '';
        this.baseUrl = '';
        this.model = 'llama-3.1-8b-instant';
        this.conversationHistory = [];
        this.currentChatId = null;
        this.currentUser = null;

        this.initializeElements();
        this.attachEventListeners();
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyDVqMiGSndJ_-emkCp1VUwOWXYwtjtzLM4",
                authDomain: "at41rvai-1abf9.firebaseapp.com",
                projectId: "at41rvai-1abf9",
                storageBucket: "at41rvai-1abf9.appspot.com",
            };
            firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.initializeAuthStateListener();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            alert("Could not connect to the server.");
        }
    }

    initializeElements() {
        // Main containers
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatInterface = document.getElementById('chatInterface');

        // Welcome screen buttons
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');
        this.startFree = document.getElementById('startFree');

        // Chat interface elements
        this.homeButton = document.getElementById('homeButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.modelSelector = document.getElementById('modelSelector');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');

        // Settings & Auth Modal
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.signedInState = document.getElementById('signedInState');
        this.signedOutState = document.getElementById('signedOutState');
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.signOutButton = document.getElementById('signOutButton');
        this.signInTabButton = document.getElementById('signInTabButton');
        this.signUpTabButton = document.getElementById('signUpTabButton');
        this.signInForm = document.getElementById('signInForm');
        this.signUpForm = document.getElementById('signUpForm');
        this.signInEmail = document.getElementById('signInEmail');
        this.signInPassword = document.getElementById('signInPassword');
        this.signInButton = document.getElementById('signInButton');
        this.signUpEmail = document.getElementById('signUpEmail');
        this.signUpPassword = document.getElementById('signUpPassword');
        this.signUpButton = document.getElementById('signUpButton');
        this.googleSignInButton = document.getElementById('googleSignInButton');
        this.authError = document.getElementById('authError');
        
        // Subscription Modal
        this.subscriptionModal = document.getElementById('subscriptionModal');
        this.closeSubscriptionModal = document.getElementById('closeSubscriptionModal');
        
        // Admin Panel
        this.adminPanelModal = document.getElementById('adminPanelModal');
        this.closeAdminPanel = document.getElementById('closeAdminPanel');
        this.proUserEmail = document.getElementById('proUserEmail');
        this.addProUserButton = document.getElementById('addProUserButton');
        this.adminMessage = document.getElementById('adminMessage');
    }

    attachEventListeners() {
        // Welcome Screen
        this.continueWithoutLogin.addEventListener('click', () => this.showChatInterface());
        this.startFree.addEventListener('click', () => this.showChatInterface());
        this.signInForSync.addEventListener('click', () => this.signInWithGoogle());

        // Chat Interface
        this.homeButton.addEventListener('click', () => this.showWelcomeScreen());
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.sendMessage());
        this.modelSelector.addEventListener('change', (e) => this.handleModelChange(e.target.value));

        // Modals
        this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        this.closeSubscriptionModal.addEventListener('click', () => this.hideSubscriptionModal());
        this.closeAdminPanel.addEventListener('click', () => this.hideAdminPanel());

        // Auth
        this.signOutButton.addEventListener('click', () => this.auth.signOut());
        this.googleSignInButton.addEventListener('click', () => this.signInWithGoogle());
        this.signInButton.addEventListener('click', () => this.signInWithEmail());
        this.signUpButton.addEventListener('click', () => this.signUpWithEmail());
        this.signInTabButton.addEventListener('click', () => this.switchAuthTab('signIn'));
        this.signUpTabButton.addEventListener('click', () => this.switchAuthTab('signUp'));

        // Admin
        this.addProUserButton.addEventListener('click', () => this.addProUser());
    }

    initializeAuthStateListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                const proDoc = await this.db.collection('pro_users').doc(user.email).get();
                this.currentUser = {
                    uid: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    picture: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.charAt(0).toUpperCase()}`,
                    isPro: proDoc.exists,
                    isAdmin: user.email === 'at41rv@gmail.com'
                };
                this.updateUserInfoUI(this.currentUser);
                this.showChatInterface();
            } else {
                this.currentUser = null;
                this.updateUserInfoUI(null);
                this.showWelcomeScreen();
            }
        });
    }

    signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.auth.signInWithPopup(provider).catch(error => {
            this.authError.textContent = error.message;
        });
    }

    signInWithEmail() {
        const email = this.signInEmail.value;
        const password = this.signInPassword.value;
        this.auth.signInWithEmailAndPassword(email, password).catch(error => {
            this.authError.textContent = error.message;
        });
    }
    
    signUpWithEmail() {
        const email = this.signUpEmail.value;
        const password = this.signUpPassword.value;
        this.auth.createUserWithEmailAndPassword(email, password).catch(error => {
            this.authError.textContent = error.message;
        });
    }

    updateUserInfoUI(user) {
        if (user) {
            this.signedInState.classList.remove('hidden');
            this.signedOutState.classList.add('hidden');
            this.userAvatar.src = user.picture;
            this.userName.textContent = user.name;
            this.userEmail.textContent = user.email;
            
            // Add Admin Panel button if user is admin
            if (user.isAdmin && !document.getElementById('adminPanelButton')) {
                const adminBtn = document.createElement('button');
                adminBtn.id = 'adminPanelButton';
                adminBtn.textContent = 'Admin Panel';
                adminBtn.className = 'w-full mt-2 bg-gray-800 text-white py-2 rounded-lg';
                adminBtn.onclick = () => this.showAdminPanel();
                this.signOutButton.before(adminBtn);
            }
        } else {
            this.signedInState.classList.add('hidden');
            this.signedOutState.classList.remove('hidden');
            const adminBtn = document.getElementById('adminPanelButton');
            if (adminBtn) adminBtn.remove();
        }
    }

    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (!messageText) return;

        this.addMessageToUI(messageText, 'user');
        this.conversationHistory.push({ role: 'user', content: messageText });
        this.messageInput.value = '';

        try {
            this.setModelConfig(this.model);
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.conversationHistory,
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}. This could be due to a network issue, an invalid API key, or a Content Security Policy block. Please check the browser console for more details.`);
            }
            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;
            this.addMessageToUI(assistantMessage, 'assistant');
            this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
        } catch (error) {
            console.error('API Call Error:', error);
            this.addMessageToUI(error.message, 'error');
        }
    }

    addMessageToUI(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble p-3 rounded-lg max-w-lg shadow ${
            role === 'user' ? 'bg-blue-500 text-white self-end' :
            role === 'error' ? 'bg-red-500 text-white self-start' : 'bg-gray-200 text-black self-start'
        }`;
        messageDiv.textContent = content;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleModelChange(selectedModel) {
        if (selectedModel === 'deepseek-r1-distill-llama-70b' && (!this.currentUser || !this.currentUser.isPro)) {
            this.showSubscriptionModal();
            this.modelSelector.value = 'llama-3.1-8b-instant'; // Revert selection
            return;
        }
        this.model = selectedModel;
    }

    setModelConfig(modelName) {
        if (modelName === 'llama-3.1-8b-instant') {
            this.apiKey = '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';
            this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        } else if (modelName === 'deepseek-r1-distill-llama-70b') {
            this.apiKey = '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';
            this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        }
    }
    
    async addProUser() {
        const email = this.proUserEmail.value.trim();
        if (!email) {
            this.adminMessage.textContent = 'Please enter an email address.';
            this.adminMessage.style.color = 'red';
            return;
        }

        this.adminMessage.textContent = 'Processing...';
        this.adminMessage.style.color = 'gray';

        try {
            const proDoc = await this.db.collection('pro_users').doc(email).get();
            if (proDoc.exists) {
                this.adminMessage.textContent = 'This user already has Pro access.';
                this.adminMessage.style.color = 'orange';
            } else {
                await this.db.collection('pro_users').doc(email).set({
                    isPro: true,
                    grantedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    grantedBy: this.currentUser.email
                });
                this.adminMessage.textContent = `Successfully granted Pro access to ${email}.`;
                this.adminMessage.style.color = 'green';
                this.proUserEmail.value = '';
            }
        } catch (error) {
            console.error("Error granting Pro access:", error);
            this.adminMessage.textContent = 'Error: Could not grant access.';
            this.adminMessage.style.color = 'red';
        }
    }
    
    showWelcomeScreen() { this.welcomeScreen.classList.remove('hidden'); this.chatInterface.classList.add('hidden'); }
    showChatInterface() { this.welcomeScreen.classList.add('hidden'); this.chatInterface.classList.remove('hidden'); }
    showSettings() { this.settingsModal.classList.remove('hidden'); }
    hideSettings() { this.settingsModal.classList.add('hidden'); }
    showSubscriptionModal() { this.subscriptionModal.classList.remove('hidden'); }
    hideSubscriptionModal() { this.subscriptionModal.classList.add('hidden'); }
    showAdminPanel() { this.hideSettings(); this.adminPanelModal.classList.remove('hidden'); }
    hideAdminPanel() { this.adminPanelModal.classList.add('hidden'); }
    switchAuthTab(tab) {
        if (tab === 'signIn') {
            this.signInForm.classList.remove('hidden');
            this.signUpForm.classList.add('hidden');
            this.signInTabButton.classList.add('active');
            this.signUpTabButton.classList.remove('active');
        } else {
            this.signInForm.classList.add('hidden');
            this.signUpForm.classList.remove('hidden');
            this.signInTabButton.classList.remove('active');
            this.signUpTabButton.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
