import { StudentRecords } from "@/features/student/components/StudentRecords";

export const metadata = {
    title: "Registro Académico | AcademiX",
    description: "Visualiza tu historial de asistencia, observaciones disciplinarias y calificaciones.",
};

export default function StudentRecordsPage() {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 min-h-screen max-w-6xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Registro Académico</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Consulta tu historial de asistencia, observaciones de los docentes y tus calificaciones por materia.
                </p>
            </div>
            
            <StudentRecords />
        </div>
    );
}
