import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EnvironmentManagement } from "@/features/admin/components/EnvironmentManagement";
import { getEnvironmentsAction } from "@/features/admin/actions/environmentActions";

export const metadata = {
    title: "Ambientes de Formación | AcademiX",
    description: "Gestiona los ambientes y espacios de formación disponibles en la institución.",
};

export default async function AdminEnvironmentsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard");
    }

    const environments = await getEnvironmentsAction();

    return (
        <div className="p-4 sm:p-8">
            <EnvironmentManagement initialEnvironments={environments} />
        </div>
    );
}
