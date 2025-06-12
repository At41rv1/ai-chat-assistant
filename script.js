// =================================================================
// 1. PASTE YOUR FIREBASE CONFIG FROM YOUR FIREBASE CONSOLE HERE
// =================================================================
const firebaseConfig = {
    //
    // IMPORTANT: REPLACE THIS WITH THE NEW KEY YOU GENERATED
    //
    apiKey: "AIzaSyDVqMiGSndJ_-emkCp1VUwOWXYwtjtzLM4", 
    authDomain: "at41rvai-1abf9.firebaseapp.com",
    projectId: "at41rvai-1abf9",
    storageBucket: "at41rvai-1abf9.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID_FROM_CONSOLE",
    appId: "YOUR_APP_ID_FROM_CONSOLE"
};

// Initialize Firebase Services
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // Initialize Firestore

class AIChat {
    constructor() {
        this.conversationHistory = [];
        this.currentUser = null;
        this.model = 'llama-3.1-8b-instant';
        this.isSidebarOpen = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeAuthStateListener();
        this.checkForSharedChat();
    }

    initializeElements() {
        // This should include ALL elements your app interacts with
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatInterface = document.getElementById('chatInterface');
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsButton = document.getElementById('settingsButton');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        
        // Login/User UI
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.signedOutState = document.getElementById('signedOutState');
        this.signedInState = document.getElementById('signedInState');
        this.signOutButton = document.getElementById('signOutButton');
        this.signInOptions = document.getElementById('signInOptions');
        this.showEmailFormButton = document.getElementById('showEmailFormButton');
        this.emailSignInForm = document.getElementById('emailSignInForm');
        this.emailForSignIn = document.getElementById('emailForSignIn');
        this.sendSignInLinkButton = document.getElementById('sendSignInLinkButton');
        this.emailLinkMessage = document.getElementById('emailLinkMessage');
        
        // Chat UI
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearChatButton = document.getElementById('clearChatButton');
        this.modelSelector = document.getElementById('modelSelector');

        // Share UI
        this.shareChatButton = document.getElementById('shareChatButton');
        this.shareModal = document.getElementById('shareModal');
        this.sharedChatMessages = document.getElementById('sharedChatMessages');
        this.closeShareModal = document.getElementById('closeShareModal');
    }

    attachEventListeners() {
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.closeSettingsModal.addEventListener('click', () => this.hideSettings());
        this.signOutButton.addEventListener('click', () => this.signOut());
        this.showEmailFormButton.addEventListener('click', () => {
            this.signInOptions.classList.add('hidden');
            this.emailSignInForm.classList.remove('hidden');
        });
        this.sendSignInLinkButton.addEventListener('click', () => this.sendSignInLink());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.clearChatButton.addEventListener('click', () => this.clearConversation());
        this.shareChatButton.addEventListener('click', () => this.shareChat());
        this.closeShareModal.addEventListener('click', () => {
            this.shareModal.classList.add('hidden');
            // Remove the share parameter from URL without reloading
            window.history.pushState({}, '', window.location.pathname);
        });
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    // =================================================================
    // AUTHENTICATION & DATA HANDLING
    // =================================================================

    initializeAuthStateListener() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = {
                    id: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    picture: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.split('@')[0]}&background=random`,
                };
                this.showChatInterface();
                this.updateUserInfoUI();
                this.loadChatHistoryFromFirestore();
            } else {
                this.currentUser = null;
                // Only show welcome if not viewing a shared chat
                if (!window.location.search.includes('?share=')) {
                    this.showWelcomeScreen();
                }
            }
        });
        this.handleEmailLinkSignIn();
    }

    async handleEmailLinkSignIn() {
        if (auth.isSignInWithEmailLink(window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
            }
            try {
                await auth.signInWithEmailLink(email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) { alert(`Error signing in: ${error.message}`); }
        }
    }

    sendSignInLink() {
        const email = this.emailForSignIn.value;
        if (!email) { alert("Please enter your email address."); return; }
        const actionCodeSettings = { url: window.location.href, handleCodeInApp: true };
        this.sendSignInLinkButton.disabled = true;
        this.sendSignInLinkButton.textContent = "Sending...";
        auth.sendSignInLinkToEmail(email, actionCodeSettings)
            .then(() => {
                window.localStorage.setItem('emailForSignIn', email);
                this.emailLinkMessage.textContent = `A sign-in link has been sent to ${email}.`;
                this.emailLinkMessage.classList.remove('hidden');
                this.sendSignInLinkButton.textContent = "Link Sent!";
            })
            .catch((error) => {
                alert(`Could not send link: ${error.message}`);
                this.sendSignInLinkButton.disabled = false;
                this.sendSignInLinkButton.textContent = "Send Sign-In Link";
            });
    }

    signOut() {
        auth.signOut().catch((error) => console.error('Sign out error', error));
    }
    
    // =================================================================
    // CHAT & FIRESTORE LOGIC
    // =================================================================

    async sendMessage() {
        const messageContent = this.messageInput.value.trim();
        if (!messageContent) return;

        const userMessage = { role: 'user', content: messageContent, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        this.addMessageToUI(userMessage.content, userMessage.role);
        this.conversationHistory.push(userMessage);
        this.messageInput.value = '';

        if (this.currentUser) {
            db.collection('chats').doc(this.currentUser.id).collection('messages').add(userMessage);
        }

        this.showTypingIndicator();
        try {
            // Replace with your actual AI API call logic
            const aiResponseContent = `AI response to: "${messageContent}"`;
            
            const aiMessage = { role: 'assistant', content: aiResponseContent, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
            this.addMessageToUI(aiMessage.content, aiMessage.role);
            this.conversationHistory.push(aiMessage);

            if (this.currentUser) {
                db.collection('chats').doc(this.currentUser.id).collection('messages').add(aiMessage);
            }
        } catch (error) {
            this.addMessageToUI(`Error: ${error.message}`, 'assistant');
        } finally {
            this.hideTypingIndicator();
        }
    }
    
    loadChatHistoryFromFirestore() {
        if (!this.currentUser) return;
        this.clearChatUI();
        this.conversationHistory = [];

        db.collection('chats').doc(this.currentUser.id).collection('messages').orderBy('timestamp', 'asc').limitToLast(50)
          .onSnapshot(snapshot => { // Using onSnapshot for real-time updates
              this.clearChatUI();
              this.conversationHistory = [];
              if (snapshot.empty) {
                  this.addMessageToUI("Welcome! Ask me anything.", 'assistant');
              } else {
                  snapshot.docs.forEach(doc => {
                      const message = doc.data();
                      this.conversationHistory.push(message);
                      this.addMessageToUI(message.content, message.role);
                  });
              }
          });
    }

    clearConversation() {
        if (!confirm('Are you sure you want to clear this conversation? This cannot be undone.')) return;

        this.clearChatUI();
        this.addMessageToUI("Welcome! Ask me anything.", 'assistant');
        this.conversationHistory = [];

        if (this.currentUser) {
            const collectionRef = db.collection('chats').doc(this.currentUser.id).collection('messages');
            collectionRef.get().then(snapshot => {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            });
        }
    }
    
    // =================================================================
    // SHARING LOGIC
    // =================================================================
    
    shareChat() {
        if (!this.currentUser || this.conversationHistory.length === 0) {
            alert("You must be signed in and have a conversation to share."); return;
        }
        const chatToShare = {
            ownerId: this.currentUser.id,
            ownerName: this.currentUser.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            messages: this.conversationHistory
        };
        db.collection('shared_chats').add(chatToShare)
          .then(docRef => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?share=${docRef.id}`;
              prompt("Here is your shareable link:", shareUrl);
          })
          .catch(error => alert("Could not create share link: " + error.message));
    }

    checkForSharedChat() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        if (shareId) {
            this.welcomeScreen.classList.add('hidden');
            this.chatInterface.classList.add('hidden');
            db.collection('shared_chats').doc(shareId).get().then(doc => {
                if (doc.exists) {
                    const sharedData = doc.data();
                    this.sharedChatMessages.innerHTML = '';
                    sharedData.messages.forEach(message => this.addMessageToShareView(message.content, message.role));
                    this.shareModal.classList.remove('hidden');
                } else {
                    alert("This shared chat does not exist or has been deleted.");
                }
            });
        }
    }
    
    // =================================================================
    // UI HELPER METHODS
    // =================================================================
    
    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'block';
        this.chatInterface.style.display = 'none';
    }

    showChatInterface() {
        this.welcomeScreen.style.display = 'none';
        this.chatInterface.style.display = 'block';
    }

    updateUserInfoUI() {
        if (this.currentUser) {
            this.userAvatar.src = this.currentUser.picture;
            this.userName.textContent = this.currentUser.name;
            this.userEmail.textContent = this.currentUser.email;
            this.userInfo.classList.remove('hidden');
        } else {
            this.userInfo.classList.add('hidden');
        }
    }
    
    showSettings() {
        this.settingsModal.classList.remove('hidden', 'opacity-0');
        this.settingsModal.classList.add('flex');
        if (this.currentUser) {
            this.signedInState.classList.remove('hidden');
            this.signedOutState.classList.add('hidden');
            document.getElementById('settingsUserAvatar').src = this.currentUser.picture;
            document.getElementById('settingsUserName').textContent = this.currentUser.name;
            document.getElementById('settingsUserEmail').textContent = this.currentUser.email;
        } else {
            this.showSignedOutState();
        }
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
    }
    
    showSignedOutState() {
        this.signedInState.classList.add('hidden');
        this.signedOutState.classList.remove('hidden');
        this.signInOptions.classList.remove('hidden');
        this.emailSignInForm.classList.add('hidden');
        this.emailLinkMessage.classList.add('hidden');
    }
    
    addMessageToUI(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble flex';
        if (role === 'user') {
            messageDiv.classList.add('justify-end');
            messageDiv.innerHTML = `<div class="user-message rounded-2xl rounded-br-none px-6 py-4 max-w-lg shadow-md"><p class="font-medium">${content}</p></div>`;
        } else {
            messageDiv.classList.add('justify-start');
            messageDiv.innerHTML = `<div class="ai-message rounded-2xl rounded-bl-none px-6 py-4 max-w-lg shadow-md"><p class="text-gray-700 font-medium">${content}</p></div>`;
        }
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addMessageToShareView(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
        const bubble = document.createElement('div');
        bubble.className = `p-4 rounded-2xl max-w-lg shadow-md ${role === 'user' ? 'user-message' : 'ai-message'}`;
        bubble.textContent = content;
        messageDiv.appendChild(bubble);
        this.sharedChatMessages.appendChild(messageDiv);
        this.sharedChatMessages.scrollTop = this.sharedChatMessages.scrollHeight;
    }

    clearChatUI() {
        this.chatMessages.innerHTML = '';
    }

    showTypingIndicator() {
        document.getElementById('typingIndicator').classList.remove('hidden');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    hideTypingIndicator() {
        document.getElementById('typingIndicator').classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
