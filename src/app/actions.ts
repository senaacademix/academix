"use server";

// Bridge file to maintain compatibility during refactoring
// Explicit exports to avoid Turbopack errors with "export *"


// From ../features/student/actions/enrollmentActions
export {
    enrollStudentAction
} from "../features/student/actions/enrollmentActions";



// From ../features/student/actions/remarkActions
export {
    getStudentRemarksAction
} from "../features/student/actions/remarkActions";






// From ../features/profile/actions/profileActions
export {
    getProfileAction,
    updateProfileAction
} from "../features/profile/actions/profileActions";

// From ../features/admin/actions/settingsActions
export {
    getSettingsAction,
    updateSettingsAction
} from "../features/admin/actions/settingsActions";

// From ../features/schedule/actions/scheduleActions
export {
    getScheduleViewAction
} from "../features/schedule/actions/scheduleActions";


