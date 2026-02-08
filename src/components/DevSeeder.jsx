import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Database from 'lucide-react/dist/esm/icons/database';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

const DevSeeder = () => {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const seedData = async () => {
        if (!confirm('This will add mock data to your Firestore. Continue?')) return;

        setStatus('loading');
        try {
            // 1. Create Mock Forms for Each Week
            const weekFormRefs = {};

            // Week 0 - Pre-course Assessment
            const formWeek0 = await addDoc(collection(db, 'formTemplates'), {
                name: 'Week 0 - Pre-course Assessment',
                createdAt: Timestamp.now(),
                questions: [
                    { text: 'What are your expectations for this course?', type: 'short' },
                    { text: 'How would you rate your current skill level?', type: 'rating' },
                    { text: 'Do you have any prior experience in this topic?', type: 'yesno' }
                ]
            });
            weekFormRefs[0] = formWeek0.id;

            // Week 2 - Early Feedback
            const formWeek2 = await addDoc(collection(db, 'formTemplates'), {
                name: 'Week 2 - Early Feedback',
                createdAt: Timestamp.now(),
                questions: [
                    { text: 'How satisfied are you with the course so far?', type: 'rating' },
                    { text: 'Is the pace of the course appropriate?', type: 'yesno' },
                    { text: 'What topics need more clarification?', type: 'short' }
                ]
            });
            weekFormRefs[2] = formWeek2.id;

            // Week 4 - Mid-course Review
            const formWeek4 = await addDoc(collection(db, 'formTemplates'), {
                name: 'Week 4 - Mid-course Review',
                createdAt: Timestamp.now(),
                questions: [
                    { text: 'How would you rate the instructor?', type: 'rating' },
                    { text: 'Are the learning materials helpful?', type: 'yesno' },
                    { text: 'What improvements would you suggest?', type: 'short' },
                    { text: 'Overall satisfaction rating', type: 'rating' }
                ]
            });
            weekFormRefs[4] = formWeek4.id;

            // Week 6 - Application Check
            const formWeek6 = await addDoc(collection(db, 'formTemplates'), {
                name: 'Week 6 - Application Check',
                createdAt: Timestamp.now(),
                questions: [
                    { text: 'Are you able to apply what you learned?', type: 'yesno' },
                    { text: 'Rate the practical exercises', type: 'rating' },
                    { text: 'What challenges are you facing?', type: 'short' }
                ]
            });
            weekFormRefs[6] = formWeek6.id;

            // Week 8 - Final Assessment
            const formWeek8 = await addDoc(collection(db, 'formTemplates'), {
                name: 'Week 8 - Final Assessment',
                createdAt: Timestamp.now(),
                questions: [
                    { text: 'Overall course rating', type: 'rating' },
                    { text: 'Would you recommend this course?', type: 'yesno' },
                    { text: 'What did you like most?', type: 'short' },
                    { text: 'What could be improved?', type: 'short' },
                    { text: 'Rate the course content', type: 'rating' }
                ]
            });
            weekFormRefs[8] = formWeek8.id;

            // 2. Create Mock Courses with weekForms
            const courseEndDate = '2026-04-20';
            const baseDate = new Date(courseEndDate);

            // Calculate week dates
            const weekDates = {};
            [0, 2, 4, 6, 8].forEach(week => {
                const weekDate = new Date(baseDate);
                weekDate.setDate(weekDate.getDate() + (week * 7));
                weekDates[week] = weekDate.toISOString().split('T')[0];
            });

            // Linked Course (main test course)
            const courseRefLinked = await addDoc(collection(db, 'courses'), {
                title: 'UX/UI Bootcamp (Linked)',
                description: 'Complete guide to user experience design.',
                date: courseEndDate,
                capacity: 40,
                status: 'open',
                weekForms: weekFormRefs,
                weekDates: weekDates,
                createdAt: Timestamp.now()
            });

            // Other sample courses
            await addDoc(collection(db, 'courses'), {
                title: 'Modern Web Design 2026',
                description: 'Learn how to build beautiful interfaces with Tailwind and React.',
                date: '2026-02-15',
                capacity: 30,
                status: 'open',
                weekForms: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                weekDates: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                createdAt: Timestamp.now()
            });

            await addDoc(collection(db, 'courses'), {
                title: 'Advanced React Patterns',
                description: 'Deep dive into hooks, context, and performance.',
                date: '2026-03-01',
                capacity: 20,
                status: 'open',
                weekForms: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                weekDates: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                createdAt: Timestamp.now()
            });

            await addDoc(collection(db, 'courses'), {
                title: 'Data Science Fundamentals',
                description: 'Introduction to Python and Pandas.',
                date: '2026-01-10',
                capacity: 50,
                status: 'closed',
                weekForms: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                weekDates: { 0: '', 2: '', 4: '', 6: '', 8: '' },
                createdAt: Timestamp.now()
            });

            // 3. Create Mock Responses for the Linked Course
            const users = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
            const weeks = [0, 2, 4, 6, 8];

            for (const user of users) {
                // Randomly skip some weeks to test "Missing" status
                const completedWeeks = weeks.filter(() => Math.random() > 0.2);

                for (const week of completedWeeks) {
                    const formId = weekFormRefs[week];
                    await addDoc(collection(db, 'responses'), {
                        userId: user,
                        courseId: courseRefLinked.id,
                        formTemplateId: formId,
                        week: week,
                        submittedAt: Timestamp.now(),
                        responses: [
                            Math.floor(Math.random() * 2) + 4, // Rating 4-5
                            'Yes',
                            `Feedback for Week ${week}: Great content and clear explanations.`
                        ]
                    });
                }
            }

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);

            // Reload page to see changes
            window.location.reload();

        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={seedData}
                disabled={status === 'loading'}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-all font-mono text-xs"
            >
                {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> :
                    status === 'success' ? <Check size={16} className="text-emerald-400" /> :
                        status === 'error' ? <AlertTriangle size={16} className="text-amber-400" /> :
                            <Database size={16} />}
                {status === 'loading' ? 'Seeding...' :
                    status === 'success' ? 'Done!' :
                        status === 'error' ? 'Failed' :
                            'Dev: Seed Mock Data'}
            </button>
        </div>
    );
};

export default DevSeeder;
