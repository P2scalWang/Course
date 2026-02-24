/**
 * API endpoint for sending weekly follow-up notifications
 * 
 * POST /api/notifyWeekly
 * Body: { courseId: string, weekNumber: number }
 * 
 * This endpoint:
 * 1. Fetches all users registered for the course
 * 2. Generates a Flex Message for the specific week
 * 3. Sends the notification to all registered users
 */
export default async function handler(req, res) {
    // 1. Check Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Check Token
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error: Missing LINE Token' });
    }

    const { courseId, weekNumber, courseTitle } = req.body;

    // 3. Validate input
    if (!courseId || weekNumber === undefined || !courseTitle) {
        return res.status(400).json({
            error: 'Missing required fields: courseId, weekNumber, courseTitle'
        });
    }

    const validWeeks = ['pre', 0, 2, 4, 6, 8];
    if (!validWeeks.includes(weekNumber)) {
        return res.status(400).json({
            error: 'Invalid weekNumber. Must be one of: pre, 0, 2, 4, 6, 8'
        });
    }

    try {
        // 4. Dynamic import Firebase for Vercel Serverless compatibility
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');

        const firebaseConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY,
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.VITE_FIREBASE_APP_ID
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const db = getFirestore(app);

        // 5. Fetch all users registered for this course
        const registrationsRef = collection(db, 'registrations');
        const q = query(registrationsRef, where('courseId', '==', courseId));
        const snapshot = await getDocs(q);

        const userIds = snapshot.docs.map(doc => doc.data().userId).filter(Boolean);

        if (userIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No registered users found for this course',
                sentTo: 0
            });
        }

        // 5. Get LIFF ID from environment
        const liffId = process.env.VITE_LIFF_ID;

        // 6. Generate appropriate Flex Message based on week
        let flexMessage;

        if (weekNumber === 0 || weekNumber === 'pre') {
            // Course completion / Pre-training message
            flexMessage = createCourseCompletionFlex({ courseTitle, courseId, liffId });
        } else {
            // Weekly follow-up message
            flexMessage = createWeeklyFollowUpFlex({ courseTitle, courseId, weekNumber, liffId });
        }

        // 7. Send Multicast Message
        const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: userIds,
                messages: [flexMessage]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send LINE message');
        }

        return res.status(200).json({
            success: true,
            sentTo: userIds.length,
            weekNumber,
            data
        });

    } catch (error) {
        console.error('Weekly Notification API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

import { createCourseCompletionFlex, createWeeklyFollowUpFlex } from './lib/flexTemplates.js';

