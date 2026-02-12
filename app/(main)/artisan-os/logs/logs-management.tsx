"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, X, Calendar, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// LogRow 타입 정의
type LogRow = {
  id: string;
  created_at: string;
  content: string;
  kind: string;
};

// 로그 종류별 색상 및 라벨
const KIND_OPTIONS = [
  { value: "note", label: "General Note" },
  { value: "request", label: "Client Request" },
  { value: "reminder", label: "Reminder" },
] as const;

const KIND_STYLES: Record<string, string> = {
  note: "bg-gray-100 text-gray-700 border-gray-200",
  request: "bg-blue-50 text-blue-700 border-blue-100",
  reminder: "bg-amber-50 text-amber-700 border-amber-100",
};

export function OperationsLogClient({
  logs,
  createLog,
  updateLog,
  deleteLog,
}: {
  logs: LogRow[];
  createLog: (formData: FormData) => Promise<void>;
  updateLog: (id: string, formData: FormData) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // 로딩 상태 (Optimistic UI 대신 간단한 로딩 처리)
  const [isPending, startTransition] = React.useTransition();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this log entry? This cannot be undone.")) return;
    await deleteLog(id);
    router.refresh();
  };

  return (
    <section className="space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <h2 className="font-serif text-lg font-semibold text-[#2F5D50]">
          Recent Activities
        </h2>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className={cn(
            "transition-all duration-200",
            showAdd 
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
              : "bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90"
          )}
        >
          {showAdd ? <><X className="w-4 h-4 mr-2"/> Cancel</> : <><Plus className="w-4 h-4 mr-2"/> New Log</>}
        </Button>
      </div>

      {/* 새 로그 작성 폼 */}
      {showAdd && (
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100 animate-in fade-in slide-in-from-top-2">
          <form
            action={async (formData: FormData) => {
              await createLog(formData);
              router.refresh();
              setShowAdd(false);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-3">
                <Label htmlFor="content" className="text-gray-600">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  required
                  placeholder="What happened in the studio today?"
                  className="mt-1 bg-white"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="kind" className="text-gray-600">Category</Label>
                <select
                  id="kind"
                  name="kind"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-[#2F5D50]"
                >
                  {KIND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-[#2F5D50] text-white">Save Entry</Button>
            </div>
          </form>
        </div>
      )}

      {/* 로그 목록 리스트 */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No logs recorded yet.</p>
            <p className="text-gray-400 text-sm mt-1">Keep track of your daily work here.</p>
          </div>
        ) : (
          logs.map((log) => (
            editingId === log.id ? (
              <EditLogForm
                key={log.id}
                log={log}
                onSave={async (formData) => {
                  await updateLog(log.id, formData);
                  router.refresh();
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={log.id}
                className="group relative flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#2F5D50]/30 transition-colors shadow-sm"
              >
                {/* 왼쪽: 날짜 및 종류 */}
                <div className="sm:w-32 shrink-0 flex flex-col gap-2">
                   <span
                    className={cn(
                      "inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                      KIND_STYLES[log.kind] ?? KIND_STYLES.note
                    )}
                  >
                    {KIND_OPTIONS.find((o) => o.value === log.kind)?.label ?? log.kind}
                  </span>
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(log.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* 중앙: 내용 */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{log.content}</p>
                </div>

                {/* 오른쪽: 액션 버튼 (호버 시 표시) */}
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingId(log.id)}
                    className="p-2 text-gray-400 hover:text-[#2F5D50] hover:bg-[#2F5D50]/5 rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </section>
  );
}

// 수정 폼 컴포넌트 (내부 사용)
function EditLogForm({
  log,
  onSave,
  onCancel,
}: {
  log: LogRow;
  onSave: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = React.useState(false);

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        await onSave(formData);
        setLoading(false);
      }}
      className="p-5 rounded-xl border-2 border-[#2F5D50]/20 bg-[#F9F9F8]"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <Label className="text-[#2F5D50]">Edit Content</Label>
            <Textarea
              name="content"
              defaultValue={log.content}
              required
              rows={3}
              className="mt-1 bg-white"
            />
          </div>
          <div>
            <Label className="text-[#2F5D50]">Category</Label>
            <select
              name="kind"
              defaultValue={log.kind}
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#2F5D50] text-white" disabled={loading}>
            {loading ? "Saving..." : "Update Log"}
          </Button>
        </div>
      </div>
    </form>
  );
}