"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch"; 
import { Loader2, Lock, Copy, Sparkles, Globe, X, Instagram, Twitter, Facebook, Video, FileText, Hash } from "lucide-react";
import { useRouter } from "next/navigation";

// 아이콘 매핑
const PLATFORM_ICONS: any = {
  Instagram, "X (Twitter)": Twitter, Facebook, TikTok: Video, "Product Description": FileText, Hashtags: Hash,
};

const TONE_OPTIONS = [
  { value: "Simple", title: "Simple", description: "Clear and straightforward copy" },
  { value: "Warm", title: "Warm", description: "Friendly and approachable tone" },
  { value: "Premium", title: "Premium", description: "Refined and elevated voice" },
];

const PLATFORMS = ["Instagram", "X (Twitter)", "Facebook", "TikTok", "Product Description", "Hashtags"];
const LANGUAGES = ["KO", "EN", "JP", "CN"];

const STORAGE_BUCKET = "product-images"; // Supabase Storage 버킷 이름

export default function MarketingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // 입력 상태
  const [productName, setProductName] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [handmade, setHandmade] = useState(false);
  const [origin, setOrigin] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [tone, setTone] = useState("Simple");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [language, setLanguage] = useState("KO");
  
  // 이미지 업로드 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  // 결과 상태
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    setImageFiles((prev) => [...prev, ...list]);
    list.forEach((file) => {
      const url = URL.createObjectURL(file);
      setImagePreviewUrls((prev) => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index] || "");
      next.splice(index, 1);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (!productName.trim()) { setError("Product name is required."); return; }
    if (platforms.length === 0) { setError("Select at least one platform."); return; }

    setLoading(true);
    setError(null);
    let imageUrlList: string[] = [];

    try {
      // 이미지 업로드 로직
      if (imageFiles.length > 0) {
        const supabase = createClient();
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${Date.now()}-${i}.${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { upsert: true });
            
          if (uploadError) {
             console.error("Upload error (ignoring):", uploadError);
             // 스토리지 설정이 없어도 텍스트 생성은 되도록 continue
          } else {
             const { data: urlData } = supabase.storage
               .from(STORAGE_BUCKET)
               .getPublicUrl(path);
             imageUrlList.push(urlData.publicUrl);
          }
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName, material, size, handmade, origin, keyFeatures, tone, platforms, language, imageUrls: imageUrlList
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Toast notification could go here
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽: 입력 폼 (Speed.Sales 스타일) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#2F5D50]">Create content</h2>
            <p className="text-sm text-gray-500">Describe your product. We'll generate copy for every channel.</p>
          </div>

          <div className="space-y-6">
            {/* 상품명 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Product name</Label>
              <Input 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                placeholder="e.g. Ceramic Mug" 
                className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#2F5D50] bg-transparent"
              />
            </div>

            {/* 톤 설정 (카드 형태 - 설명 제거 및 중앙 정렬) */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-500">Tone</span>
              <div className="grid grid-cols-3 gap-3">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`p-3 rounded-xl border-2 text-center transition-all hover:-translate-y-1 ${
                      tone === t.value
                        ? "border-[#2F5D50] bg-[#2F5D50]/10 text-[#2F5D50] font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm">{t.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 재질, 사이즈 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Material</Label>
                <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Porcelain" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Size</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 350ml" className="bg-white" />
              </div>
            </div>

            {/* 핸드메이드 스위치 */}
            <div className="flex flex-wrap items-center gap-4 py-2">
               <div className="flex items-center gap-2">
                 <Switch checked={handmade} onCheckedChange={setHandmade} />
                 <Label className="cursor-pointer">Handmade</Label>
               </div>
               <div className="flex-1 min-w-[140px]">
                 <Input 
                    value={origin} 
                    onChange={(e) => setOrigin(e.target.value)} 
                    placeholder="Origin (e.g. Made in Korea)" 
                    className="border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#2F5D50] bg-transparent h-8"
                  />
               </div>
            </div>

            {/* 특징 입력 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Features</Label>
              <Textarea 
                value={keyFeatures} 
                onChange={(e) => setKeyFeatures(e.target.value)} 
                placeholder="3–5 bullet points or short description" 
                className="bg-white min-h-[100px]"
              />
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-500">Product images (optional)</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-[#2F5D50] hover:bg-[#2F5D50]/5">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  Choose images
                </label>
                {imagePreviewUrls.map((url, i) => (
                  <div key={url} className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 플랫폼 설정 */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-500">Platforms</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const Icon = PLATFORM_ICONS[p] || Sparkles;
                  const isSelected = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      // 'relative' and 'group' are needed for the tooltip positioning
                      className={`relative group flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                        isSelected ? "border-[#2F5D50] bg-[#2F5D50]/10 text-[#2F5D50]" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{p}</span>

                      {/* Custom PUMWI Style Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-[#2F5D50] text-white text-xs px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap relative">
                          {p}
                          {/* Tooltip Arrow (Optional) */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2F5D50]"></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 언어 설정 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500">Target Market Language</span>
              </div>
              <div className="flex gap-1 p-1 bg-gray-100/50 rounded-lg w-fit border border-gray-200">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      language === l ? "bg-[#2F5D50] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {l === "KO" ? "KO (Default)" : l}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="w-full bg-[#2F5D50] hover:bg-[#244a3f] h-12 text-lg shadow-lg shadow-[#2F5D50]/20"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 w-5 h-5" />}
              Generate
            </Button>
          </div>
        </div>

        {/* 오른쪽: 결과 화면 */}
        <div className="lg:col-span-7">
          <div className="sticky top-8 bg-white/60 backdrop-blur-md border border-gray-200 rounded-3xl p-6 min-h-[600px] shadow-sm">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 min-h-[500px]">
                <div className="p-6 bg-gray-100 rounded-full">
                  <Sparkles className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Ready to create magic</h3>
                <p className="max-w-xs text-center text-sm">Fill in your product details and pick platforms. Your copy will appear here.</p>
              </div>
            )}
            
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[500px]">
                 <Loader2 className="w-10 h-10 animate-spin text-[#2F5D50] mb-4" />
                 <p>Generating content...</p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {Object.entries(result).map(([key, value]: any) => {
                  if (key === "productId" || key === "productName" || key === "createdAt") return null;
                  const options = value.options || [];
                  const title = key === "product_description" ? "Product Description" : key.charAt(0).toUpperCase() + key.slice(1);
                  
                  return (
                    <div key={key} className="space-y-3">
                      <h3 className="font-serif text-lg text-[#2F5D50] flex items-center gap-2 border-b border-gray-100 pb-2">
                        {title}
                      </h3>
                      <div className="grid gap-4">
                        {options.map((opt: any, idx: number) => (
                          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-3">
                              <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-[#2F5D50]/10 text-[#2F5D50] uppercase tracking-wide">
                                {opt.style}
                              </span>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(opt.content)} className="h-6 text-gray-400 hover:text-[#2F5D50]">
                                <Copy className="w-3 h-3 mr-1" /> Copy
                              </Button>
                            </div>
                            {opt.intent && <p className="text-xs text-gray-400 mb-2 italic">{opt.intent}</p>}
                            <div className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                              {opt.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}