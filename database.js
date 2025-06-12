// =================================================================
// Database Interaction Layer (using localStorage)
// =================================================================
// This file centralizes all logic for reading from and writing to
// the browser's localStorage. This makes it easier to manage
// data or to swap out localStorage for a real database later.
// =================================================================

/**
 * A class to manage all data persistence for the chat application.
 */
class ChatDatabase {
    /**
     * Retrieves the current user's profile from localStorage.
     * @returns {object | null} The user profile object or null if not found.
     */
    getUserProfile() {
        const profile = localStorage.getItem('aiChatUserProfile');
        try {
            return profile ? JSON.parse(profile) : null;
        } catch (error) {
            console.error("Error parsing user profile:", error);
            return null;
        }
    }

    /**
     * Saves the current user's profile to localStorage.
     * @param {object} profile The user profile object to save.
     */
    saveUserProfile(profile) {
        if (!profile || !profile.id) {
            console.error("Cannot save profile: Invalid data.");
            return;
        }
        localStorage.setItem('aiChatUserProfile', JSON.stringify(profile));
    }

    /**
     * Retrieves all user profiles stored in the browser.
     * This is used for the Admin Panel.
     * @returns {Array<object>} An array of all user profiles.
     */
    getAllProfiles() {
        const profiles = localStorage.getItem('allChatProfiles');
        try {
            return profiles ? JSON.parse(profiles) : [];
        } catch (error) {
            console.error("Error parsing all profiles:", error);
            return [];
        }
    }

    /**
     * Adds or updates a user profile in the master list of all users.
     * This is used for the Admin Panel.
     * @param {object} profileData The user profile to add or update.
     */
    trackProfile(profileData) {
        if (!profileData || !profileData.id) return;
        let profiles = this.getAllProfiles();
        let profileMap = new Map(profiles.map(p => [p.id, p]));
        profileMap.set(profileData.id, profileData);
        localStorage.setItem('allChatProfiles', JSON.stringify(Array.from(profileMap.values())));
    }

    /**
     * Retrieves the chat history for a specific user ID.
     * @param {string} userId The ID of the user.
     * @returns {Array<object>} The user's chat history.
     */
    getChatHistory(userId) {
        if (!userId) return [];
        const history = localStorage.getItem(`chatHistory_${userId}`);
        try {
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error("Error parsing chat history:", error);
            return [];
        }
    }

    /**
     * Saves the chat history for a specific user ID.
     * @param {string} userId The ID of the user.
     * @param {Array<object>} history The chat history array to save.
     */
    saveChatHistory(userId, history) {
        if (!userId || !Array.isArray(history)) {
            console.error("Cannot save chat history: Invalid data.");
            return;
        }
        localStorage.setItem(`chatHistory_${userId}`, JSON.stringify(history));
    }

    /**
     * Deletes the chat history for a specific user ID.
     * @param {string} userId The ID of the user.
     */
    clearChatHistory(userId) {
        if (!userId) return;
        localStorage.removeItem(`chatHistory_${userId}`);
    }

    /**
     * Gets a generic setting from localStorage.
     * @param {string} key The key for the setting.
     * @returns {string | null} The value of the setting.
     */
    getSetting(key) {
        return localStorage.getItem(key);
    }

    /**
     * Saves a generic setting to localStorage.
     * @param {string} key The key for the setting.
     * @param {string} value The value of the setting.
     */
    saveSetting(key, value) {
        localStorage.setItem(key, value);
    }
}

// Create a single instance of the database to be used by the app.
const db = new ChatDatabase();
