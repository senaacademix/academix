"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
    Scale, 
    ShieldAlert, 
    Copy, 
    Check, 
    FileText, 
    BookOpen, 
    Info, 
    Sparkles, 
    AlertCircle, 
    Users, 
    UserX 
} from "lucide-react";
import { toast } from "sonner";

interface LicenseClientViewProps {
    licenseText: string;
    readmeText: string;
}

export function LicenseClientView({ licenseText, readmeText }: LicenseClientViewProps) {
    const [copiedLicense, setCopiedLicense] = useState(false);
    const [copiedReadme, setCopiedReadme] = useState(false);

    const handleCopyLicense = () => {
        navigator.clipboard.writeText(licenseText);
        setCopiedLicense(true);
        toast.success("Licencia copiada al portapapeles");
        setTimeout(() => setCopiedLicense(false), 2000);
    };

    const handleCopyReadme = () => {
        navigator.clipboard.writeText(readmeText);
        setCopiedReadme(true);
        toast.success("Aviso de README copiado al portapapeles");
        setTimeout(() => setCopiedReadme(false), 2000);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                when: "beforeChildren",
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div 
            className="flex flex-col gap-6 p-1 sm:p-6 max-w-4xl mx-auto min-h-screen"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5"
                variants={itemVariants}
            >
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Scale className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text">
                            Licencia de Uso
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">
                        Términos de uso condicional y restricciones legales de la plataforma AcademiX / AcademiX.
                    </p>
                </div>
                <Badge variant="outline" className="h-7 text-xs border-primary/20 text-primary self-start sm:self-auto bg-primary/5 px-3 font-semibold shadow-sm">
                    Uso Gratuito (Código Cerrado)
                </Badge>
            </motion.div>

            {/* Warning Banner */}
            <motion.div 
                className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent text-destructive-foreground dark:text-red-300 shadow-sm"
                variants={itemVariants}
            >
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <ShieldAlert className="w-40 h-40" />
                </div>
                <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5 text-destructive" />
                <div className="space-y-1">
                    <p className="font-semibold text-base flex items-center gap-1.5 text-destructive dark:text-red-400">
                        Restricción Legal Absoluta de Campo de Uso
                    </p>
                    <p className="text-sm opacity-90 leading-relaxed max-w-3xl">
                        Este software está licenciado bajo condiciones estrictas de propósito. Está <strong>estrictamente prohibido</strong> su uso para la fiscalización, control laboral de asistencia o supervisión de desempeño de <strong>profesores, instructores o personal administrativo</strong>. Su uso está restringido exclusivamente al seguimiento académico de <strong>estudiantes</strong>.
                    </p>
                </div>
            </motion.div>

            {/* Main Tabs */}
            <motion.div variants={itemVariants} className="w-full">
                <Tabs defaultValue="overview" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-xl h-11">
                        <TabsTrigger value="overview" className="rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                            <Info className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">Resumen y Guía</span>
                            <span className="sm:hidden">Resumen</span>
                        </TabsTrigger>
                        <TabsTrigger value="license" className="rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">Licencia de Uso</span>
                            <span className="sm:hidden">Licencia</span>
                        </TabsTrigger>
                        <TabsTrigger value="readme" className="rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                            <BookOpen className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">Aviso README</span>
                            <span className="sm:hidden">README</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border border-muted-foreground/10 bg-card shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Sparkles className="w-5 h-5" />
                                        <CardTitle className="text-lg">¿Por qué esta Licencia?</CardTitle>
                                    </div>
                                    <CardDescription>La filosofía detrás de la restricción de campo de uso.</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                                    <p>
                                        La prioridad absoluta de esta licencia es la <strong>protección laboral de los docentes</strong>. A diferencia del software libre tradicional, este modelo prohíbe la modificación y reutilización del código, y restringe el uso del sistema para evitar que sea transformado en una herramienta de vigilancia o control del profesorado por parte de las instituciones.
                                    </p>
                                    <p>
                                        El software se ofrece de forma gratuita para su uso final, garantizando que cumpla con el propósito original sin alteraciones no autorizadas.
                                    </p>
                                    <p>
                                        Esto otorga control legal total para retirar el derecho de uso o demandar a cualquier institución que intente utilizar el software para auditar horarios de entrada/salida o fiscalizar el desempeño del personal.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border border-muted-foreground/10 bg-card shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Scale className="w-5 h-5" />
                                        <CardTitle className="text-lg">Ventajas Clave</CardTitle>
                                    </div>
                                    <CardDescription>Beneficios del enfoque de Licencia de Uso Condicional.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-2.5 text-sm">
                                        <div className="p-1 rounded-md bg-emerald-500/10 text--600 dark:text--400 dark:text-emerald-400 shrink-0">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Claridad jurídica para profesores</p>
                                            <p className="text-muted-foreground text-xs mt-0.5">Los sindicatos o profesores pueden exigir el cese inmediato de uso si detectan vigilancia.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5 text-sm">
                                        <div className="p-1 rounded-md bg-emerald-500/10 text--600 dark:text--400 dark:text-emerald-400 shrink-0">
                                            <UserX className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Manos atadas para abusos</p>
                                            <p className="text-muted-foreground text-xs mt-0.5">El código no puede ser modificado ni reutilizado, garantizando que ninguna institución pueda alterar sus restricciones protectoras.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border border-muted-foreground/10 bg-card shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-primary" />
                                    Instrucciones de Aplicación
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Para aplicar formalmente esta licencia en un fork o despliegue modificado:</p>
                                <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm mt-2">
                                    <li>Crea un archivo llamado <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">LICENSE</code> en la raíz del proyecto.</li>
                                    <li>Copia el contenido exacto de la pestaña <strong>Licencia de Uso</strong>.</li>
                                    <li>Reemplaza el Año y el Nombre del Proyecto en la primera línea.</li>
                                    <li>Añade la advertencia en el archivo <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">README.md</code> como se detalla en la pestaña <strong>Aviso README</strong>.</li>
                                </ol>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* License Code Tab */}
                    <TabsContent value="license" className="focus-visible:outline-none">
                        <Card className="border border-muted-foreground/10 shadow-sm overflow-hidden bg-background">
                            <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between py-4 px-6">
                                <div>
                                    <CardTitle className="text-base font-bold">LICENSE</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">Texto legal oficial de la licencia condicional.</CardDescription>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleCopyLicense}
                                    className="flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
                                >
                                    {copiedLicense ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span className="text-emerald-500 font-medium">Copiado</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copiar Texto</span>
                                        </>
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[500px] overflow-y-auto p-6 font-mono text-xs text-foreground/80 leading-relaxed bg-muted/5 whitespace-pre-wrap selection:bg-primary/20">
                                    {licenseText}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* README Tab */}
                    <TabsContent value="readme" className="focus-visible:outline-none">
                        <Card className="border border-muted-foreground/10 shadow-sm overflow-hidden bg-background">
                            <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between py-4 px-6">
                                <div>
                                    <CardTitle className="text-base font-bold">README.md Notice</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">Advertencia para la sección principal del README.</CardDescription>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleCopyReadme}
                                    className="flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
                                >
                                    {copiedReadme ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span className="text-emerald-500 font-medium">Copiado</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copiar Aviso</span>
                                        </>
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Pega la siguiente advertencia en una sección visible (preferiblemente al principio) de tu archivo <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">README.md</code>:
                                </p>
                                <div className="p-4 rounded-xl border font-mono text-xs bg-muted/10 text-foreground/85 whitespace-pre-wrap">
                                    {readmeText}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.div>
    );
}
