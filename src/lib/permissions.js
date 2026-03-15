export const ROLES = {
    ADMIN: 'admin',
    VIEWER: 'viewer', // Company-scoped read-only access to responses
    STAFF: 'staff'    // Legacy fallback (treated same as viewer)
};

export const PERMISSIONS = {
    VIEW_DASHBOARD: [ROLES.ADMIN],
    MANAGE_COURSES: [ROLES.ADMIN],
    MANAGE_FORMS: [ROLES.ADMIN],
    VIEW_RESPONSES: [ROLES.ADMIN, ROLES.VIEWER, ROLES.STAFF],
    MANAGE_TRAINEES: [ROLES.ADMIN],
    MANAGE_USERS: [ROLES.ADMIN]
};

// Default role if none is assigned in database
export const DEFAULT_ROLE = ROLES.VIEWER;
