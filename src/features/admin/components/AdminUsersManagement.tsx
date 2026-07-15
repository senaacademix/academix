"use client";

import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, Edit2, UserPlus, UserCog, Shield, Eye, Phone, Mail, IdCard, Key } from "lucide-react";
import { toast } from "sonner";
import { 
    createAdminOrObserverAction, 
    updateAdminOrObserverAction, 
    deleteAdminOrObserverAction,
    resetUserPasswordToDocAction
} from "@/app/admin-actions";
import { UserAvatar } from "@/components/ui/user-avatar";

interface Profile {
    identificacion: string;
    nombres: string;
    apellido: string;
    telefono: string | null;
}

interface Program {
    id: string;
    name: string;
}

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    image: string | null;
    createdAt: Date;
    profile: Profile | null;
    programs: Program[];
}

interface AdminUsersManagementProps {
    initialUsers: AdminUser[];
    programs: Program[];
    currentUserId: string;
}

export function AdminUsersManagement({ initialUsers, programs, currentUserId }: AdminUsersManagementProps) {
    const [users, setUsers] = useState<AdminUser[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    // Dialogs state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Selected user for editing/deleting/resetting
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [userToReset, setUserToReset] = useState<AdminUser | null>(null);

    // Form states
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "observer">("admin");
    const [identificacion, setIdentificacion] = useState("");
    const [nombres, setNombres] = useState("");
    const [apellido, setApellido] = useState("");
    const [telefono, setTelefono] = useState("");
    const [password, setPassword] = useState("");
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);

    // Reset Form fields
    const resetForm = () => {
        setEmail("");
        setRole("admin");
        setIdentificacion("");
        setNombres("");
        setApellido("");
        setTelefono("");
        setPassword("");
        setSelectedProgramIds([]);
        setSelectedUser(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (user: AdminUser) => {
        setSelectedUser(user);
        setEmail(user.email);
        setRole("admin");
        setIdentificacion(user.profile?.identificacion || "");
        setNombres(user.profile?.nombres || "");
        setApellido(user.profile?.apellido || "");
        setTelefono(user.profile?.telefono || "");
        setPassword("");
        setSelectedProgramIds(user.programs.map(p => p.id));
        setEditDialogOpen(true);
    };

    const handleCreateUser = async () => {
        if (!email || !identificacion || !nombres || !apellido) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        startTransition(async () => {
            try {
                const fullName = `${nombres.trim()} ${apellido.trim()}`;
                const res = await createAdminOrObserverAction({
                    email: email.trim(),
                    name: fullName,
                    role,
                    password: password || undefined,
                    identificacion: identificacion.trim(),
                    nombres: nombres.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim() || undefined,
                    programIds: role === "observer" ? selectedProgramIds : []
                });

                const newUser: AdminUser = {
                    id: res.id,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    image: res.image,
                    createdAt: res.createdAt,
                    profile: res.profile,
                    programs: res.programs as Program[]
                };

                setUsers(prev => [newUser, ...prev]);
                toast.success("Usuario creado exitosamente");
                setCreateDialogOpen(false);
                resetForm();
            } catch (error: any) {
                toast.error(error.message || "Error al crear usuario");
            }
        });
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        if (!email || !identificacion || !nombres || !apellido) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }

        startTransition(async () => {
            try {
                const fullName = `${nombres.trim()} ${apellido.trim()}`;
                const res = await updateAdminOrObserverAction(selectedUser.id, {
                    email: email.trim(),
                    name: fullName,
                    role,
                    identificacion: identificacion.trim(),
                    nombres: nombres.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim() || undefined,
                    programIds: role === "observer" ? selectedProgramIds : []
                });

                setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
                    ...u,
                    name: res.name,
                    email: res.email,
                    role: res.role,
                    profile: res.profile,
                    programs: res.programs as Program[]
                } : u));

                toast.success("Usuario actualizado exitosamente");
                setEditDialogOpen(false);
                resetForm();
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar usuario");
            }
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        startTransition(async () => {
            try {
                await deleteAdminOrObserverAction(userToDelete.id);
                setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
                toast.success("Usuario eliminado exitosamente");
                setDeleteDialogOpen(false);
                setUserToDelete(null);
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar usuario");
            }
        });
    };

    const handleResetPassword = async () => {
        if (!userToReset) return;

        startTransition(async () => {
            try {
                await resetUserPasswordToDocAction(userToReset.id);
                toast.success("Contraseña restablecida exitosamente al número de documento");
                setResetDialogOpen(false);
                setUserToReset(null);
            } catch (error: any) {
                toast.error(error.message || "Error al restablecer contraseña");
            }
        });
    };

    const handleProgramToggle = (programId: string) => {
        setSelectedProgramIds(prev => 
            prev.includes(programId) 
                ? prev.filter(id => id !== programId) 
                : [...prev, programId]
        );
    };

    const filteredUsers = users.filter(user => {
        return (
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.profile?.identificacion.includes(searchQuery)
        );
    }).sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Administradores</h1>
                    <p className="text-muted-foreground text-sm">Administra los accesos de administradores del sistema.</p>
                </div>
                <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                    <UserPlus className="h-4 w-4" />
                    Crear Administrador
                </Button>
            </div>

            {/* Filtros */}
            <Card className="border-border bg-card shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email o documento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Listado de usuarios */}
            <Card className="border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg">Administradores de la Plataforma ({filteredUsers.length})</CardTitle>
                    <CardDescription>Lista de usuarios con acceso administrativo al sistema.</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[280px]">Usuario</TableHead>
                                <TableHead className="w-[180px]">Identificación</TableHead>
                                <TableHead className="w-[150px]">Rol</TableHead>
                                <TableHead className="w-[150px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No se encontraron usuarios.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar src={user.image} alt={user.name || ""} fallbackText={user.name || user.email || ""} className="h-9 w-9" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-foreground">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3 inline" /> {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs gap-1">
                                                <span className="font-medium flex items-center gap-1">
                                                    <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> {user.profile?.identificacion || "N/A"}
                                                </span>
                                                {user.profile?.telefono && (
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {user.profile.telefono}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="destructive" className="gap-1">
                                                <Shield className="h-3.5 w-3.5" /> Administrador
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleOpenEdit(user)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                                    onClick={() => {
                                                        setUserToReset(user);
                                                        setResetDialogOpen(true);
                                                    }}
                                                    title="Restablecer Contraseña"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                                {user.id !== currentUserId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Dialogo: Crear Usuario */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-lg w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-emerald-600" />
                            Crear Administrador
                        </DialogTitle>
                        <DialogDescription>Registra un nuevo usuario con permisos de administración.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-5 py-2">
                        {/* Columna de Datos de Usuario */}
                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <Label htmlFor="identificacion" className="text-xs font-semibold">Identificación *</Label>
                                <Input
                                    id="identificacion"
                                    placeholder="Cédula/Documento"
                                    value={identificacion}
                                    onChange={(e) => setIdentificacion(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="nombres" className="text-xs font-semibold">Nombres *</Label>
                                    <Input
                                        id="nombres"
                                        placeholder="Nombres"
                                        value={nombres}
                                        onChange={(e) => setNombres(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="apellido" className="text-xs font-semibold">Apellidos *</Label>
                                    <Input
                                        id="apellido"
                                        placeholder="Apellidos"
                                        value={apellido}
                                        onChange={(e) => setApellido(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-xs font-semibold">Correo Electrónico *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@dominio.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="telefono" className="text-xs font-semibold">Teléfono</Label>
                                    <Input
                                        id="telefono"
                                        placeholder="Opcional"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pass" className="text-xs font-semibold">Contraseña</Label>
                                    <Input
                                        id="pass"
                                        type="password"
                                        placeholder="Por defecto la Identificación"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateUser} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                            {isPending ? "Guardando..." : "Crear Usuario"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogo: Editar Usuario */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-lg w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-emerald-600" />
                            Editar Administrador
                        </DialogTitle>
                        <DialogDescription>Modifica los datos del usuario administrativo.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-5 py-2">
                        {/* Columna de Datos de Usuario */}
                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <Label htmlFor="edit-identificacion" className="text-xs font-semibold">Identificación *</Label>
                                <Input
                                    id="edit-identificacion"
                                    placeholder="Cédula/Documento"
                                    value={identificacion}
                                    onChange={(e) => setIdentificacion(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="edit-nombres" className="text-xs font-semibold">Nombres *</Label>
                                    <Input
                                        id="edit-nombres"
                                        placeholder="Nombres"
                                        value={nombres}
                                        onChange={(e) => setNombres(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit-apellido" className="text-xs font-semibold">Apellidos *</Label>
                                    <Input
                                        id="edit-apellido"
                                        placeholder="Apellidos"
                                        value={apellido}
                                        onChange={(e) => setApellido(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="edit-email" className="text-xs font-semibold">Correo Electrónico *</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    placeholder="email@dominio.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="edit-telefono" className="text-xs font-semibold">Teléfono</Label>
                                <Input
                                    id="edit-telefono"
                                    placeholder="Opcional"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateUser} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                            {isPending ? "Guardando..." : "Actualizar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialogo: Eliminar Usuario */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la cuenta del administrador{" "}
                            <strong className="text-foreground">{userToDelete?.name}</strong> de forma permanente del sistema y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-white" disabled={isPending}>
                            {isPending ? "Eliminando..." : "Eliminar Usuario"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogo: Restablecer Contraseña */}
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restablecer contraseña</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Desea restablecer la contraseña de{" "}
                            <strong className="text-foreground">{userToReset?.name}</strong>? La contraseña volverá a ser: <strong className="text-foreground">{userToReset?.profile?.identificacion}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isPending}>
                            {isPending ? "Procesando..." : "Restablecer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
