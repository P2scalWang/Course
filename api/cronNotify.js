/**
 * Cron Job API: Automatic Daily Notification Check
 * 
 * Runs every day at 8 AM Bangkok time (1 AM UTC)
 * Checks all finished courses and sends notifications for any Week that matches today's date
 * 
 * Schedule: 0 1 * * * (Every day at 1:00 AM UTC = 8:00 AM Bangkok)
 */

export default async function handler(req, res) {
    // Verify cron secret for production security
    // Vercel automatically adds this header for cron requests
    const authHeader = req.headers.authorization;

    // In production, verify the cron secret
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow in development or if no secret is set
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'Missing LINE_CHANNEL_ACCESS_TOKEN' });
    }

    const LIFF_ID = process.env.VITE_LIFF_ID;

    try {
        // Dynamic import for Firebase (serverless compatibility)
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');

        // Initialize Firebase if not already initialized
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

        // Get today's date in YYYY-MM-DD format (Bangkok time)
        const today = new Date();
        // Adjust to Bangkok timezone (UTC+7)
        today.setHours(today.getHours() + 7);
        const todayStr = today.toISOString().split('T')[0];

        console.log(`[Cron] Running notification check for date: ${todayStr}`);

        // Get all finished courses
        const coursesSnapshot = await getDocs(
            query(collection(db, 'courses'), where('isFinished', '==', true))
        );

        const results = [];
        // Week 0 is sent manually when Admin clicks "Finish Class"
        // Cron only handles follow-up weeks (2, 4, 6, 8)
        const WEEKS = [2, 4, 6, 8];

        for (const courseDoc of coursesSnapshot.docs) {
            const course = { id: courseDoc.id, ...courseDoc.data() };
            const weekDates = course.weekDates || {};

            // Check if any week date matches today
            for (const week of WEEKS) {
                if (weekDates[week] === todayStr) {
                    console.log(`[Cron] Match found: ${course.title} - Week ${week}`);

                    // Get registered users for this course
                    const registrationsSnapshot = await getDocs(
                        query(collection(db, 'registrations'), where('courseId', '==', course.id))
                    );
                    const userIds = registrationsSnapshot.docs
                        .map(doc => doc.data().userId)
                        .filter(Boolean);

                    if (userIds.length === 0) {
                        results.push({
                            course: course.title,
                            week,
                            status: 'skipped',
                            reason: 'No registered users'
                        });
                        continue;
                    }

                    // Create Flex Message
                    const flexMessage = week === 0
                        ? createCourseCompletionFlex({ courseTitle: course.title, courseId: course.id, liffId: LIFF_ID })
                        : createWeeklyFollowUpFlex({ courseTitle: course.title, courseId: course.id, weekNumber: week, liffId: LIFF_ID });

                    // Send via LINE Multicast API
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

                    results.push({
                        course: course.title,
                        week,
                        status: response.ok ? 'sent' : 'failed',
                        sentTo: userIds.length
                    });
                }
            }
        }

        console.log(`[Cron] Completed. Results:`, results);

        return res.status(200).json({
            success: true,
            date: todayStr,
            notificationsSent: results.filter(r => r.status === 'sent').length,
            results
        });

    } catch (error) {
        console.error('[Cron] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

import { createCourseCompletionFlex, createWeeklyFollowUpFlex } from './lib/flexTemplates.js';

