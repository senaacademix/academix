"use client";

import React, { useState, useEffect, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, GripVertical, Save, X, UsersRound } from "lucide-react";
import { formatName, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { syncCourseWorkGroups } from "../actions/workGroupActions";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Draggable Student Component ---
function DraggableStudent({ student }: { student: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    data: { student },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm group hover:border-primary/50 transition-colors ${isDragging ? 'border-primary ring-2 ring-primary/20' : ''}`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={student.image} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(formatName(student.name, student.profile))}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">
          {formatName(student.name, student.profile)}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{student.email}</p>
      </div>
    </div>
  );
}

// --- Droppable Column Component ---
function DroppableColumn({ id, title, students, onNameChange, onDelete, isUnassigned }: { 
  id: string; 
  title: string; 
  students: any[]; 
  onNameChange?: (val: string) => void;
  onDelete?: () => void;
  isUnassigned?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full bg-muted/5 w-full min-h-0">
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between gap-2 shrink-0">
        {isUnassigned ? (
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{students.length} estudiantes</p>
          </div>
        ) : (
          <>
            <Input 
              value={title} 
              onChange={e => onNameChange && onNameChange(e.target.value)}
              className="h-8 font-bold text-sm bg-transparent border-transparent hover:border-input focus-visible:ring-1 flex-1 min-w-0"
              placeholder="Nombre del Equipo"
            />
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div 
          ref={setNodeRef}
          className={`p-4 min-h-[200px] h-full space-y-3 transition-colors ${isOver ? 'bg-primary/5' : ''}`}
        >
          {students.map(s => (
            <DraggableStudent key={s.id} student={s} />
          ))}
          {students.length === 0 && (
            <div className="h-24 border-2 border-dashed border-muted flex items-center justify-center rounded-lg text-xs text-muted-foreground">
              Arrastra estudiantes aquí
            </div>
          )}
        </div>
      </div>
      
      {!isUnassigned && (
        <div className="p-3 border-t bg-background/50 text-xs text-center text-muted-foreground font-medium shrink-0">
          {students.length} Integrantes
        </div>
      )}
    </div>
  );
}


// --- Main Dialog Component ---
function DroppableUnassigned({ students }: { students: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' });
  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-2 transition-colors ${isOver ? 'bg-primary/5' : ''}`}>
      <div ref={setNodeRef} className="min-h-[200px] h-full pb-20">
        {students.map(s => (
          <DraggableStudent key={s.id} student={s} />
        ))}
        {students.length === 0 && (
          <div className="h-32 border-2 border-dashed flex items-center justify-center rounded-lg text-xs text-muted-foreground">
            Todos los estudiantes tienen equipo
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkGroupManagerDialog({ 
  open, 
  onOpenChange, 
  courseId,
  courseName, 
  allStudents, 
  initialWorkGroups,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName?: string;
  allStudents: any[];
  initialWorkGroups: any[];
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [groups, setGroups] = useState<{ id: string, name: string, studentIds: string[] }[]>([]);
  
  // Initialize state when opened
  useEffect(() => {
    if (open) {
      setGroups(
        initialWorkGroups.map(wg => ({
          id: wg.id,
          name: wg.name,
          studentIds: wg.students.map((s: any) => s.id)
        }))
      );
    }
  }, [open, initialWorkGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id;
    const toGroupId = over.id;

    setGroups(prev => {
      // Create a copy of groups
      const newGroups = prev.map(g => ({ ...g, studentIds: [...g.studentIds] }));
      
      // Remove student from all groups first (ensures a student is only in 1 group at a time)
      newGroups.forEach(g => {
        g.studentIds = g.studentIds.filter(id => id !== studentId);
      });

      // If dropped in a specific group (not "unassigned"), add them there
      if (toGroupId !== "unassigned") {
        const targetGroup = newGroups.find(g => g.id === toGroupId);
        if (targetGroup && !targetGroup.studentIds.includes(studentId)) {
          targetGroup.studentIds.push(studentId);
        }
      }

      return newGroups;
    });
  };

  const addGroup = () => {
    setGroups(prev => [
      ...prev,
      { id: `temp-${Date.now()}`, name: `Nuevo Equipo ${prev.length + 1}`, studentIds: [] }
    ]);
  };

  const handleSave = () => {
    // Validate empty names
    if (groups.some(g => !g.name.trim())) {
      toast.error("Todos los equipos deben tener un nombre");
      return;
    }

    startTransition(async () => {
      // Map temp ids to undefined so backend creates them
      const payload = groups.map(g => ({
        id: g.id.startsWith("temp-") ? undefined : g.id,
        name: g.name,
        studentIds: g.studentIds
      }));

      const res = await syncCourseWorkGroups(courseId, payload);
      if (res.success) {
        toast.success("Equipos guardados correctamente");
        onSaved();
        onOpenChange(false);
      } else {
        toast.error("Error guardando equipos: " + res.error);
      }
    });
  };

  // Derive unassigned students
  const assignedStudentIds = new Set(groups.flatMap(g => g.studentIds));
  const unassignedStudents = allStudents.filter(s => !assignedStudentIds.has(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-full w-screen h-screen m-0 p-0 rounded-none flex flex-col overflow-hidden bg-background border-0" showCloseButton={false}>
        
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-background shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold">
              Gestión de Equipos {courseName && <span className="text-muted-foreground font-normal ml-2">| {courseName}</span>}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Arrastra estudiantes desde la lista principal hacia los equipos para organizarlos.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Distribución
            </Button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex overflow-hidden bg-muted/10">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            
            {/* Left Column: Unassigned */}
            <div className="w-[300px] xl:w-[350px] shadow-[1px_0_10px_rgba(0,0,0,0.05)] z-20 h-full bg-background border-r flex flex-col shrink-0">
              <div className="p-4 border-b bg-background sticky top-0 z-10">
                <h3 className="font-bold">Estudiantes Disponibles</h3>
                <p className="text-xs text-muted-foreground">{unassignedStudents.length} estudiantes sin equipo</p>
              </div>
<DroppableUnassigned students={unassignedStudents} />
            </div>


            {/* Right Area: Groups Grid */}
            <div className="flex-1 h-full flex flex-col bg-muted/10 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-background shrink-0 shadow-sm z-10">
                <h3 className="font-bold text-muted-foreground">Equipos Creados ({groups.length})</h3>
                <Button onClick={addGroup} size="sm" className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Nuevo Equipo
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start pb-20">
                  {groups.map(group => {
                    const groupStudents = group.studentIds
                      .map(id => allStudents.find(s => s.id === id))
                      .filter(Boolean);
                    
                    return (
                      <div key={group.id} className="bg-background border rounded-xl shadow-sm flex flex-col overflow-hidden h-[400px]">
                        <DroppableColumn
                          id={group.id}
                          title={group.name}
                          students={groupStudents}
                          onNameChange={(val) => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: val } : g))}
                          onDelete={() => setGroups(prev => prev.filter(g => g.id !== group.id))}
                        />
                      </div>
                    );
                  })}

                  {groups.length === 0 && (
                    <div className="col-span-full h-64 border-2 border-dashed flex flex-col items-center justify-center rounded-xl text-muted-foreground bg-background/50">
                      <UsersRound className="w-12 h-12 mb-4 opacity-20" />
                      <p>No has creado ningún equipo aún.</p>
                      <Button variant="outline" className="mt-4" onClick={addGroup}>Crear el primer equipo</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  );
}
