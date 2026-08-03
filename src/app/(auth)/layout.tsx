export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark bg-slate-950 min-h-screen w-full flex items-center justify-center">
      {children}
    </div>
  );
}
