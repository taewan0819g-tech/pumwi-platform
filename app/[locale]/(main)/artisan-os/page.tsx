"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Send, History } from "lucide-react";

export default function CommandCenterPage() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<{ id: string; content: string; created_at: string; ai_response: string | null }[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const recentListRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // 1. 초기 로딩: 로그인 체크 및 최근 로그 가져오기
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchLogs();
      }
    }
    init();
  }, []);

  // 2. 로그 불러오기 함수
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/studio-log"); // 아까 만든 API 호출
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  // 3. 명령 실행 함수 (핵심!)
  const handleRun = async () => {
    if (!input.trim() || !user) return;
    setRunning(true);

    try {
      // AI 두뇌에게 명령 전송 (POST)
      const res = await fetch("/api/studio-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process command.");
      }

      // Success: clear input, refresh logs, scroll activity list to top
      setInput("");
      await fetchLogs();
      requestAnimationFrame(() => recentListRef.current?.scrollTo({ top: 0, behavior: "smooth" }));

    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center py-12 px-4 bg-[#F9F9F8] min-h-screen">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold text-[#2F5D50] text-center">
            Command Center
          </h1>
          <p className="text-gray-500 text-sm">
            Talk to your inventory. Tell me what you made or sold.
          </p>
        </div>

        {/* 명령 입력창 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={running}
            placeholder="Examples:&#13;&#10;- Sold 2 Moon Jars to Kim (Instagram)&#13;&#10;- Registered 5 new Ceramic Cups&#13;&#10;- How much stock do I have for Blue Mugs?"
            className="w-full min-h-[120px] p-4 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none resize-none bg-gray-50 placeholder:text-gray-400"
          />
          
          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={running || !input.trim()}
              className="flex items-center gap-2 bg-[#2F5D50] text-white px-6 py-3 rounded-xl hover:bg-[#244a3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Run Command
                </>
              )}
            </button>
          </div>
        </div>

        {/* 최근 활동 로그 (AI 응답 내역) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#2F5D50] font-semibold px-2">
            <History className="w-5 h-5" />
            <h2>Recent Activity</h2>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto space-y-3" ref={recentListRef}>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">
                No logs yet. Try running a command!
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-900">{log.content}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4" suppressHydrationWarning>
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {/* AI의 응답 (초록색 박스) */}
                  <div className="bg-[#F0F4F2] p-3 rounded-lg text-sm text-[#2F5D50] border border-[#E0E8E4]">
                    <span className="font-bold mr-2">🤖 AI:</span>
                    {log.ai_response || "Processing..."}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}