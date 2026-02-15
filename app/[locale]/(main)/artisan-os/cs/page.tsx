import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { CSInbox } from "./cs-inbox";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"] as const;

export default async function CSPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // DB에서 CS 데이터 가져오기
  const { data: inquiries } = await supabase
    .from("cs_inquiries")
    .select("id, created_at, customer_name, content, product_name, status, ai_reply")
    .eq("user_id", user.id)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  // --- Server Actions (서버 기능) ---

  async function updateInquiryStatus(inquiryId: string, newStatus: string) {
    "use server";
    // 보안 검증
    if (!VALID_STATUSES.includes(newStatus as any)) return;
    
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;

    await supabaseServer
      .from("cs_inquiries")
      .update({ status: newStatus })
      .eq("id", inquiryId)
      .eq("user_id", u.id);
  }

  async function createInquiry(formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;

    const customer_name = String(formData.get("customer_name") ?? "").trim() || "Unknown";
    const content = String(formData.get("content") ?? "").trim();
    const product_name = formData.get("product_name") ? String(formData.get("product_name")).trim() || null : null;
    const status = VALID_STATUSES.includes(String(formData.get("status")) as any) ? formData.get("status") : "open";

    if (!content) return;

    await supabaseServer.from("cs_inquiries").insert({
      user_id: u.id,
      customer_name,
      content,
      product_name,
      status,
    });
  }

  async function updateInquiry(id: string, formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;

    const customer_name = String(formData.get("customer_name") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const product_name = formData.get("product_name") ? String(formData.get("product_name")).trim() || null : null;

    if (!customer_name || !content) return;

    await supabaseServer
        .from("cs_inquiries")
        .update({ customer_name, content, product_name })
        .eq("id", id)
        .eq("user_id", u.id);
  }

  async function deleteInquiry(id: string) {
    "use server";
    const supabaseServer = await createClient();
    const { data: { user: u } } = await supabaseServer.auth.getUser();
    if (!u) return;

    await supabaseServer
        .from("cs_inquiries")
        .delete()
        .eq("id", id)
        .eq("user_id", u.id);
  }

  // 데이터 포맷팅
  const list = (inquiries ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    customer_name: r.customer_name,
    content: r.content,
    product_name: r.product_name ?? null,
    status: r.status,
    ai_reply: r.ai_reply ?? null,
  }));

  return (
    <div className="flex-1 w-full flex flex-col items-center py-12 px-4 bg-[#F9F9F8] min-h-screen">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* 중앙 정렬 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold text-[#2F5D50]">
            CS Master
          </h1>
          <p className="text-gray-500 text-sm">
            Manage customer inquiries and AI drafts in one place.
          </p>
        </div>

        {/* 메인 컨텐츠 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <CSInbox
            inquiries={list}
            updateStatus={updateInquiryStatus}
            createInquiry={createInquiry}
            updateInquiry={updateInquiry}
            deleteInquiry={deleteInquiry}
          />
        </div>
      </div>
    </div>
  );
}