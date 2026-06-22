import { StudentRecords } from "@/features/student/components/StudentRecords";

export const metadata = {
    title: "Registro Académico | AcademiX",
    description: "Visualiza tu historial de asistencia y observaciones disciplinarias.",
};

export default function StudentRecordsPage() {
    return (
        <div className="flex flex-col gap-6 p-6 min-h-screen max-w-6xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Registro Académico</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Visualiza tu historial de asistencia a clases y las observaciones que los docentes han registrado.
                </p>
            </div>
            
            <StudentRecords />
        </div>
    );
}
