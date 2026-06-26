import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePage from "@/features/home/components/HomePage";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  const initialDate = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
  });

  return (
    <HomePage 
      initialUserName={session?.user?.name} 
      initialUserRole={session?.user?.role} 
      initialDate={initialDate}
    />
  );
}
