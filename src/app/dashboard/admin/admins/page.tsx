import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminUsersManagement } from "@/features/admin/components/AdminUsersManagement";
import { getAdminsAndObserversAction } from "@/app/admin-actions";
import { getProgramsAction } from "@/features/admin/actions/academicActions";

export const metadata = {
    title: "Gestión de Administradores | AcademiX",
    description: "Administra las cuentas de administradores y observadores del sistema.",
};

export default async function AdminAdminsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [admins, programs] = await Promise.all([
        getAdminsAndObserversAction(),
        getProgramsAction()
    ]);

    // Format programs simple list for component
    const mappedPrograms = programs.map(p => ({
        id: p.id,
        name: p.name
    }));

    return (
        <div className="p-4 sm:p-8">
            <AdminUsersManagement 
                initialUsers={admins as any} 
                programs={mappedPrograms} 
                currentUserId={session.user.id} 
            />
        </div>
    );
}
