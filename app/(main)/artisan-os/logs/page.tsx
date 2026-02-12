import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { OperationsLogClient } from "./logs-management";

export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  created_at: string;
  content: string;
  kind: string;
};

export default async function OperationsLogPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // PUMWI DB에서 운영 로그 조회
  const { data: logs } = await supabase
    .from("operations_logs")
    .select("id, created_at, content, kind")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (logs ?? []) as LogRow[];

  // --- Server Actions ---
  // 아래 함수들은 클라이언트 컴포넌트로 전달되어 버튼 클릭 시 실행됩니다.
  
  async function createLog(formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;
    const content = String(formData.get("content") ?? "").trim();
    const kind = ["note", "request", "reminder"].includes(String(formData.get("kind"))) ? formData.get("kind") : "note";
    if (!content) return;
    await supabaseServer.from("operations_logs").insert({ user_id: u.id, content, kind });
    revalidatePath("/artisan-os/logs");
  }

  async function updateLog(id: string, formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;
    const content = String(formData.get("content") ?? "").trim();
    const kind = ["note", "request", "reminder"].includes(String(formData.get("kind"))) ? formData.get("kind") : "note";
    if (!content) return;
    await supabaseServer.from("operations_logs").update({ content, kind }).eq("id", id).eq("user_id", u.id);
    revalidatePath("/artisan-os/logs");
  }

  async function deleteLog(id: string) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;
    await supabaseServer.from("operations_logs").delete().eq("id", id).eq("user_id", u.id);
    revalidatePath("/artisan-os/logs");
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center py-12 px-4 bg-[#F9F9F8] min-h-screen">
      <div className="max-w-4xl w-full space-y-8">
        {/* 중앙 정렬 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold text-[#2F5D50]">
            Operations Log
          </h1>
          <p className="text-gray-500 text-sm">
            Internal notes, production requests, and business reminders.
          </p>
        </div>

        {/* 메인 컨텐츠 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <OperationsLogClient
            logs={list}
            createLog={createLog}
            updateLog={updateLog}
            deleteLog={deleteLog}
          />
        </div>
      </div>
    </div>
  );
}