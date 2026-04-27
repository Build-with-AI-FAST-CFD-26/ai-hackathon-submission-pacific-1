import { SyncSidebar } from "@/components/sync/SyncSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SyncSidebar />
      <main className="flex-1 relative flex flex-col min-w-0 pt-20 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
