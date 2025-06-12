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
        this.initializeUser(); // New initialization flow
    }

    initializeUser() {
        const userProfile = localStorage.getItem('aiChatUserProfile');
        if (userProfile) {
            this.currentUser = JSON.parse(userProfile);
            this.setModelConfig(this.model);
            this.loadSavedSettings();
            this.startChatting();
        } else {
            this.showProfileCreation();
        }
    }

    showProfileCreation() {
        if (this.profileCreationModal) {
            this.profileCreationModal.classList.remove('hidden');
            this.profileCreationModal.classList.add('flex');
        }
    }

    handleProfileCreation() {
        const username = this.usernameInput.value.trim();
        if (!username) {
            alert('Please enter a username.');
            return;
        }

        const newId = this.generateRandomId();
        this.currentUser = {
            id: newId,
            username: username,
            googleProfile: null
        };

        localStorage.setItem('aiChatUserProfile', JSON.stringify(this.currentUser));
        this.trackProfile(this.currentUser);

        if (this.profileCreationModal) {
            this.profileCreationModal.classList.add('hidden');
            this.profileCreationModal.classList.remove('flex');
        }
        
        this.setModelConfig(this.model);
        this.loadSavedSettings();
        this.startChatting();
    }
    
    generateRandomId(length = 7) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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
        // Admin Check
        if (this.currentUser && this.currentUser.googleProfile && this.currentUser.googleProfile.email === 'at41rv@gmail.com') {
            this.isAdmin = true;
        } else {
            this.isAdmin = false;
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
            this.setModelConfig(savedModel);
        }

        if (this.currentUser && this.autoSave) {
            const savedHistory = localStorage.getItem(`chatHistory_${this.currentUser.id}`);
            if (savedHistory) {
                this.conversationHistory = JSON.parse(savedHistory);
                this.loadConversationHistory();
            }
        }
        this.updateAdminUI();
    }

    showWelcomeScreen() {
        // This is now effectively replaced by the profile creation or direct chat view.
        // We keep it for the HTML elements that might still be referenced.
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
    }

    initializeElements() {
        this.profileCreationModal = document.getElementById('profileCreationModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.createProfileButton = document.getElementById('createProfileButton');

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
        
        this.adminButton = document.getElementById('adminButton');
        this.adminModal = document.getElementById('adminModal');
        this.closeAdminModal = document.getElementById('closeAdminModal');
        this.adminUserList = document.getElementById('adminUserList');
        this.adminChatView = document.getElementById('adminChatView');
    }

    attachEventListeners() {
        if(this.createProfileButton) {
            this.createProfileButton.addEventListener('click', () => this.handleProfileCreation());
        }
        if(this.usernameInput) {
             this.usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleProfileCreation();
                }
            });
        }
        
        if (this.continueWithoutLogin) {
            this.continueWithoutLogin.addEventListener('click', () => this.initializeUser());
        }
        if (this.signInForSync) {
            this.signInForSync.addEventListener('click', () => this.initializeUser());
        }

        if (this.modelSelector) {
            this.modelSelector.addEventListener('change', (e) => {
                this.setModelConfig(e.target.value);
                localStorage.setItem('selectedModel', this.model);
            });
        }

        this.attachSettingsListeners();
        this.attachAdminListeners();

        if (this.historyButton) this.historyButton.addEventListener('click', () => this.toggleSidebar());
        if (this.closeHistoryButton) this.closeHistoryButton.addEventListener('click', () => this.toggleSidebar());

        document.addEventListener('click', (e) => {
            if (this.chatHistorySidebar && this.chatHistorySidebar.classList.contains('active') && !e.target.closest('#chatHistorySidebar') && !e.target.closest('#historyButton')) {
                this.toggleSidebar();
            }
        });

        if (this.autoSaveToggle) {
            this.autoSaveToggle.addEventListener('change', (e) => {
                this.autoSave = e.target.checked;
                localStorage.setItem('autoSave', JSON.stringify(this.autoSave));
                if (this.currentUser && this.autoSave) this.saveConversationHistory();
            });
        }

        const signOutButton = document.getElementById('signOutButton');
        if (signOutButton) signOutButton.addEventListener('click', () => this.signOut());
        if (this.clearChatButton) {
            this.clearChatButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the conversation?')) this.clearConversation();
            });
        }
        if (this.sendButton) this.sendButton.addEventListener('click', () => this.sendMessage());

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
                this.sendButton.classList.toggle('disabled:opacity-50', message.length === 0);
                this.sendButton.classList.toggle('disabled:cursor-not-allowed', message.length === 0);
            });
        }

        if (this.closeErrorModal) this.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
        if (this.errorModal) {
            this.errorModal.addEventListener('click', (e) => {
                if (e.target === this.errorModal) this.hideErrorModal();
            });
        }
    }


    startChatting() {
        if(this.welcomeScreen) this.welcomeScreen.classList.add('hidden');
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
            this.updateUserInfoDisplay();
            this.messageInput.focus();
        }
    }

    updateUserInfoDisplay() {
        if (!this.currentUser) return;
        
        if (this.currentUser.googleProfile) {
             if (this.userAvatar) this.userAvatar.src = this.currentUser.googleProfile.picture || '';
             if (this.userName) this.userName.textContent = this.currentUser.googleProfile.name || '';
             if (this.userEmail) this.userEmail.textContent = this.currentUser.googleProfile.email || '';
             if (this.userInfo) this.userInfo.classList.remove('hidden');
        } else {
            if (this.userAvatar) this.userAvatar.src = ''; // Default avatar
            if (this.userName) this.userName.textContent = this.currentUser.username;
            if (this.userEmail) this.userEmail.textContent = `ID: ${this.currentUser.id}`;
            if (this.userInfo) this.userInfo.classList.remove('hidden');
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
            if (this.currentUser && this.currentUser.googleProfile) {
                this.showSignedInState();
            } else {
                this.showSignedOutState();
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hideSettings();
            }, { once: true });
        }
    }

    attachSettingsListeners() {
        if (this.settingsButton) this.settingsButton.addEventListener('click', () => { this.showSettings(); });
        if (this.closeSettingsModal) this.closeSettingsModal.addEventListener('click', () => { this.hideSettings(); });
        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) this.hideSettings();
            });
        }
    }

    toggleSidebar() {
        if (this.chatHistorySidebar) {
            this.isSidebarOpen = !this.isSidebarOpen;
            this.chatHistorySidebar.classList.toggle('active');
            if (this.isSidebarOpen) this.loadChatHistory();
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
            if (avatar) avatar.src = this.currentUser.googleProfile.picture || '';
            if (name) name.textContent = this.currentUser.googleProfile.name || '';
            if (email) email.textContent = this.currentUser.googleProfile.email || '';
        }
    }

    loadChatHistory() { /* ... unchanged ... */ }

    showSignedOutState() {
        const signedOutState = document.getElementById('signedOutState');
        const signedInState = document.getElementById('signedInState');
        if (signedOutState) signedOutState.classList.remove('hidden');
        if (signedInState) signedInState.classList.add('hidden');
    }

    saveConversationHistory() {
        if (this.currentUser && this.autoSave) {
            localStorage.setItem(`chatHistory_${this.currentUser.id}`, JSON.stringify(this.conversationHistory));
        }
    }

    loadConversationHistory() {
        this.chatMessages.innerHTML = '';
        this.addMessage("Hello! I'm At41rv AI. How can I help you today?", 'assistant');
        this.conversationHistory.forEach(msg => this.addMessage(msg.content, msg.role));
        this.scrollToBottom();
    }

    signOut() {
        // Only signs out of Google, doesn't destroy the profile
        if (this.currentUser && this.currentUser.googleProfile) {
            this.currentUser.googleProfile = null;
            this.isAdmin = false;
            localStorage.setItem('aiChatUserProfile', JSON.stringify(this.currentUser));
            this.trackProfile(this.currentUser);
            
            this.showSignedOutState();
            this.updateUserInfoDisplay();
            this.updateAdminUI();

            if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
            }
            alert("You have signed out of Google. Your local profile and chat history remain.");
        } else {
             alert("You are not signed in with Google.");
        }
    }

    focusInput() { if (this.messageInput) this.messageInput.focus(); }
    checkForLiveSearchIntent(message) { /* ... unchanged ... */ }
    async sendMessage() { /* ... unchanged ... */ }
    async callAPI(message, currentModel) { /* ... unchanged ... */ }
    addMessage(content, role) { /* ... unchanged ... */ }
    formatMessage(content) { /* ... unchanged ... */ }
    escapeHtml(text) { /* ... unchanged ... */ }
    setInputState(enabled) { /* ... unchanged ... */ }
    showTypingIndicator() { /* ... unchanged ... */ }
    hideTypingIndicator() { /* ... unchanged ... */ }
    showError(message) { /* ... unchanged ... */ }
    hideErrorModal() { /* ... unchanged ... */ }
    scrollToBottom() { /* ... unchanged ... */ }
    clearConversation() { /* ... unchanged ... */ }
    
    // --- ADMIN PANEL LOGIC ---

    updateAdminUI() {
        if (this.adminButton) {
            this.adminButton.classList.toggle('hidden', !this.isAdmin);
        }
    }

    attachAdminListeners() {
        if (this.adminButton) this.adminButton.addEventListener('click', () => this.showAdminPanel());
        if (this.closeAdminModal) this.closeAdminModal.addEventListener('click', () => this.hideAdminPanel());
        if (this.adminModal) {
            this.adminModal.addEventListener('click', (e) => {
                if (e.target === this.adminModal) this.hideAdminPanel();
            });
        }
    }

    showAdminPanel() {
        if (!this.isAdmin) return;
        this.populateAdminUserList();
        if (this.adminModal) {
            this.adminModal.classList.remove('hidden');
            this.adminModal.style.display = 'flex';
             requestAnimationFrame(() => { this.adminModal.style.opacity = '1'; });
        }
    }

    hideAdminPanel() {
        if (this.adminModal) {
            this.adminModal.style.opacity = '0';
            setTimeout(() => {
                this.adminModal.classList.add('hidden');
                this.adminModal.style.display = 'none';
            }, 200);
        }
    }
    
    populateAdminUserList() {
        if (!this.adminUserList) return;
        const profiles = JSON.parse(localStorage.getItem('allChatProfiles')) || [];
        this.adminUserList.innerHTML = '';
        
        if(profiles.length === 0){
            this.adminUserList.innerHTML = `<p class="text-gray-500 text-sm">No user profiles found in this browser.</p>`;
            return;
        }

        profiles.forEach(profile => {
            const userElement = document.createElement('div');
            userElement.className = 'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100';
            userElement.dataset.userId = profile.id;
            
            const avatar = profile.googleProfile ? profile.googleProfile.picture : 'https://via.placeholder.com/40/64748B/FFFFFF?text=' + profile.username.charAt(0).toUpperCase();
            const emailInfo = profile.googleProfile ? `<div class="text-xs text-gray-500">${this.escapeHtml(profile.googleProfile.email)}</div>` : '';

            userElement.innerHTML = `
                <img src="${avatar}" alt="Avatar" class="w-10 h-10 rounded-full">
                <div>
                    <div class="font-semibold text-sm text-gray-800">${this.escapeHtml(profile.username)}</div>
                    <div class="text-xs text-gray-600 font-mono">ID: ${this.escapeHtml(profile.id)}</div>
                    ${emailInfo}
                </div>
            `;
            
            userElement.addEventListener('click', () => {
                this.adminUserList.querySelectorAll('.bg-gray-200').forEach(el => el.classList.remove('bg-gray-200'));
                userElement.classList.add('bg-gray-200');
                this.displayUserHistory(profile.id);
            });
            this.adminUserList.appendChild(userElement);
        });
    }
    
    displayUserHistory(userId) { /* ... unchanged from previous version ... */ }

    trackProfile(profileData) {
        if (!profileData || !profileData.id) return;
        let profiles = JSON.parse(localStorage.getItem('allChatProfiles')) || [];
        let profileMap = new Map(profiles.map(p => [p.id, p]));
        profileMap.set(profileData.id, profileData);
        localStorage.setItem('allChatProfiles', JSON.stringify(Array.from(profileMap.values())));
    }
}

window.handleCredentialResponse = function(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const aiChat = window.aiChat;

        if (aiChat.currentUser) {
            // Merge Google data into existing profile
            aiChat.currentUser.googleProfile = {
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
            };
            // Optionally update the main username to Google's name
            aiChat.currentUser.username = payload.name;

            // Save and track the updated profile
            localStorage.setItem('aiChatUserProfile', JSON.stringify(aiChat.currentUser));
            aiChat.trackProfile(aiChat.currentUser);

            // Check for admin
            if (payload.email === 'at41rv@gmail.com') {
                aiChat.isAdmin = true;
            }
            
            aiChat.hideSettings();
            aiChat.updateUserInfoDisplay();
            aiChat.updateAdminUI();
            aiChat.showSignedInState();
            console.log('Google account linked successfully:', payload.name);
        } else {
             console.error('Cannot link Google Account: No local user profile found.');
             aiChat.showError('Could not link Google Account. Please create a local profile first.');
        }

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
