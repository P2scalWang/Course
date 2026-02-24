import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
// Direct imports to avoid barrel file overhead (bundle-barrel-imports)
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Clock from 'lucide-react/dist/esm/icons/clock';
import clsx from 'clsx';

const WEEKS = ['pre', 0, 2, 4, 6, 8];
const WEEK_COLORS = {
    pre: { bg: 'bg-pink-500', text: 'text-white', light: 'bg-pink-50' },
    0: { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-50' },
    2: { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-50' },
    4: { bg: 'bg-violet-500', text: 'text-white', light: 'bg-violet-50' },
    6: { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50' },
    8: { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-50' }
};

const CalendarPage = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'courses'));
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    // Memoize events to avoid recalculating on every render (rerender-memo)
    const events = useMemo(() => {
        const result = [];
        courses.forEach(course => {
            if (course.weekDates) {
                Object.entries(course.weekDates).forEach(([week, dateStr]) => {
                    if (dateStr) {
                        const weekKey = week === 'pre' ? 'pre' : parseInt(week);
                        result.push({
                            date: dateStr,
                            week: weekKey,
                            courseId: course.id,
                            courseTitle: course.title,
                            status: course.status
                        });
                    }
                });
            }
        });
        return result;
    }, [courses]);

    // Build Map index for O(1) lookup by date (js-index-maps)
    const eventsByDate = useMemo(() => {
        const map = new Map();
        events.forEach(event => {
            const existing = map.get(event.date) || [];
            existing.push(event);
            map.set(event.date, existing);
        });
        return map;
    }, [events]);

    // Calendar helpers
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatMonth = (date) => {
        return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    // O(1) lookup using Map index
    const getEventsForDay = (day) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return eventsByDate.get(dateStr) || [];
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    // Get today's events
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === todayStr);

    // Get upcoming events (next 7 days)
    const getUpcomingEvents = () => {
        const today = new Date();
        const upcoming = [];
        for (let i = 0; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = events.filter(e => e.date === dateStr);
            if (dayEvents.length > 0) {
                upcoming.push({
                    date: dateStr,
                    displayDate: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
                    isToday: i === 0,
                    events: dayEvents
                });
            }
        }
        return upcoming;
    };

    const upcomingEvents = getUpcomingEvents();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon size={28} className="text-indigo-600" />
                        Assessment Calendar
                    </h1>
                    <p className="text-slate-500 text-sm">ดูตารางวันที่ต้องส่ง Assessment ของแต่ละ Course</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Loading calendar...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar - Left Side */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200">
                        {/* Calendar Header */}
                        <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={24} className="text-slate-600" />
                            </button>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {formatMonth(currentDate)}
                                </h2>
                                <button
                                    onClick={goToToday}
                                    className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    วันนี้
                                </button>
                            </div>
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <ChevronRight size={24} className="text-slate-600" />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
                                <div key={i} className={clsx(
                                    "text-center text-sm font-semibold py-3",
                                    i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-600"
                                )}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7">
                            {blanks.map((_, i) => (
                                <div key={`blank-${i}`} className="min-h-[100px] border-r border-b border-slate-100 bg-slate-50/50" />
                            ))}
                            {days.map(day => {
                                const dayEvents = getEventsForDay(day);
                                const hasEvents = dayEvents.length > 0;
                                const maxShow = 2;
                                const moreCount = dayEvents.length - maxShow;

                                return (
                                    <div
                                        key={day}
                                        className={clsx(
                                            "min-h-[100px] p-1.5 border-r border-b border-slate-100 relative group",
                                            isToday(day) && "ring-2 ring-inset ring-indigo-500 bg-indigo-50/50"
                                        )}
                                    >
                                        {/* Day Number with Event Count */}
                                        <div className="flex items-start justify-between mb-1">
                                            <span className={clsx(
                                                "text-sm font-semibold",
                                                isToday(day) ? "text-indigo-600" : "text-slate-700"
                                            )}>
                                                {day}
                                            </span>
                                            {hasEvents && (
                                                <span className="px-1 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Event Labels */}
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, maxShow).map((event, i) => (
                                                <div
                                                    key={i}
                                                    className={clsx(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-0.5",
                                                        WEEK_COLORS[event.week]?.bg,
                                                        WEEK_COLORS[event.week]?.text
                                                    )}
                                                    title={`${event.courseTitle} - ${event.week === 'pre' ? 'Pre-training' : event.week === 0 ? 'Action Commitment' : `Week ${event.week} Follow up`}`}
                                                >
                                                    <BookOpen size={10} />
                                                    <span className="truncate">
                                                        {event.week === 'pre' ? 'Pre' : `W${event.week}`} - {event.courseTitle.length > 8
                                                            ? event.courseTitle.substring(0, 8) + '..'
                                                            : event.courseTitle}
                                                    </span>
                                                </div>
                                            ))}
                                            {moreCount > 0 && (
                                                <div className="text-[10px] text-slate-500 font-medium pl-0.5">
                                                    +{moreCount} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Hover Tooltip */}
                                        {hasEvents && (
                                            <div className={clsx(
                                                "hidden group-hover:block absolute z-20 left-0 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl min-w-[180px] max-w-[250px]",
                                                (blanks.length + day) > (Math.ceil((blanks.length + daysInMonth) / 7) - 1) * 7 - 6
                                                    ? "bottom-full mb-1"
                                                    : "top-full mt-1"
                                            )}>
                                                <div className="font-bold mb-2 text-slate-300">
                                                    📅 {day} {formatMonth(currentDate)}
                                                </div>
                                                <div className="space-y-2">
                                                    {dayEvents.map((event, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <span className={clsx(
                                                                "px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
                                                                WEEK_COLORS[event.week]?.bg,
                                                                WEEK_COLORS[event.week]?.text
                                                            )}>
                                                                {event.week === 'pre' ? 'Pre' : `W${event.week}`}
                                                            </span>
                                                            <span className="text-white">{event.courseTitle}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3">
                            {WEEKS.map(week => (
                                <div key={week} className="flex items-center gap-1.5">
                                    <div className={clsx("w-3 h-3 rounded", WEEK_COLORS[week]?.bg)} />
                                    <span className="text-xs text-slate-600">{week === 'pre' ? 'Pre-training' : week === 0 ? 'Action Commitment' : `W${week} Follow up`}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar - Right Side */}
                    <div className="space-y-4">
                        {/* Today's Tasks */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📍</span>
                                    <h3 className="font-bold text-slate-800">วันนี้</h3>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <div className="p-4">
                                {todayEvents.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        <Clock size={28} className="mx-auto mb-2 opacity-50" />
                                        ไม่มี Assessment ที่ต้องส่งวันนี้
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {todayEvents.map((event, i) => (
                                            <div
                                                key={i}
                                                className={clsx(
                                                    "p-3 rounded-xl border",
                                                    WEEK_COLORS[event.week]?.light,
                                                    "border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-xs font-bold",
                                                        WEEK_COLORS[event.week]?.bg,
                                                        WEEK_COLORS[event.week]?.text
                                                    )}>
                                                        Week {event.week}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-slate-800">{event.courseTitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming 7 Days */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">⏰</span>
                                    <h3 className="font-bold text-slate-800">กำลังจะมาถึง (7 วัน)</h3>
                                </div>
                            </div>
                            <div className="p-4 max-h-[350px] overflow-y-auto">
                                {upcomingEvents.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        ไม่มี Assessment ใน 7 วันข้างหน้า
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingEvents.map((dateGroup, i) => (
                                            <div key={i}>
                                                <div className={clsx(
                                                    "text-xs font-bold mb-2 flex items-center gap-1",
                                                    dateGroup.isToday ? "text-indigo-600" : "text-slate-500"
                                                )}>
                                                    {dateGroup.isToday ? '📍 วันนี้' : dateGroup.displayDate}
                                                </div>
                                                <div className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                                                    {dateGroup.events.map((event, j) => (
                                                        <div key={j} className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
                                                                WEEK_COLORS[event.week]?.bg,
                                                                WEEK_COLORS[event.week]?.text
                                                            )}>
                                                                {event.week === 'pre' ? 'Pre' : `W${event.week}`}
                                                            </span>
                                                            <span className="text-sm text-slate-700 truncate">
                                                                {event.courseTitle}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
