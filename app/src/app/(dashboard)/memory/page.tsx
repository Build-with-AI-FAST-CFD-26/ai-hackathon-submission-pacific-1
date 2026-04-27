import { SyncMemory } from "@/components/sync/SyncMemory";

export default function MemoryPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <SyncMemory />
    </div>
  );
}
