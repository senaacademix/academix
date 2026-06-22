import { StudentGrades } from "@/features/student/components/StudentGrades";

export const metadata = {
    title: "Calificaciones | AcademiX",
    description: "Visualiza tus actividades evaluativas y calificaciones.",
};

export default function StudentGradesPage() {
    return (
        <div className="flex flex-col gap-6 p-6 min-h-screen max-w-5xl mx-auto w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mis Calificaciones</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Consulta las actividades evaluativas asignadas por tus profesores y haz seguimiento a tus notas y promedio.
                </p>
            </div>
            
            <StudentGrades />
        </div>
    );
}
