export const WEEKS = ['pre', 0, 2, 4, 6, 8];

export const DEFAULT_WEEK_LABELS = {
    pre: 'Pre-training',
    0: 'Action Commitment',
    2: 'Week 2 Follow up',
    4: 'Week 4 Follow up',
    6: 'Week 6 Follow up',
    8: 'Week 8 Follow up'
};

export const DEFAULT_WEEK_SHORT_LABELS = {
    pre: 'Pre',
    0: 'W0 AC',
    2: 'W2 FU',
    4: 'W4 FU',
    6: 'W6 FU',
    8: 'W8 FU'
};

export const createDefaultWeekLabels = () => ({ ...DEFAULT_WEEK_LABELS });

export const getWeekLabel = (course, week) => {
    const key = String(week);
    return course?.weekLabels?.[key] || DEFAULT_WEEK_LABELS[key] || `Week ${week}`;
};

export const getWeekShortLabel = (course, week) => {
    const label = getWeekLabel(course, week);
    const fallback = DEFAULT_WEEK_SHORT_LABELS[String(week)] || label;
    return label.length > 14 ? fallback : label;
};
