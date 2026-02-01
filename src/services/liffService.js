import liff from '@line/liff';

// LINE LIFF ID from environment variable
// Set VITE_LIFF_ID in your .env file
const LIFF_ID = import.meta.env.VITE_LIFF_ID || "YOUR_LIFF_ID";

export const liffService = {
    // Initialize LIFF
    init: async () => {
        try {
            await liff.init({ liffId: LIFF_ID });
            if (!liff.isLoggedIn()) {
                liff.login();
            }
            return true;
        } catch (error) {
            console.error("LIFF Init Error:", error);
            // Fallback for development/browser testing without LIFF
            if (import.meta.env.DEV) {
                console.warn("Running in dev mode, mocking LIFF");
                return true;
            }
            return false;
        }
    },

    // Get User Profile
    getProfile: async () => {
        try {
            if (liff.isLoggedIn()) {
                return await liff.getProfile();
            }
            // Mock profile for dev
            return {
                userId: 'dev_user_123',
                displayName: 'Dev User',
                pictureUrl: 'https://via.placeholder.com/150'
            };
        } catch (error) {
            console.error("Get Profile Error:", error);
            // Mock fallback
            return {
                userId: 'dev_user_123',
                displayName: 'Dev User',
                pictureUrl: 'https://via.placeholder.com/150'
            };
        }
    },

    // Close Window
    closeWindow: () => {
        liff.closeWindow();
    }
};
