"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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

import {
    Search, Trash2, Eye, UserCog, Users as UsersIcon, UserPlus, ChevronLeft, ChevronRight,
    BookOpen, Calendar, MessageSquare, FileText, CheckCircle2, AlertCircle, X, GraduationCap,
    Key, RefreshCw, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { updateUserRoleAction, deleteUserAction, createUserAction, toggleUserBanAction, getAllUsersAction, resetUserPasswordToDocAction, getComprehensiveGroupAnalyticsAction, getAllFilteredUserIdsAction, getUserEmailsAction, updateStudentNovedadAction } from "@/app/admin-actions";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatName } from "@/lib/utils";
import { StudentRecords } from "@/features/student/components/StudentRecords";
import { StudentNovedadBadge } from "@/components/StudentNovedadBadge";
import { GroupAnalyticsPanel } from "@/components/analytics/GroupAnalyticsPanel";
import { getGroupAttendanceHistory, getGroupRemarksHistory, resetStudentDailyAttempts } from "@/features/teacher/actions/groupActions";

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    image: string | null;
    createdAt: Date;
    banned?: boolean | null;
    profile?: {
        identificacion: string | null;
        nombres: string | null;
        apellido: string | null;
        telefono: string | null;
        novedad?: string | null;
        novedadColor?: string | null;
        dataProcessingConsent?: boolean | null;
    } | null;
    group?: {
        id: string;
        name: string;
    } | null;
    _count?: {
        enrollments: number;
    };
}

interface UserManagementProps {
    initialUsers: User[];
    totalCount: number;
    initialGroupId?: string;
    initialGroups?: { id: string, name: string, programId?: string, categoria?: string }[];
    initialPrograms?: { id: string, name: string }[];
    isObserver?: boolean;
}

export function UserManagement({ 
    initialUsers, 
    totalCount, 
    initialGroupId = "all", 
    initialGroups = [],
    initialPrograms = [],
    isObserver = false
}: UserManagementProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("student");
    const [programFilter, setProgramFilter] = useState<string>(() => {
        if (initialGroupId && initialGroupId !== "all") {
            const group = initialGroups.find(g => g.id === initialGroupId);
            if (group?.programId) return group.programId;
        }
        return initialPrograms[0]?.id || "none";
    });
    const [groupFilter, setGroupFilter] = useState<string>(() => {
        if (initialGroupId && initialGroupId !== "all" && initialGroupId !== "none") {
            return initialGroupId;
        }
        const defaultProgramId = initialPrograms[0]?.id;
        if (defaultProgramId) {
            const group = initialGroups.find(g => g.programId === defaultProgramId && g.categoria === "LECTIVA");
            if (group) return group.id;
        }
        const firstLectivaGroup = initialGroups.find(g => g.categoria === "LECTIVA");
        if (firstLectivaGroup) return firstLectivaGroup.id;
        return "none";
    });
    const [categoriaFilter, setCategoriaFilter] = useState<string>("LECTIVA");
    const [programsList, setProgramsList] = useState<{ id: string, name: string }[]>(initialPrograms);
    const [groupsList, setGroupsList] = useState<{ id: string, name: string, programId?: string, categoria?: string }[]>(initialGroups);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [novedadDialogOpen, setNovedadDialogOpen] = useState(false);
    const [userForNovedad, setUserForNovedad] = useState<User | null>(null);
    const [novedadText, setNovedadText] = useState("");
    const [novedadColorText, setNovedadColorText] = useState<string>("blue");

    
    // Group analytics state
    const [fullAnalyticsData, setFullAnalyticsData] = useState<any>(null);
    const [loadingGroupAnalytics, setLoadingGroupAnalytics] = useState(false);
    const [showGroupAnalytics, setShowGroupAnalytics] = useState(false);

    const [isPending, startTransition] = useTransition();

    // Create user form state
    const [newIdentificacion, setNewIdentificacion] = useState("");
    const [newNombres, setNewNombres] = useState("");
    const [newApellido, setNewApellido] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newTelefono, setNewTelefono] = useState("");
    const [newGroupId, setNewGroupId] = useState<string>("none");
    const [newUserPassword, setNewUserPassword] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [currentTotal, setCurrentTotal] = useState(totalCount);
    const usersPerPage = 20;
    const totalPages = Math.ceil(currentTotal / usersPerPage);

    // Role change dialog state
    const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
    const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: "teacher" | "student" | "admin"; userName: string } | null>(null);
    const [roleChangeConfirmation, setRoleChangeConfirmation] = useState("");

    // Load group analytics when group filter changes
    useEffect(() => {
        if (showGroupAnalytics && groupFilter && groupFilter !== "all" && groupFilter !== "none") {
            setLoadingGroupAnalytics(true);
            setFullAnalyticsData(null);
            getComprehensiveGroupAnalyticsAction(groupFilter).then((data) => {
                setFullAnalyticsData(data);
                setLoadingGroupAnalytics(false);
            }).catch(() => {
                toast.error("Error cargando analítica");
                setLoadingGroupAnalytics(false);
            });
        } else {
            setFullAnalyticsData(null);
        }
    }, [groupFilter, showGroupAnalytics]);

    // Groups are loaded from props

    const refreshUsers = async (page = 1, overrides?: { role?: string, group?: string, program?: string, search?: string }) => {
        setIsLoadingPage(true);
        try {
            const offset = (page - 1) * usersPerPage;
            // Use overrides if provided, otherwise current state
            const roleIdx = overrides?.role !== undefined ? overrides.role : roleFilter;
            const groupIdx = overrides?.group !== undefined ? overrides.group : groupFilter;
            const programIdx = overrides?.program !== undefined ? overrides.program : programFilter;
            const searchIdx = overrides?.search !== undefined ? overrides.search : searchQuery;

            const { users: newUsers, total } = await getAllUsersAction({
                limit: usersPerPage,
                offset,
                role: roleIdx !== "all" ? roleIdx as any : undefined,
                groupId: groupIdx !== "all" ? groupIdx : undefined,
                programId: programIdx !== "all" ? programIdx : undefined,
                search: searchIdx || undefined
            });
            setUsers(newUsers);
            setCurrentTotal(total);
            setCurrentPage(page);
        } catch (error) {
            toast.error("Error al cargar usuarios");
        } finally {
            setIsLoadingPage(false);
        }
    };

    const onFilterChange = (type: 'role' | 'group' | 'program' | 'search' | 'categoria', value: string) => {
        let currentRole = roleFilter;
        let currentGroup = groupFilter;
        let currentProgram = programFilter;
        let currentSearch = searchQuery;
        let currentCategoria = categoriaFilter;

        if (type === 'role') {
            setRoleFilter(value);
            currentRole = value;
        } else if (type === 'categoria') {
            setCategoriaFilter(value);
            currentCategoria = value;
            const filteredGroups = groupsList.filter(g => 
                (programFilter === "all" || g.programId === programFilter) &&
                (value === "all" || g.categoria === value)
            );
            const defaultGroupForCategory = filteredGroups.length > 0 ? filteredGroups[0].id : "none";
            setGroupFilter(defaultGroupForCategory);
            currentGroup = defaultGroupForCategory;
        } else if (type === 'group') {
            setGroupFilter(value);
            currentGroup = value;
        } else if (type === 'program') {
            setProgramFilter(value);
            currentProgram = value;
            const filteredGroups = groupsList.filter(g => 
                (g.programId === value) &&
                (categoriaFilter === "all" || g.categoria === categoriaFilter)
            );
            const defaultGroupForProgram = filteredGroups.length > 0 ? filteredGroups[0].id : "none";
            setGroupFilter(defaultGroupForProgram);
            currentGroup = defaultGroupForProgram;
        } else if (type === 'search') {
            setSearchQuery(value);
            currentSearch = value;
        }

        startTransition(() => {
            refreshUsers(1, {
                role: currentRole,
                group: currentGroup,
                program: currentProgram,
                search: currentSearch
            });
        });
    };

    const handlePageChange = async (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || isLoadingPage) return;
        refreshUsers(newPage);
    };

    const handleRoleChange = async (userId: string, newRole: "teacher" | "student" | "admin") => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setPendingRoleChange({ userId, newRole, userName: formatName(user.name, user.profile) });
        setRoleChangeDialogOpen(true);
    };

    const confirmRoleChange = async () => {
        if (!pendingRoleChange || roleChangeConfirmation !== "cambiar") return;

        startTransition(async () => {
            try {
                await updateUserRoleAction(pendingRoleChange.userId, pendingRoleChange.newRole);

                setUsers(prev => prev.map(u =>
                    u.id === pendingRoleChange.userId ? { ...u, role: pendingRoleChange.newRole } : u
                ));

                toast.success("Rol actualizado", {
                    description: `El rol del usuario ha sido cambiado a ${pendingRoleChange.newRole}`
                });

                setRoleChangeDialogOpen(false);
                setPendingRoleChange(null);
                setRoleChangeConfirmation("");
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo actualizar el rol"
                });
            }
        });
    };

    const handleResetPassword = async () => {
        if (!userToResetPassword) return;

        startTransition(async () => {
            try {
                await resetUserPasswordToDocAction(userToResetPassword.id);
                toast.success("Contraseña restablecida", {
                    description: "La contraseña ha sido restablecida al número de documento"
                });
                setResetPasswordDialogOpen(false);
                setUserToResetPassword(null);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo restablecer la contraseña"
                });
            }
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        startTransition(async () => {
            try {
                await deleteUserAction(userToDelete.id);

                setUsers(prev => prev.filter(u => u.id !== userToDelete.id));

                toast.success("Usuario eliminado", {
                    description: "El usuario ha sido eliminado del sistema"
                });

                setDeleteDialogOpen(false);
                setUserToDelete(null);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo eliminar el usuario"
                });
            }
        });
    };

    const handleToggleBan = async (userId: string, currentBanned: boolean) => {
        startTransition(async () => {
            try {
                await toggleUserBanAction(userId, !currentBanned);

                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, banned: !currentBanned } : u
                ));

                toast.success(!currentBanned ? "Usuario baneado" : "Usuario desbaneado", {
                    description: `El usuario ha sido ${!currentBanned ? 'baneado' : 'desbaneado'} exitosamente`
                });
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo actualizar el estado del usuario"
                });
            }
        });
    };

    const getRoleBadgeVariant = (role: string | null) => {
        switch (role) {
            case "admin":
                return "destructive";
            case "teacher":
                return "default";
            case "student":
                return "secondary";
            default:
                return "outline";
        }
    };

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case "admin":
                return "Administrador";
            case "teacher":
                return "Profesor";
            case "student":
                return "Estudiante";
            default:
                return role || "Sin rol";
        }
    };

    const handleSaveNovedad = async () => {
        if (!userForNovedad) return;

        startTransition(async () => {
            try {
                await updateStudentNovedadAction(userForNovedad.id, novedadText, novedadColorText);
                
                setUsers(prev => prev.map(u => {
                    if (u.id === userForNovedad.id) {
                        return {
                            ...u,
                            profile: u.profile ? {
                                ...u.profile,
                                novedad: novedadText ? novedadText.trim() : null,
                                novedadColor: novedadColorText ? novedadColorText.trim() : null
                            } : {
                                identificacion: "",
                                nombres: "",
                                apellido: "",
                                telefono: null,
                                novedad: novedadText ? novedadText.trim() : null,
                                novedadColor: novedadColorText ? novedadColorText.trim() : null,
                                dataProcessingConsent: false
                            }
                        };
                    }
                    return u;
                }));

                toast.success("Novedad actualizada", {
                    description: `Se actualizó la novedad del estudiante.`
                });
                setNovedadDialogOpen(false);
                setUserForNovedad(null);
                setNovedadText("");
                setNovedadColorText("blue");
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo actualizar la novedad"
                });
            }
        });
    };

    const handleCreateUser = async () => {
        if (!newIdentificacion || !newNombres || !newApellido || !newUserEmail) {
            toast.error("Error", {
                description: "Identificación, nombres, apellidos y correo son obligatorios"
            });
            return;
        }

        const passwordToUse = newUserPassword || newIdentificacion;

        startTransition(async () => {
            try {
                const fullName = `${newNombres.trim()} ${newApellido.trim()}`;
                const user = await createUserAction({
                    email: newUserEmail.trim(),
                    name: fullName,
                    role: "student",
                    password: passwordToUse,
                    groupId: newGroupId !== "none" ? newGroupId : undefined,
                    identificacion: newIdentificacion.trim(),
                    nombres: newNombres.trim(),
                    apellido: newApellido.trim(),
                    telefono: newTelefono.trim() || undefined
                });

                const newUserItem: User = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    image: user.image,
                    createdAt: new Date(user.createdAt),
                    banned: user.banned,
                    profile: user.profile ? {
                        identificacion: user.profile.identificacion,
                        nombres: user.profile.nombres,
                        apellido: user.profile.apellido,
                        telefono: user.profile.telefono,
                        dataProcessingConsent: user.profile.dataProcessingConsent
                    } : null,
                    group: user.group ? {
                        id: user.group.id,
                        name: user.group.name
                    } : null,
                    _count: {
                        enrollments: 0
                    }
                };

                setUsers(prev => [newUserItem, ...prev]);

                toast.success("Estudiante creado", {
                    description: `Se ha registrado el estudiante ${fullName}`
                });

                setNewIdentificacion("");
                setNewNombres("");
                setNewApellido("");
                setNewUserEmail("");
                setNewTelefono("");
                setNewGroupId("none");
                setNewUserPassword("");
                setCreateDialogOpen(false);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo registrar el estudiante"
                });
            }
        });
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h2>
                    <p className="text-muted-foreground">
                        Administra los estudiantes de los grupos de formación
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <Badge variant="outline" className="text-sm">
                        <UsersIcon className="mr-2 h-3 w-3" />
                        {currentTotal} estudiantes totales
                    </Badge>
                    
                    {selectedUserIds.length > 0 && (
                        <Button 
                            variant="secondary" 
                            className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                            onClick={async () => {
                                try {
                                    const emails = await getUserEmailsAction(selectedUserIds);
                                    if (emails.length > 0) {
                                        window.location.href = `mailto:${emails.join(',')}`;
                                    } else {
                                        toast.error("Ninguno de los estudiantes seleccionados tiene un correo registrado");
                                    }
                                } catch (error) {
                                    toast.error("Error al obtener los correos de los estudiantes");
                                }
                            }}
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar a Seleccionados ({selectedUserIds.length})
                        </Button>
                    )}
                    {!isObserver && (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Crear Estudiante
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>Busca y filtra estudiantes</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o email..."
                                value={searchQuery}
                                onChange={(e) => onFilterChange('search', e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={programFilter} onValueChange={(val) => onFilterChange('program', val)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por programa" />
                            </SelectTrigger>
                            <SelectContent>
                                {programsList.map((program) => (
                                    <SelectItem key={program.id} value={program.id}>
                                        {program.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={categoriaFilter} onValueChange={(val) => onFilterChange('categoria', val)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por etapa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LECTIVA">Etapa Lectiva</SelectItem>
                                <SelectItem value="PRODUCTIVA">Etapa Productiva</SelectItem>
                                <SelectItem value="EGRESADOS">Egresados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={groupFilter} onValueChange={(val) => onFilterChange('group', val)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                {groupsList
                                    .filter((g) => 
                                        (programFilter === "all" || g.programId === programFilter) &&
                                        (categoriaFilter === "all" || g.categoria === categoriaFilter)
                                    )
                                    .map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                        </SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowGroupAnalytics(!showGroupAnalytics)}
                            className={showGroupAnalytics ? "bg-primary/10 text-primary border-primary/20" : ""}
                        >
                            {showGroupAnalytics ? "Ocultar Analítica" : "Ver Analítica de Grupo"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Group Analytics Modal */}
            <GroupAnalyticsPanel 
                open={showGroupAnalytics} 
                onOpenChange={setShowGroupAnalytics}
                isLoading={loadingGroupAnalytics}
                analyticsData={fullAnalyticsData}
            />

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Estudiantes ({users.length})</CardTitle>
                    <CardDescription>
                        Lista de todos los estudiantes registrados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    
                                    <TableHead className="w-[40px]">
                                        <Checkbox 
                                            checked={currentTotal > 0 && selectedUserIds.length === currentTotal}
                                            onCheckedChange={async (checked) => {
                                                if (checked) {
                                                    setIsLoadingPage(true);
                                                    try {
                                                        const ids = await getAllFilteredUserIdsAction({
                                                            role: roleFilter !== "all" ? roleFilter as any : undefined,
                                                            groupId: groupFilter !== "all" ? groupFilter : undefined,
                                                            programId: programFilter !== "all" ? programFilter : undefined,
                                                            search: searchQuery || undefined
                                                        });
                                                        setSelectedUserIds(ids);
                                                    } catch (e) {
                                                        toast.error("Error al seleccionar todos los estudiantes");
                                                    } finally {
                                                        setIsLoadingPage(false);
                                                    }
                                                } else {
                                                    setSelectedUserIds([]);
                                                }
                                            }}
                                            aria-label="Seleccionar todos"
                                        />
                                    </TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead className="hidden lg:table-cell">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No se encontraron estudiantes
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    [...users].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((user) => (
                                        <TableRow key={user.id}>
                                            
                                            <TableCell>
                                                <Checkbox 
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedUserIds(prev => [...prev, user.id]);
                                                        } else {
                                                            setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                                        }
                                                    }}
                                                    aria-label={`Seleccionar ${user.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        src={user.image}
                                                        alt={formatName(user.name, user.profile)}
                                                        fallbackText={formatName(user.name, user.profile)}
                                                        size="sm"
                                                    />
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            <span>{formatName(user.name, user.profile)}</span>
                                                            <StudentNovedadBadge novedad={user.profile?.novedad} color={user.profile?.novedadColor} />
                                                        </div>
                                                        {user.profile && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.profile.identificacion}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={!user.banned}
                                                        onCheckedChange={() => handleToggleBan(user.id, user.banned || false)}
                                                        disabled={isPending || isObserver}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {user.banned ? "Baneado" : "Activo"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    
                                                    <Tooltip><TooltipTrigger asChild><Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (user.email) window.location.href = `mailto:${user.email}`;
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <Mail className="h-4 w-4" />
                                                    </Button></TooltipTrigger><TooltipContent><p>Enviar correo</p></TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button
                                                         variant="ghost"
                                                         size="icon"
                                                         onClick={() => {
                                                             setSelectedUser(user);
                                                             setDetailsSheetOpen(true);
                                                         }}
                                                         className="text-primary hover:text-primary/80"
                                                     >
                                                         <GraduationCap className="h-4 w-4" />
                                                     </Button></TooltipTrigger><TooltipContent><p>Ver Registro Académico</p></TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            onClick={() => {
                                                                                                                setUserToResetPassword(user);
                                                                                                                setResetPasswordDialogOpen(true);
                                                                                                            }}
                                                                                                            disabled={isPending || (!user.profile?.identificacion) || isObserver}
                                                                                                            className="text-amber-600 hover:text-amber-700"
                                                                                                        >
                                                                                                            <Key className="h-4 w-4" />
                                                                                                        </Button></TooltipTrigger><TooltipContent><p>{user.profile?.identificacion ? "Restablecer contraseña al número de documento" : "Usuario sin documento registrado"}</p></TooltipContent></Tooltip>
                                                    {!isObserver && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setUserForNovedad(user);
                                                                        setNovedadText(user.profile?.novedad || "");
                                                                        setNovedadColorText(user.profile?.novedadColor || "blue");
                                                                        setNovedadDialogOpen(true);
                                                                    }}
                                                                    disabled={isPending}
                                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                                                                >
                                                                    <Bookmark className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Registrar Novedad</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {!isObserver && (
                                                         <Tooltip><TooltipTrigger asChild><Button
                                                             variant="ghost"
                                                             size="icon"
                                                             onClick={async () => {
                                                                 try {
                                                                     const res = await resetStudentDailyAttempts(user.id);
                                                                     if (res.success) {
                                                                         toast.success("Intentos diarios reiniciados con éxito.");
                                                                     } else {
                                                                         toast.error(res.error || "No se pudieron reiniciar los intentos.");
                                                                     }
                                                                 } catch (error) {
                                                                     toast.error("Error al conectar con el servidor.");
                                                                 }
                                                             }}
                                                             className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                                         >
                                                             <RefreshCw className="h-4 w-4" />
                                                         </Button></TooltipTrigger><TooltipContent><p>Reiniciar intentos diarios</p></TooltipContent></Tooltip>
                                                     )}
                                                     {!isObserver && (
                                                         <Button
                                                             variant="ghost"
                                                             size="icon"
                                                             onClick={() => {
                                                                 setUserToDelete(user);
                                                                 setDeleteDialogOpen(true);
                                                             }}
                                                             disabled={isPending}
                                                             className="text-destructive hover:text-destructive"
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                Mostrando {((currentPage - 1) * usersPerPage) + 1} - {Math.min(currentPage * usersPerPage, currentTotal)} de {currentTotal} estudiantes
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || isLoadingPage}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Anterior</span>
                                </Button>
                                <div className="text-xs sm:text-sm whitespace-nowrap">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || isLoadingPage}
                                >
                                    <span className="hidden sm:inline">Siguiente</span>
                                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reset Password Confirmation Dialog */}
            <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer contraseña?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de restablecer la contraseña de 
                            {userToResetPassword && ` "${formatName(userToResetPassword.name, userToResetPassword.profile)}" `} 
                            a su número de documento de identidad ({userToResetPassword?.profile?.identificacion}).
                            <br/><br/>
                            ¿Estás seguro de que deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetPassword}
                            disabled={isPending}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            {isPending ? "Restableciendo..." : "Restablecer Contraseña"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el estudiante
                            {userToDelete && ` "${userToDelete.name || userToDelete.email}"`} y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Role Change Confirmation Dialog */}
            <Dialog open={roleChangeDialogOpen} onOpenChange={(open) => {
                setRoleChangeDialogOpen(open);
                if (!open) {
                    setPendingRoleChange(null);
                    setRoleChangeConfirmation("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Cambiar rol de usuario?</DialogTitle>
                        <DialogDescription>
                            Estás a punto de cambiar el rol de <strong>{pendingRoleChange?.userName}</strong> a{" "}
                            <strong>{pendingRoleChange?.newRole === "admin" ? "Administrador" : pendingRoleChange?.newRole === "teacher" ? "Profesor" : "Estudiante"}</strong>.
                            <br /><br />
                            Esta acción puede afectar los permisos y accesos del usuario en el sistema.
                            <br /><br />
                            Escribe <strong>cambiar</strong> para confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Escribe cambiar"
                            value={roleChangeConfirmation}
                            onChange={(e) => setRoleChangeConfirmation(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRoleChangeDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmRoleChange}
                            disabled={isPending || roleChangeConfirmation !== "cambiar"}
                        >
                            {isPending ? "Cambiando..." : "Cambiar Rol"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Student Academic Record Dialog */}
            <Dialog open={detailsSheetOpen} onOpenChange={(open) => !open && setDetailsSheetOpen(false)}>
                <DialogContent className="!max-w-[100vw] sm:!max-w-[100vw] w-screen h-screen m-0 p-6 !rounded-none overflow-y-auto border-none bg-background flex flex-col">
                    {selectedUser && (
                        <div className="space-y-6 flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center pb-4 border-b">
                                <div>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <GraduationCap className="w-6 h-6 text-primary" /> Registro Académico
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                                        Historial de {formatName(selectedUser.name, selectedUser.profile)}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <StudentRecords studentId={selectedUser.id} hideTables={false} hideDocumentation={true} />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create User Dialog */}
            < Dialog open={createDialogOpen} onOpenChange={(open) => {
                setCreateDialogOpen(open);
                if (!open) {
                    setNewIdentificacion("");
                    setNewNombres("");
                    setNewApellido("");
                    setNewUserEmail("");
                    setNewTelefono("");
                    setNewGroupId("none");
                    setNewUserPassword("");
                }
            }} >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Nuevo Estudiante</DialogTitle>
                        <DialogDescription>
                            Ingresa los datos personales del estudiante y asígnalo a un grupo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="identificacion">Documento de Identidad</Label>
                                <Input
                                    id="identificacion"
                                    placeholder="123456789"
                                    value={newIdentificacion}
                                    onChange={(e) => setNewIdentificacion(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                                <Input
                                    id="telefono"
                                    placeholder="3001234567"
                                    value={newTelefono}
                                    onChange={(e) => setNewTelefono(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombres">Nombres</Label>
                                <Input
                                    id="nombres"
                                    placeholder="Juan"
                                    value={newNombres}
                                    onChange={(e) => setNewNombres(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="apellido">Apellidos</Label>
                                <Input
                                    id="apellido"
                                    placeholder="Pérez"
                                    value={newApellido}
                                    onChange={(e) => setNewApellido(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="juan.perez@siga.edu.co"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group">Grupo de Formación</Label>
                            <Select value={newGroupId} onValueChange={setNewGroupId} disabled={isPending}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin grupo</SelectItem>
                                    {groupsList.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña (Opcional)</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Por defecto es su Documento de Identidad"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateUser}
                            disabled={isPending}
                        >
                            {isPending ? "Registrando..." : "Registrar Estudiante"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Novedad Dialog */}
            <Dialog open={novedadDialogOpen} onOpenChange={(open) => {
                setNovedadDialogOpen(open);
                if (!open) {
                    setUserForNovedad(null);
                    setNovedadText("");
                }
            }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Novedad de Estudiante</DialogTitle>
                        <DialogDescription>
                            Escribe la novedad o estado especial para {userForNovedad ? formatName(userForNovedad.name, userForNovedad.profile) : ""}. Esta novedad será visible para todos los roles.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="novedad">Detalle de la Novedad</Label>
                            <Input
                                id="novedad"
                                placeholder="Ej: Condicionado, Matrícula de Honor, En observación..."
                                value={novedadText}
                                onChange={(e) => setNovedadText(e.target.value)}
                                disabled={isPending}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Deja el campo vacío para remover cualquier novedad anterior.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Color / Nivel de Estado</Label>
                            <div className="flex items-center gap-2.5 pt-1">
                                {[
                                    { name: "blue", class: "bg-blue-500 hover:bg-blue-600 border-blue-200 dark:border-blue-800", label: "Azul (Información)" },
                                    { name: "red", class: "bg-red-500 hover:bg-red-600 border-red-200 dark:border-red-800", label: "Rojo (Condicionado)" },
                                    { name: "orange", class: "bg-orange-500 hover:bg-orange-600 border-orange-200 dark:border-orange-800", label: "Naranja (Alerta)" },
                                    { name: "yellow", class: "bg-yellow-400 hover:bg-yellow-500 border-yellow-200 dark:border-yellow-800", label: "Amarillo (Atención)" },
                                    { name: "green", class: "bg-emerald-500 hover:bg-emerald-600 border-emerald-200 dark:border-emerald-800", label: "Verde (Logro)" },
                                    { name: "purple", class: "bg-purple-500 hover:bg-purple-600 border-purple-200 dark:border-purple-800", label: "Púrpura (Especial)" },
                                    { name: "gray", class: "bg-slate-500 hover:bg-slate-600 border-slate-200 dark:border-slate-800", label: "Gris (Neutral)" }
                                ].map((colorOpt) => (
                                    <button
                                        key={colorOpt.name}
                                        type="button"
                                        title={colorOpt.label}
                                        onClick={() => setNovedadColorText(colorOpt.name)}
                                        disabled={isPending}
                                        className={`w-7 h-7 rounded-full transition-all duration-150 relative ${colorOpt.class} ${
                                            novedadColorText === colorOpt.name 
                                                ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-md dark:ring-offset-background" 
                                                : "opacity-80 hover:opacity-100 hover:scale-105"
                                        }`}
                                    >
                                        {novedadColorText === colorOpt.name && (
                                            <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-black">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setNovedadDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveNovedad}
                            disabled={isPending}
                        >
                            {isPending ? "Guardando..." : "Guardar Novedad"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
