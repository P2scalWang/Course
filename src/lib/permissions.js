export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff' // Restricted user, can only view responses
};

export const PERMISSIONS = {
    VIEW_DASHBOARD: [ROLES.ADMIN],
    MANAGE_COURSES: [ROLES.ADMIN],
    MANAGE_FORMS: [ROLES.ADMIN],
    VIEW_RESPONSES: [ROLES.ADMIN, ROLES.STAFF],
    MANAGE_TRAINEES: [ROLES.ADMIN]
};

// Default role if none is assigned in database
export const DEFAULT_ROLE = ROLES.STAFF;
