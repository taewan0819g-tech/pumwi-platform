"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, MessageSquare, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CSInquiry = {
  id: string;
  created_at: string;
  customer_name: string;
  content: string;
  product_name: string | null;
  status: string;
  ai_reply: string | null;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: "bg-red-50 text-red-700 border-red-100",
    in_progress: "bg-blue-50 text-blue-700 border-blue-100",
    waiting: "bg-orange-50 text-orange-700 border-orange-100",
    resolved: "bg-green-50 text-green-700 border-green-100",
    closed: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return map[status] ?? "bg-gray-50 text-gray-700 border-gray-100";
}

const TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "Processing" },
  { value: "resolved", label: "Done" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function CSInbox({
  inquiries,
  updateStatus,
  createInquiry,
  updateInquiry,
  deleteInquiry,
}: {
  inquiries: CSInquiry[];
  updateStatus: (inquiryId: string, newStatus: string) => Promise<void>;
  createInquiry?: (formData: FormData) => Promise<void>;
  updateInquiry?: (id: string, formData: FormData) => Promise<void>;
  deleteInquiry?: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<TabValue>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = filter === "all"
    ? inquiries
    : inquiries.filter((i) => i.status === filter || (filter === "resolved" && i.status === "closed"));

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateStatus(id, newStatus);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 상단 필터 및 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex p-1 bg-gray-100/50 rounded-lg">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                filter === tab.value
                  ? "bg-white text-[#2F5D50] shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {createInquiry && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Inquiry
          </Button>
        )}
      </div>

      {createOpen && createInquiry && (
        <CreateInquiryModal
          onClose={() => setCreateOpen(false)}
          onSubmit={async (formData) => {
            await createInquiry(formData);
            router.refresh();
            setCreateOpen(false);
          }}
        />
      )}

      {/* 문의 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {inquiries.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
             <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No inquiries yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-gray-400">No inquiries match this filter.</p>
          </div>
        ) : (
          filtered.map((inq) => (
            <InquiryCard
              key={inq.id}
              inquiry={inq}
              onStatusChange={handleStatusChange}
              onUpdate={updateInquiry}
              onDelete={deleteInquiry}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ... (CreateInquiryModal, InquiryCard, EditInquiryModal 컴포넌트는 아래에 이어집니다)

function InquiryCard({
  inquiry,
  onStatusChange,
  onUpdate,
  onDelete,
}: {
  inquiry: CSInquiry;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onUpdate?: (id: string, formData: FormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <>
      <div className="group flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 hover:border-[#2F5D50]/30 hover:shadow-md transition-all duration-200">
        <div>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-900 line-clamp-1">{inquiry.customer_name}</h3>
              <span className="text-xs text-gray-400">{new Date(inquiry.created_at).toLocaleDateString()}</span>
            </div>
            <select
              value={inquiry.status}
              onChange={async (e) => {
                setLoading(true);
                await onStatusChange(inquiry.id, e.target.value);
                setLoading(false);
              }}
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-[#2F5D50]",
                getStatusColor(inquiry.status)
              )}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 mb-4">
             {inquiry.product_name && (
              <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-600">
                Product: {inquiry.product_name}
              </div>
            )}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {inquiry.content}
            </p>
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex justify-end gap-2 border-t border-gray-50 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {onUpdate && (
            <button onClick={() => setEditOpen(true)} className="p-1.5 text-gray-400 hover:text-[#2F5D50] hover:bg-gray-50 rounded">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
             <button 
              onClick={async () => {
                if(confirm("Delete this inquiry?")) {
                  await onDelete(inquiry.id);
                  router.refresh();
                }
              }} 
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {editOpen && onUpdate && (
        <EditInquiryModal
          inquiry={inquiry}
          onClose={() => setEditOpen(false)}
          onSubmit={async (formData) => {
            await onUpdate(inquiry.id, formData);
            router.refresh();
            setEditOpen(false);
          }}
        />
      )}
    </>
  );
}

// Modal components (Create / Edit)
function CreateInquiryModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="font-serif text-lg font-bold text-[#2F5D50] mb-4">New Inquiry</h3>
        <form
          action={async (formData: FormData) => {
            await onSubmit(formData);
            onClose();
          }}
          className="space-y-4"
        >
                <div><Label>Customer</Label><Input name="customer_name" required className="mt-1"/></div>
                <div><Label>Message</Label><Textarea name="content" required className="mt-1"/></div>
                <div><Label>Product</Label><Input name="product_name" className="mt-1"/></div>
                <div>
                    <Label>Status</Label>
                    <select name="status" className="w-full mt-1 border rounded-md p-2 text-sm">
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#2F5D50] text-white">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditInquiryModal({
  inquiry,
  onClose,
  onSubmit,
}: {
  inquiry: CSInquiry;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="font-serif text-lg font-bold text-[#2F5D50] mb-4">Edit Inquiry</h3>
        <form
          action={async (formData: FormData) => {
            await onSubmit(formData);
            onClose();
          }}
          className="space-y-4"
        >
                <div><Label>Customer</Label><Input name="customer_name" defaultValue={inquiry.customer_name} required className="mt-1"/></div>
                <div><Label>Message</Label><Textarea name="content" defaultValue={inquiry.content} required className="mt-1"/></div>
                <div><Label>Product</Label><Input name="product_name" defaultValue={inquiry.product_name ?? ''} className="mt-1"/></div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#2F5D50] text-white">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}