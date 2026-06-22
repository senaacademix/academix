"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
 Building2,
 Plus,
 Search,
 Edit,
 Trash2,
 Users,
 MapPin,
 Layers,
 X,
 CheckCircle2,
 XCircle,
 Monitor,
 Cpu,
 Wifi,
 BookOpen,
 Projector,
 ChevronDown,
 ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
 createEnvironmentAction,
 updateEnvironmentAction,
 deleteEnvironmentAction,
} from "@/features/admin/actions/environmentActions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrainingEnvironment {
 id: string;
 name: string;
 capacity: number;
 location: string | null;
 resources: string[];
 description: string | null;
 isActive: boolean;
 createdAt: Date;
}

interface EnvironmentManagementProps {
 initialEnvironments: TrainingEnvironment[];
}

// ─── Suggested Resources ─────────────────────────────────────────────────────

const SUGGESTED_RESOURCES = [
 { label: "Proyector", icon: Projector },
 { label: "Computadores", icon: Cpu },
 { label: "Wi-Fi", icon: Wifi },
 { label: "Tablero digital", icon: Monitor },
 { label: "Biblioteca", icon: BookOpen },
 { label: "Aire acondicionado", icon: Layers },
];

// ─── Resource Icon Map ────────────────────────────────────────────────────────

const resourceIconMap: Record<string, React.ElementType> = {
 "Proyector": Projector,
 "Computadores": Cpu,
 "Wi-Fi": Wifi,
 "Tablero digital": Monitor,
 "Biblioteca": BookOpen,
 "Aire acondicionado": Layers,
};

function ResourceIcon({ label }: { label: string }) {
 const Icon = resourceIconMap[label] ?? Layers;
 return <Icon className="w-3 h-3" />;
}

// ─── Form Defaults ────────────────────────────────────────────────────────────

const emptyForm = {
 name: "",
 capacity: "",
 location: "",
 resources: [] as string[],
 description: "",
 isActive: true,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnvironmentManagement({ initialEnvironments }: EnvironmentManagementProps) {
 const [environments, setEnvironments] = useState<TrainingEnvironment[]>(initialEnvironments);
 const [search, setSearch] = useState("");
 const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

 // Dialog state
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingEnv, setEditingEnv] = useState<TrainingEnvironment | null>(null);
 const [form, setForm] = useState({ ...emptyForm });
 const [customResource, setCustomResource] = useState("");
 const [showAllSuggested, setShowAllSuggested] = useState(false);

 // Details state
 const [detailsEnv, setDetailsEnv] = useState<TrainingEnvironment | null>(null);

 // Delete confirm
 const [deleteId, setDeleteId] = useState<string | null>(null);

 const [isPending, startTransition] = useTransition();

 // ── Derived ───────────────────────────────────────────────────────────────

 const filtered = environments.filter((e) => {
 const matchSearch =
 e.name.toLowerCase().includes(search.toLowerCase()) ||
 (e.location ?? "").toLowerCase().includes(search.toLowerCase());
 const matchActive =
 filterActive === "all" ||
 (filterActive === "active" && e.isActive) ||
 (filterActive === "inactive" && !e.isActive);
 return matchSearch && matchActive;
 });

 // ── Handlers ──────────────────────────────────────────────────────────────

 function openCreate() {
 setEditingEnv(null);
 setForm({ ...emptyForm });
 setCustomResource("");
 setShowAllSuggested(false);
 setDialogOpen(true);
 }

 function openEdit(env: TrainingEnvironment) {
 setEditingEnv(env);
 setForm({
 name: env.name,
 capacity: String(env.capacity),
 location: env.location ?? "",
 resources: [...env.resources],
 description: env.description ?? "",
 isActive: env.isActive,
 });
 setCustomResource("");
 setShowAllSuggested(false);
 setDialogOpen(true);
 }

 function toggleResource(label: string) {
 setForm((prev) => ({
 ...prev,
 resources: prev.resources.includes(label)
 ? prev.resources.filter((r) => r !== label)
 : [...prev.resources, label],
 }));
 }

 function addCustomResource() {
 const val = customResource.trim();
 if (!val || form.resources.includes(val)) return;
 setForm((prev) => ({ ...prev, resources: [...prev.resources, val] }));
 setCustomResource("");
 }

 function handleSave() {
 if (!form.name.trim()) {
 toast.error("El nombre es obligatorio");
 return;
 }
 const capacityNum = parseInt(form.capacity);
 if (isNaN(capacityNum) || capacityNum < 1) {
 toast.error("La capacidad debe ser un número mayor a 0");
 return;
 }

 startTransition(async () => {
 try {
 if (editingEnv) {
 const updated = await updateEnvironmentAction(editingEnv.id, {
 name: form.name.trim(),
 capacity: capacityNum,
 location: form.location.trim() || null,
 resources: form.resources,
 description: form.description.trim() || null,
 isActive: form.isActive,
 });
 setEnvironments((prev) =>
 prev.map((e) => (e.id === editingEnv.id ? { ...e, ...updated } : e))
 );
 toast.success("Ambiente actualizado correctamente");
 } else {
 const created = await createEnvironmentAction({
 name: form.name.trim(),
 capacity: capacityNum,
 location: form.location.trim() || undefined,
 resources: form.resources,
 description: form.description.trim() || undefined,
 isActive: form.isActive,
 });
 setEnvironments((prev) => [created as TrainingEnvironment, ...prev]);
 toast.success("Ambiente creado correctamente");
 }
 setDialogOpen(false);
 } catch (err) {
 toast.error("Error al guardar el ambiente");
 console.error(err);
 }
 });
 }

 function handleDelete(id: string) {
 startTransition(async () => {
 try {
 await deleteEnvironmentAction(id);
 setEnvironments((prev) => prev.filter((e) => e.id !== id));
 toast.success("Ambiente eliminado");
 setDeleteId(null);
 } catch {
 toast.error("Error al eliminar el ambiente");
 }
 });
 }

 // ─── Render ───────────────────────────────────────────────────────────────

 const visibleSuggested = showAllSuggested
 ? SUGGESTED_RESOURCES
 : SUGGESTED_RESOURCES.slice(0, 4);

 return (
 <div className="space-y-6">
 {/* ── Header ── */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-center gap-3">
 <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/30">
 <Building2 className="w-5 h-5 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold tracking-tight">Ambientes de Formación</h1>
 <p className="text-sm text-muted-foreground">
 {environments.length} ambiente{environments.length !== 1 ? "s" : ""} registrado{environments.length !== 1 ? "s" : ""}
 </p>
 </div>
 </div>
 <Button
 id="btn-create-environment"
 onClick={openCreate}
 className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 text-white border-0"
 >
 <Plus className="w-4 h-4" />
 Nuevo Ambiente
 </Button>
 </div>

 {/* ── Stats Strip ── */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 {
 label: "Total",
 value: environments.length,
 color: "bg-primary",
 bg: "bg-primary/10",
 border: "border-primary/20",
 text: "text-primary",
 },
 {
 label: "Activos",
 value: environments.filter((e) => e.isActive).length,
 color: "from-emerald-500 to-teal-600",
 bg: "bg--50 dark:bg--950/20 dark:bg-emerald-950/30",
 border: "border--200 dark:border--800/50 dark:border-emerald-800",
 text: "text--700 dark:text--300 dark:text-emerald-300",
 },
 {
 label: "Inactivos",
 value: environments.filter((e) => !e.isActive).length,
 color: "from-slate-400 to-slate-500",
 bg: "bg-slate-50 dark:bg-slate-800/30",
 border: "border-slate-200 dark:border-slate-700",
 text: "text-slate-600 dark:text-slate-400",
 },
 {
 label: "Cap. Total",
 value: environments.reduce((a, e) => a + e.capacity, 0),
 color: "from-amber-500 to-orange-500",
 bg: "bg--50 dark:bg--950/20 dark:bg-amber-950/30",
 border: "border--200 dark:border--800/50 dark:border-amber-800",
 text: "text--700 dark:text--300 dark:text-amber-300",
 },
 ].map(({ label, value, bg, border, text }) => (
 <div
 key={label}
 className={cn(
 "rounded-xl border p-4 flex flex-col gap-1",
 bg,
 border
 )}
 >
 <span className={cn("text-2xl font-bold", text)}>{value}</span>
 <span className="text-xs text-muted-foreground">{label}</span>
 </div>
 ))}
 </div>

 {/* ── Filters ── */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 id="env-search"
 placeholder="Buscar por nombre o ubicación..."
 className="pl-9"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <div className="flex gap-2">
 {(["all", "active", "inactive"] as const).map((f) => (
 <Button
 key={f}
 id={`env-filter-${f}`}
 variant={filterActive === f ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterActive(f)}
 className={cn(
 "capitalize transition-all",
 filterActive === f &&
 "bg-primary text-white border-0 shadow-md"
 )}
 >
 {f === "all" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
 </Button>
 ))}
 </div>
 </div>

 {/* ── List/Table ── */}
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
 <Building2 className="w-8 h-8 text-primary/80" />
 </div>
 <p className="text-lg font-semibold text-foreground">
 {search ? "Sin resultados" : "Sin ambientes registrados"}
 </p>
 <p className="text-sm text-muted-foreground mt-1">
 {search
 ? "Prueba con otro término de búsqueda"
 : "Crea el primer ambiente de formación"}
 </p>
 {!search && (
 <Button
 onClick={openCreate}
 className="mt-4 gap-2 bg-primary hover:bg-primary/90 text-white border-0"
 >
 <Plus className="w-4 h-4" />
 Crear Ambiente
 </Button>
 )}
 </div>
 ) : (
 <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow>
 <TableHead className="py-3 font-semibold">Nombre / Ubicación</TableHead>
 <TableHead className="py-3 font-semibold text-center">Capacidad</TableHead>
 <TableHead className="py-3 font-semibold">Recursos</TableHead>
 <TableHead className="py-3 font-semibold text-center">Estado</TableHead>
 <TableHead className="py-3 font-semibold text-right">Acciones</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((env) => (
 <TableRow key={env.id} className="hover:bg-muted/10 transition-colors">
 <TableCell>
 <div className="font-bold text-foreground text-sm">{env.name}</div>
 {env.location && (
 <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
 <MapPin className="w-3 h-3 text-primary/60" />
 {env.location}
 </div>
 )}
 </TableCell>
 <TableCell className="text-center">
 <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg--50 dark:bg--950/20 dark:bg-amber-900/10 text--700 dark:text--300 dark:text-amber-400 font-mono text-xs font-semibold">
 <Users className="w-3.5 h-3.5" />
 {env.capacity}
 </div>
 </TableCell>
 <TableCell>
 {env.resources.length > 0 ? (
 <div className="flex flex-wrap gap-1 max-w-[200px]">
 {env.resources.slice(0, 3).map((r) => (
 <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
 {r}
 </span>
 ))}
 {env.resources.length > 3 && (
 <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border">
 +{env.resources.length - 3}
 </span>
 )}
 </div>
 ) : (
 <span className="text-xs text-muted-foreground italic">Ninguno</span>
 )}
 </TableCell>
 <TableCell className="text-center">
 {env.isActive ? (
 <Badge variant="outline" className="bg--50 dark:bg--950/20 text--700 dark:text--300 border--200 dark:border--800/50">
 Activo
 </Badge>
 ) : (
 <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
 Inactivo
 </Badge>
 )}
 </TableCell>
 <TableCell className="text-right">
 <div className="flex justify-end items-center gap-1.5">
 <Button 
 size="sm" 
 variant="outline" 
 className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5" 
 onClick={() => setDetailsEnv(env)}
 >
 Detalles
 </Button>
 <Tooltip><TooltipTrigger asChild><Button 
 size="icon" 
 variant="ghost" 
 className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/30" 
 onClick={() => openEdit(env)}
 >
 <Edit className="h-4 w-4" />
 </Button></TooltipTrigger><TooltipContent><p>Editar</p></TooltipContent></Tooltip>
 <Tooltip><TooltipTrigger asChild><Button 
 size="icon" 
 variant="ghost" 
 className="h-8 w-8 text-destructive hover:bg-destructive/10" 
 onClick={() => setDeleteId(env.id)}
 >
 <Trash2 className="h-4 w-4" />
 </Button></TooltipTrigger><TooltipContent><p>Eliminar</p></TooltipContent></Tooltip>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}

 {/* ── Create / Edit Dialog ── */}
 <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
 <DialogContent
 id="env-dialog"
 className="max-w-xl max-h-[90vh] overflow-y-auto"
 >
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-lg">
 <Building2 className="w-5 h-5 text-primary" />
 {editingEnv ? "Editar Ambiente" : "Nuevo Ambiente de Formación"}
 </DialogTitle>
 <DialogDescription>
 {editingEnv
 ? "Actualiza los datos del ambiente de formación."
 : "Completa la información para registrar un nuevo espacio."}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-5 py-2">
 {/* Name */}
 <div className="space-y-1.5">
 <Label htmlFor="env-name">
 Nombre del ambiente <span className="text-destructive">*</span>
 </Label>
 <Input
 id="env-name"
 placeholder="Ej. Aula 101, Laboratorio de Redes..."
 value={form.name}
 onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
 />
 </div>

 {/* Capacity + Location */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label htmlFor="env-capacity">
 Capacidad (estudiantes) <span className="text-destructive">*</span>
 </Label>
 <div className="relative">
 <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 id="env-capacity"
 type="number"
 min={1}
 placeholder="30"
 className="pl-9"
 value={form.capacity}
 onChange={(e) =>
 setForm((p) => ({ ...p, capacity: e.target.value }))
 }
 />
 </div>
 </div>
 <div className="space-y-1.5">
 <Label htmlFor="env-location">Ubicación</Label>
 <div className="relative">
 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 id="env-location"
 placeholder="Bloque A, Piso 2..."
 className="pl-9"
 value={form.location}
 onChange={(e) =>
 setForm((p) => ({ ...p, location: e.target.value }))
 }
 />
 </div>
 </div>
 </div>

 {/* Description */}
 <div className="space-y-1.5">
 <Label htmlFor="env-description">Descripción</Label>
 <Textarea
 id="env-description"
 placeholder="Descripción opcional del ambiente..."
 rows={2}
 value={form.description}
 onChange={(e) =>
 setForm((p) => ({ ...p, description: e.target.value }))
 }
 />
 </div>

 {/* Resources */}
 <div className="space-y-2">
 <Label>Recursos disponibles</Label>
 <div className="flex flex-wrap gap-2">
 {visibleSuggested.map(({ label, icon: Icon }) => {
 const selected = form.resources.includes(label);
 return (
 <button
 key={label}
 id={`res-${label.replace(/\s+/g, "-")}`}
 type="button"
 onClick={() => toggleResource(label)}
 className={cn(
 "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
 selected
 ? "bg-primary text-white border-violet-600 shadow-md shadow-primary/30 scale-105"
 : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
 )}
 >
 <Icon className="w-3 h-3" />
 {label}
 </button>
 );
 })}
 <button
 type="button"
 onClick={() => setShowAllSuggested((p) => !p)}
 className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 transition-all"
 >
 {showAllSuggested ? (
 <><ChevronUp className="w-3 h-3" /> Menos</>
 ) : (
 <><ChevronDown className="w-3 h-3" /> Más</>
 )}
 </button>
 </div>

 {/* Custom resource */}
 <div className="flex gap-2">
 <Input
 id="env-custom-resource"
 placeholder="Añadir recurso personalizado..."
 className="text-sm h-8"
 value={customResource}
 onChange={(e) => setCustomResource(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 addCustomResource();
 }
 }}
 />
 <Button
 id="btn-add-resource"
 type="button"
 size="sm"
 variant="outline"
 onClick={addCustomResource}
 className="h-8 px-3"
 >
 <Plus className="w-3 h-3" />
 </Button>
 </div>

 {/* Selected resources */}
 {form.resources.length > 0 && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {form.resources.map((r) => (
 <span
 key={r}
 className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 dark:border-primary/20"
 >
 <ResourceIcon label={r} />
 {r}
 <button
 type="button"
 onClick={() =>
 setForm((p) => ({
 ...p,
 resources: p.resources.filter((x) => x !== r),
 }))
 }
 className="ml-0.5 hover:text-destructive"
 >
 <X className="w-3 h-3" />
 </button>
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Active Toggle */}
 <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
 <button
 id="env-toggle-active"
 type="button"
 onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
 className={cn(
 "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
 form.isActive ? "bg-primary" : "bg-muted-foreground/30"
 )}
 >
 <span
 className={cn(
 "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
 form.isActive ? "translate-x-4" : "translate-x-0"
 )}
 />
 </button>
 <Label className="cursor-pointer" htmlFor="env-toggle-active">
 Ambiente{" "}
 <span
 className={
 form.isActive
 ? "text--600 dark:text--400 dark:text-emerald-400 font-semibold"
 : "text-muted-foreground"
 }
 >
 {form.isActive ? "activo" : "inactivo"}
 </span>
 </Label>
 </div>
 </div>

 <DialogFooter>
 <Button
 id="btn-cancel-env"
 variant="outline"
 onClick={() => setDialogOpen(false)}
 disabled={isPending}
 >
 Cancelar
 </Button>
 <Button
 id="btn-save-env"
 onClick={handleSave}
 disabled={isPending}
 className="bg-primary hover:bg-primary/90 text-white border-0"
 >
 {isPending ? "Guardando..." : editingEnv ? "Actualizar" : "Crear Ambiente"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── Details Dialog ── */}
 <Dialog open={!!detailsEnv} onOpenChange={(open) => !open && setDetailsEnv(null)}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Building2 className="w-5 h-5 text-primary" />
 Detalles del Ambiente
 </DialogTitle>
 </DialogHeader>
 {detailsEnv && (
 <div className="space-y-4 text-sm mt-2">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nombre</span>
 <p className="font-medium text-foreground">{detailsEnv.name}</p>
 </div>
 <div>
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Estado</span>
 <Badge variant="outline" className={detailsEnv.isActive ? "bg--50 dark:bg--950/20 text--700 dark:text--300 border--200 dark:border--800/50" : "bg-slate-50 text-slate-600 border-slate-200"}>
 {detailsEnv.isActive ? "Activo" : "Inactivo"}
 </Badge>
 </div>
 <div>
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ubicación</span>
 <p className="text-foreground flex items-center gap-1.5">
 <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
 {detailsEnv.location || "No especificada"}
 </p>
 </div>
 <div>
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Capacidad</span>
 <p className="text-foreground flex items-center gap-1.5">
 <Users className="w-3.5 h-3.5 text-amber-500" />
 {detailsEnv.capacity} estudiantes
 </p>
 </div>
 </div>
 
 <div className="pt-2 border-t border-border/50">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Descripción</span>
 <p className="text-foreground leading-relaxed">{detailsEnv.description || "Sin descripción registrada"}</p>
 </div>

 <div className="pt-2 border-t border-border/50">
 <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Recursos Asignados</span>
 {detailsEnv.resources.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {detailsEnv.resources.map(r => (
 <span key={r} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
 <ResourceIcon label={r} />
 {r}
 </span>
 ))}
 </div>
 ) : (
 <p className="text-muted-foreground italic text-xs">Ningún recurso asignado</p>
 )}
 </div>
 </div>
 )}
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setDetailsEnv(null)}>Cerrar</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── Delete Dialog ── */}
 <AlertDialog
 open={!!deleteId}
 onOpenChange={(open) => !open && setDeleteId(null)}
 >
 <AlertDialogContent id="env-delete-dialog">
 <AlertDialogHeader>
 <AlertDialogTitle className="flex items-center gap-2">
 <Trash2 className="w-4 h-4 text-destructive" />
 Eliminar Ambiente
 </AlertDialogTitle>
 <AlertDialogDescription>
 ¿Estás seguro de que deseas eliminar este ambiente de formación? Esta
 acción no se puede deshacer.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel id="btn-cancel-delete-env">Cancelar</AlertDialogCancel>
 <AlertDialogAction
 id="btn-confirm-delete-env"
 onClick={() => deleteId && handleDelete(deleteId)}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 disabled={isPending}
 >
 {isPending ? "Eliminando..." : "Eliminar"}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 );
}
