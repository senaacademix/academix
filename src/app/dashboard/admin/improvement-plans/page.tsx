import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminImprovementPlans } from "@/features/admin/components/AdminImprovementPlans";
import { getAllImprovementPlansAdmin } from "@/features/student/actions/improvementPlanActions";

export default async function AdminImprovementPlansPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const res = await getAllImprovementPlansAdmin();
    const plans = res.success && res.data ? res.data : [];

    return (
        <div className="p-4 sm:p-8">
            <AdminImprovementPlans plans={plans} />
        </div>
    );
}
