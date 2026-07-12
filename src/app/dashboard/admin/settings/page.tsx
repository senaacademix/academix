import { AdminSettings } from "@/features/admin/components/AdminSettings";
import { getSystemSettingsAction } from "@/app/admin-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "admin" && session.user.role !== "observer")) {
        redirect("/dashboard/student");
    }

    const settings = await getSystemSettingsAction();
    const { getPendingAttendancePermissionRequestsAction } = await import("@/features/teacher/actions/groupActions");
    const requestsRes = await getPendingAttendancePermissionRequestsAction();
    const requests = requestsRes.success ? requestsRes.requests : [];

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
            <AdminSettings 
                initialSettings={settings as any} 
                initialRequests={requests || []} 
                isObserver={session.user.role === "observer"}
            />
        </div>
    );
}
