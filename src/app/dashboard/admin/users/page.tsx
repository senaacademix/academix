import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagement } from "@/features/admin/components/UserManagement";
import { getAllUsersAction } from "@/app/admin-actions";
import { getGroupsAction, getProgramsAction } from "@/features/admin/actions/academicActions";

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const groups = await getGroupsAction();
    const programs = await getProgramsAction();
    const defaultGroupId = groups.length > 0 ? groups[0].id : "all";

    const { users, total } = await getAllUsersAction({ limit: 20, role: "student", groupId: defaultGroupId !== "all" ? defaultGroupId : undefined });

    return (
        <div className="p-8">
            <UserManagement 
                initialUsers={users} 
                totalCount={total} 
                initialGroupId={defaultGroupId} 
                initialGroups={groups.map(g => ({id: g.id, name: g.name, programId: g.programId}))} 
                initialPrograms={programs.map(p => ({id: p.id, name: p.name}))}
            />
        </div>
    );
}
