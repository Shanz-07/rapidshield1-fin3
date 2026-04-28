import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64 w-full">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 relative custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
