import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePage from "@/features/home/components/HomePage";
import { getFormattedTodayDate } from "@/lib/dateUtils";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  const reqHeaders = await headers();
  const timezone = reqHeaders.get("x-vercel-ip-timezone") || "America/Bogota";
  const initialDate = getFormattedTodayDate(timezone);

  return (
    <HomePage 
      initialUserName={session?.user?.name} 
      initialUserRole={session?.user?.role} 
      initialDate={initialDate}
    />
  );
}
