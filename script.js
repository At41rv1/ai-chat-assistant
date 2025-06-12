/**
 * AIChat Class
 *
 * This script manages the entire functionality of the AI Chat application.
 * It has been updated to work with a secure backend server.
 *
 * MAJOR CHANGES:
 * 1.  REMOVED API KEYS: API keys are no longer stored on the client. The script
 * now sends chat requests to a local server endpoint (`/api/chat/completions`)
 * which is responsible for securely calling the AI model's API.
 *
 * 2.  SERVER-SIDE STORAGE: Chat history is no longer saved in localStorage.
 * It is fetched from and saved to the server, enabling cross-device sync.
 *
 * 3.  JWT AUTHENTICATION: The client stores a JWT upon login and sends it in the
 * Authorization header for all protected API calls.
 *
 * 4.  SECURE ADMIN PANEL: The admin panel now fetches user lists and their
 * chat histories from secure, admin-only server endpoints.
 */
class AIChat {
    constructor() {
        this.model = 'llama-3.1-8b-instant';
        this.conversationHistory = [];
        this.currentUser = null;
        this.isAdmin = false;
        
        // Base URL for your own backend server
        this.apiBaseUrl = ''; // e.g., 'http://localhost:3000' or your production URL

        this.initializeElements();
        this.attachEventListeners();
        this.init();
    }

    async init() {
        this.loadToken();
        if (this.currentUser) {
            this.isAdmin = this.currentUser.role === 'admin';
            this.showChatInterface();
            await this.loadConversationFromServer();
        } else {
            this.showWelcomeScreen();
        }
        this.updateAdminUI();
    }

    initializeElements() {
        // Main Screens
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatInterface = document.getElementById('chatInterface');

        // Buttons
        this.continueWithoutLogin = document.getElementById('continueWithoutLogin');
        this.signInForSync = document.getElementById('signInForSync');
        this.sendButton = document.getElementById('sendButton');
        this.clearChatButton = document.getElementById('clearChatButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.adminButton = document.getElementById('adminButton');
        this.historyButton = document.getElementById('historyButton');
        this.closeHistoryButton = document.getElementById('closeHistoryButton');

        // UI Components
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.modelSelector = document.getElementById('modelSelector');
        
        // User Info Display
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');

        // Sidebar
        this.chatHistorySidebar = document.getElementById('chatHistorySidebar');
        this.chatHistoryList = document.getElementById('chatHistoryList');
    }

    attachEventListeners() {
        // Welcome Screen
        this.continueWithoutLogin.addEventListener('click', () => this.startChatting(false));
        this.signInForSync.addEventListener('click', () => this.showSettingsModal());
        
        // Chat Controls
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = this.messageInput.value.trim().length === 0;
            // Auto-resize textarea
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
        });
        
        // Header Buttons
        this.clearChatButton.addEventListener('click', () => this.clearConversation());
        this.settingsButton.addEventListener('click', () => this.showSettingsModal());
        if (this.adminButton) this.adminButton.addEventListener('click', () => this.showAdminModal());
        if (this.historyButton) this.historyButton.addEventListener('click', () => this.toggleSidebar());
    }
    
    // --- AUTHENTICATION & USER STATE ---

    loadToken() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // Decode token to get user info without verifying signature (server does that)
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 > Date.now()) {
                    this.currentUser = payload;
                } else {
                    localStorage.removeItem('authToken'); // Token expired
                }
            } catch (e) {
                console.error("Failed to decode token", e);
                localStorage.removeItem('authToken');
            }
        }
    }

    handleSignIn(token) {
        localStorage.setItem('authToken', token);
        this.loadToken();
        this.isAdmin = this.currentUser.role === 'admin';
        this.closeModal();
        this.startChatting(true);
    }
    
    signOut() {
        this.currentUser = null;
        this.isAdmin = false;
        this.conversationHistory = [];
        localStorage.removeItem('authToken');
        if (window.google) google.accounts.id.disableAutoSelect();
        this.showWelcomeScreen();
        this.updateAdminUI();
    }
    
    // --- UI & SCREEN MANAGEMENT ---
    
    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.chatInterface.classList.add('hidden');
    }

    async startChatting(isLoggedIn) {
        this.welcomeScreen.classList.add('hidden');
        this.chatInterface.classList.remove('hidden');
        this.chatInterface.classList.add('flex');
        
        if (isLoggedIn) {
            this.userInfo.classList.remove('hidden');
            this.userAvatar.src = this.currentUser.picture || 'https://via.placeholder.com/40';
            this.userName.textContent = this.currentUser.name || this.currentUser.username;
            await this.loadConversationFromServer();
        } else {
            this.userInfo.classList.add('hidden');
            this.renderConversation(); // Render with just the welcome message
        }
        this.updateAdminUI();
        this.messageInput.focus();
    }
    
    updateAdminUI() {
        if (this.adminButton) {
            this.adminButton.classList.toggle('hidden', !this.isAdmin);
        }
    }
    
    toggleSidebar() {
        this.chatHistorySidebar.classList.toggle('active');
        if (this.chatHistorySidebar.classList.contains('active')) {
            this.renderHistoryList();
        }
    }
    
    // --- CHAT LOGIC ---
    
    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (!messageText) return;

        const tempMessageId = `temp_${Date.now()}`;
        this.conversationHistory.push({ role: 'user', content: messageText });
        this.renderConversation();

        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();

        try {
            // IMPORTANT: This request goes to YOUR server, not directly to Groq.
            // Your server will add the API key and forward the request.
            const response = await fetch(`${this.apiBaseUrl}/api/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.conversationHistory
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to get response from server.');
            }

            const data = await response.json();
            const aiMessage = data.choices[0].message.content;

            this.conversationHistory.push({ role: 'assistant', content: aiMessage });
            
            // If logged in, save the full conversation to the server.
            if (this.currentUser) {
                await this.saveConversationToServer();
            }

        } catch (error) {
            console.error('Send message error:', error);
            this.conversationHistory.push({ role: 'assistant', content: `Error: ${error.message}` });
        } finally {
            this.typingIndicator.classList.add('hidden');
            this.renderConversation();
            this.messageInput.focus();
        }
    }

    async clearConversation() {
        if (confirm('Are you sure you want to clear this conversation?')) {
            this.conversationHistory = [];
            if (this.currentUser) {
                // If logged in, we should ideally have a dedicated endpoint
                // to clear history on the server. For now, we just save an empty array.
                await this.saveConversationToServer();
            }
            this.renderConversation();
        }
    }

    // --- SERVER COMMUNICATION ---
    
    async loadConversationFromServer() {
        if (!this.currentUser) return;
        this.chatMessages.innerHTML = `<p class="text-center text-gray-500">Loading history...</p>`;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/chats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) throw new Error('Could not fetch history.');
            const serverHistory = await response.json();
            this.conversationHistory = serverHistory || [];
        } catch (error) {
            console.error('Failed to load history:', error);
            this.showErrorModal('Could not load your chat history.');
            this.conversationHistory = [];
        } finally {
            this.renderConversation();
        }
    }

    async saveConversationToServer() {
        if (!this.currentUser || this.conversationHistory.length === 0) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ messages: this.conversationHistory })
            });
            if (!response.ok) throw new Error('Failed to save history.');
        } catch (error) {
            console.error('Failed to save history:', error);
            // Optionally notify user that history might not be saved
        }
    }

    // --- RENDERING ---

    renderConversation() {
        this.chatMessages.innerHTML = '';
        if (this.conversationHistory.length === 0) {
            this.addMessageToDOM({ role: 'assistant', content: "Hello! I'm At41rv AI. How can I help you today?" });
        } else {
            this.conversationHistory.forEach(msg => this.addMessageToDOM(msg));
        }
        this.scrollToBottom();
    }
    
    addMessageToDOM(message) {
        const messageWrapper = document.createElement('div');
        const isUser = message.role === 'user';
        
        messageWrapper.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'}`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl px-4 py-3 shadow ${isUser ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`;
        messageBubble.innerHTML = this.formatMessage(message.content);
        
        messageWrapper.appendChild(messageBubble);
        this.chatMessages.appendChild(messageWrapper);
    }
    
    renderHistoryList() {
        // This method can be enhanced to show conversation summaries
        this.chatHistoryList.innerHTML = '';
        const userMessages = this.conversationHistory.filter(m => m.role === 'user');
        if (userMessages.length === 0) {
            this.chatHistoryList.innerHTML = `<p class="p-4 text-sm text-gray-500">No history found.</p>`;
            return;
        }
        
        userMessages.forEach((msg, index) => {
            const item = document.createElement('div');
            item.className = 'p-3 rounded-lg hover:bg-gray-100 cursor-pointer text-sm text-gray-700 truncate';
            item.textContent = `Chat ${index + 1}: ${msg.content}`;
            this.chatHistoryList.appendChild(item);
        });
    }

    formatMessage(content) {
        // Basic formatting for markdown-like syntax
        let html = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/\n/g, '<br>'); // Newlines
        return html;
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 0);
    }
    
    // --- MODALS (Settings, Admin, Error) ---
    
    createModal(id, title, content) {
        this.closeModal(); // Close any existing modal
        const modalOverlay = document.createElement('div');
        modalOverlay.id = id;
        modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        
        modalOverlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-xl font-bold">${title}</h3>
                    <button id="closeModalBtn" class="p-2 text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div class="p-6 overflow-y-auto">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) this.closeModal();
        });
    }

    closeModal() {
        const modal = document.querySelector('.fixed.inset-0.z-50');
        if (modal) modal.remove();
    }

    showSettingsModal() {
        const content = this.currentUser ? `
            <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl mb-4">
                <img src="${this.currentUser.picture || 'https://via.placeholder.com/50'}" alt="Avatar" class="w-12 h-12 rounded-full">
                <div>
                    <div class="font-semibold">${this.currentUser.name || this.currentUser.username}</div>
                    <div class="text-sm text-gray-600">${this.currentUser.email || ''}</div>
                </div>
            </div>
            <button id="signOutBtn" class="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600">Sign Out</button>
        ` : `
            <p class="text-gray-600 mb-4">Sign in to sync conversations across devices.</p>
            <div id="g_id_onload" data-client_id="465923208288-hb4182d5ro58k30pkshh4knu3i62bvrh.apps.googleusercontent.com" data-context="signin" data-ux_mode="popup" data-callback="handleCredentialResponse" data-auto_prompt="false"></div>
            <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline" data-text="signin_with" data-size="large" data-logo_alignment="left"></div>
        `;
        
        this.createModal('settingsModal', 'Settings', content);
        
        if (this.currentUser) {
            document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());
        } else {
            // Renders the Google sign-in button
            google.accounts.id.renderButton(document.querySelector('.g_id_signin'), { theme: "outline", size: "large" });
        }
    }
    
    async showAdminModal() {
        if (!this.isAdmin) return;
        
        const content = `<div id="adminUserList" class="space-y-2">Loading users...</div><hr class="my-4"><h4 class="font-bold mb-2">Chat History</h4><div id="adminChatView" class="h-64 overflow-y-auto bg-gray-100 p-2 rounded-lg border">Select a user to view their history.</div>`;
        this.createModal('adminModal', 'Admin Panel', content);

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) throw new Error('Failed to load admin data.');
            const data = await response.json();
            
            const userListEl = document.getElementById('adminUserList');
            userListEl.innerHTML = '';
            data.users.forEach(user => {
                const userEl = document.createElement('div');
                userEl.className = 'p-2 rounded-lg hover:bg-gray-100 cursor-pointer';
                userEl.textContent = user.name || user.username || user.email;
                userEl.addEventListener('click', () => this.displayAdminUserHistory(user.id));
                userListEl.appendChild(userEl);
            });

        } catch (error) {
            document.getElementById('adminUserList').textContent = `Error: ${error.message}`;
        }
    }
    
    async displayAdminUserHistory(userId) {
        const chatView = document.getElementById('adminChatView');
        chatView.innerHTML = 'Loading history...';
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/chats/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) throw new Error('Could not fetch user history.');
            const history = await response.json();
            chatView.innerHTML = '';
            if (history.length === 0) {
                chatView.innerHTML = 'No history for this user.';
                return;
            }
            history.forEach(msg => {
                const msgEl = document.createElement('p');
                msgEl.className = `text-sm mb-1 ${msg.role === 'user' ? 'text-blue-700' : 'text-green-700'}`;
                msgEl.textContent = `[${msg.role}]: ${msg.content}`;
                chatView.appendChild(msgEl);
            });
        } catch(error) {
            chatView.textContent = `Error: ${error.message}`;
        }
    }

    showErrorModal(message) {
        this.createModal('errorModal', 'Error', `<p>${message}</p>`);
    }
}

// --- Global Google Sign-In Callback ---
function handleCredentialResponse(response) {
    // This function is called by the Google Sign-In library.
    // It will make a POST request to our own server's /api/auth/google endpoint.
    fetch('/api/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            window.aiChat.handleSignIn(data.token);
        } else {
            throw new Error(data.message || 'Google sign-in failed.');
        }
    })
    .catch(error => {
        console.error('Google Sign-In Error:', error);
        window.aiChat.showErrorModal(error.message);
    });
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
