import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagement } from "@/features/admin/components/UserManagement";
import { getAllUsersAction } from "@/app/admin-actions";
import { getGroupsAction, getProgramsAction } from "@/features/admin/actions/academicActions";

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "admin" && session.user.role !== "observer")) {
        redirect("/dashboard/student");
    }

    const groups = await getGroupsAction();
    const programs = await getProgramsAction();
    const initialProgramId = programs.length > 0 ? programs[0].id : "none";
    const initialLectivaGroup = groups.find(g => g.programId === initialProgramId && (g as any).categoria === "LECTIVA");
    const defaultGroupId = initialLectivaGroup ? initialLectivaGroup.id : "none";

    const { users, total } = await getAllUsersAction({ limit: 20, role: "student", groupId: defaultGroupId !== "none" ? defaultGroupId : "none" });

    return (
        <div className="p-4 sm:p-8">
            <UserManagement 
                initialUsers={users} 
                totalCount={total} 
                initialGroupId={defaultGroupId} 
                initialGroups={groups.map(g => ({id: g.id, name: g.name, programId: g.programId, categoria: (g as any).categoria}))} 
                initialPrograms={programs.map(p => ({id: p.id, name: p.name}))}
                isObserver={session.user.role === "observer"}
            />
        </div>
    );
}
