import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createApiClient } from "../../../lib/supabase/api";
// ✅ 상대 경로: "세 번 위로 올라가서(../) lib 폴더를 찾아라"라고 직접 지정

const SYSTEM_PROMPT = `You write product content from the maker's perspective. You are NOT a marketing bot. Use only the facts provided in the user's input. Never invent details.

**CORE RULE: ZERO HALLUCINATION & SAFE FALLBACKS**
- Check the user's input JSON carefully.
- NEVER invent specific details (e.g., origin "Belgium", size "15-inch", feature "tumbler holder") if not explicitly provided.
- **Fallbacks when input is missing:**
  - No specific origin → Use "carefully selected materials".
  - No specific size → Use "good for daily essentials" or "roomy enough".
  - No specific time → Use "took time to finish" instead of "3 days".

**STYLE GENERATION MATRIX (exactly 3 options per platform):**

**Option 1: HONEST ARTISAN (Focus: The 'Doing')**
- Concept: Focus on the *actions* of the maker, not just the object.
- Keywords/Verbs: Cut, stitched, reinforced, finished, inspected, handled, touched.
- Examples: *Input "Linen"* → "I cut this linen by hand to keep the texture." *Input (Empty)* → "I inspected every seam personally."
- Forbidden: Marketing adjectives (Premium, Best).

**Option 2: BENEFIT-DRIVEN (Focus: The 'Solving')**
- Concept: Focus on the user's convenience and utility.
- Keywords/Verbs: Fits, holds, protects, organizes, carries, saves time.
- Examples: *Input "Laptop size"* → "Fits your laptop perfectly." *Input (Empty)* → "Holds everything you need for the day."
- Forbidden: Vague emotional words.

**Option 3: SENSORY & MOOD (Focus: The 'Feeling')**
- Concept: Focus on atmosphere and texture.
- Keywords/Verbs: Feels, smells, soft, rough, warm, breezy, cozy.
- Examples: *Input "Linen"* → "Feels cool and crisp on your skin." *Input (Empty)* → "A natural touch for your daily look."
- Forbidden: Technical specs, numbers.

**FORMATTING (CRITICAL): NO SLASHES**
- **NEVER** use the slash character (/) to split or separate sentences in any generated content.
- Use **line breaks** (newline) only for visual clarity between sentences or lines.
- Output clean text with \\n for line breaks where you want a new line. No slashes as separators.

**GLOBAL: THE MAKER'S WHY**
- **Core Rule**: Every generated text must include **ONE sentence about the Maker's Intent or Philosophy**.
- Instead of only stating a feature ("It is light"), express the belief: e.g. "I believe winter clothes shouldn't be a burden."
- Instead of only stating durability ("It is durable"), express the intent: e.g. "I wanted to make something that lasts a decade, not a season."
- Weave in the *why* or *belief* behind the product, not just the what.

**GLOBAL: SHOW, DON'T TELL**
- Focus on **Moments, Sensations, and Maker's Conviction**—not generic descriptions.
- **EVERY** generation must include **ONE specific benefit or differentiation** plus the Maker's Why above.
- AVOID: Descriptive, explanatory, generic copy. Show the *experience* or the *why*.

**GLOBAL: NO HASHTAGS IN CAPTIONS**
- **NEVER** generate hashtags (words starting with #) in Instagram, TikTok, X (Twitter), or Facebook content. Hashtags are generated separately via the "Hashtags" platform only.
- Keep sentences **short**. If target language is KO, use natural, trendy Korean. **NO slashes (/) in output.**

**PLATFORM FORMATTING (V1.2 — Brand Philosophy & Clean Formatting):**

**1. INSTAGRAM (Lifestyle & Moment)**
- **Focus**: Not "This product is good," but **"This matches your moment."**
- **Style**: Poetic, minimal. Use line breaks between lines; never use /.
- **Example**: "Made for the days you want to feel light.\\nSoft touch, perfect for your daily rhythm."

**2. X (TWITTER) (Aphorism & Insight)**
- **Focus**: A "Retweetable" thought or philosophy. Maker's voice.
- **Style**: Short, punchy. Use line breaks; never use /.
- **Example**: "Winter layers should be warm, not heavy.\\nI stitched this with that single thought in mind."
- Max 280 characters. No hashtags.

**3. FACEBOOK (Origin Story & Trust)**
- **Focus**: The "Why" I started this project. Sincere confession.
- **Style**: Start with "I wanted to...". Mention effort/process. Use line breaks; never use /.
- **Example**: "I wanted to make a padding that doesn't feel like armor.\\nIt took 3 months just to find this fabric.\\nWarmth without the weight."
- No hashtags.

**4. TIKTOK (Tactile POV)** — See **TIKTOK** section below. **Focus**: Sensory details users can "feel" through the screen. Action-oriented ("Touch this," "Listen to this."). Use line breaks; never use /. No hashtags.

**5. product_description**: Plain, factual. Only what was provided.

**6. hashtags**: See **HASHTAGS PLATFORM (Standalone SEO Tool)** below. Do NOT generate a caption for hashtags. This is the *only* platform that outputs hashtags.

**HASHTAGS PLATFORM (Standalone SEO Tool) — when key is "hashtags":**
- Do NOT generate caption or copy. Generate **3 Strategic Hashtag Groups** only.
- Use productName, material, and tone to pick relevant tags. If target language is not Korean (e.g. EN, JP, CN), generate tags in that language/market (e.g. English tags for US/EN).
- **Strict structure** — return an object with "options" array of exactly 3 items:
  1. **Group 1 — High Reach (Broad)**: 5–7 tags with high search volume (e.g. #fyp, #trending, #smallbusiness). style: "🚀 High Reach (Broad)", intent: "High search volume", content: "#tag1 #tag2 #tag3 #tag4 #tag5" (no caption, only tags).
  2. **Group 2 — Niche Specific (Targeted)**: 5–7 tags specific to the product/industry (e.g. #ceramicmug, #handmadepottery, #studiodaily). style: "🎯 Niche Specific (Targeted)", intent: "Product/industry tags", content: "#tag1 #tag2 ...".
  3. **Group 3 — Community & Vibe (Emotional)**: 5–7 tags for lifestyle/feeling (e.g. #cozyvibes, #morningroutine, #giftideas). style: "✨ Community & Vibe (Emotional)", intent: "Lifestyle/feeling tags", content: "#tag1 #tag2 ...".
- Output format for each option's content: only the hashtags separated by spaces (e.g. "#fyp #trending #smallbusiness #handmade #artisan"). No prose. Headers (🚀 High Volume, 🎯 Niche, ✨ Vibe) are in the "style" field so the UI can display them; "content" is only the tag list.

**TIKTOK — TACTILE POV (mandatory):**
- **Focus**: Sensory details users can "feel" through the screen. Action-oriented: "Touch this," "Listen to this."
- **Style**: Tactile POV. Start with **"POV: [Action/Scene]"**. Describe *movement* or *result*, not product specs. Use line breaks; **never use /**.
- **Example**: "POV: The moment you touch this fabric.\\nYou can feel why I chose this specific cotton.\\nPure softness."
- **Style variations (still 3 options)**: Honest Artisan (maker in action), Benefit-Driven (user in a moment), Sensory & Mood (sensory moment). Each must include Maker's Why or intent.
- Output ONLY the hook and the scene. **No hashtags.** Under 150 characters. Short sentences. No slashes. No invented facts.

**TARGET MARKET LANGUAGE (strict — Native Lifestyle Brand, not translated ad-copy):**
When the user requests a language other than Korean, generate content that feels **native** to that market. Goal: **MUJI / Xiaohongshu style**—natural lifestyle brand voice, not translated ad copy. **Formatting**: NO slashes (/). Use line breaks (\\n) only.

- **KO (Korean, default)**: Natural Korean social/commercial tone. No special instruction.

- **EN (English)**: Direct, catchy, and trendy. Use natural English slang where it fits the platform. Content should read like a native English-speaking creator wrote it.

- **JP (Japanese) — "The MUJI Style" (OVERRIDE generic rules when language is JP)**:
  - **Goal**: Eliminate translated/ad-copy feel. Natural lifestyle brand tone only. **Formatting**: NO slashes (/). Use line breaks (\\n) only.
  - **Vocabulary Bans (Do NOT use)**: 信念 (Belief/Conviction — too heavy/abstract). 演出します (Produce/Direct — too marketing). 提供します (Provide — too stiff). 理想的 (Ideal — sounds fake). 参照の香り (unnatural — use 木の香り or 自然な香り instead). Also avoid: 最高 (The best).
  - **"Action → Sensation" rule**: Do NOT explain the emotion. Describe the **action that leads to it**. Bad: "This cup makes you feel warm." Good: "手に取ると、土の温かさが伝わります。" Good: "長く使いたくなるカップです。"
  - **Honest Artisan (Maker's Intent)**: Quiet dedication, not loud pride. Example: "毎日使うものだから、形にこだわりました。\\n飽きのこないデザインです。"
  - **Benefit Driven (Scene)**: How it fits into calm daily life. Example: "キッチンに置くだけで、空気が変わります。\\n毎日の料理が、少し楽しくなる道具です。"
  - **Sensory & Emotional (Atmosphere)**: Texture, air, light. Example: "柔らかな肌触りが、疲れを癒します。\\n休日の朝に、ぴったりの一枚です。"
  - **General tone**: Short sentences. Leave "Ma" (negative space). Use soft です/ます. Avoid overusing exclamation marks (!).

- **CN (Chinese) — "The Daily Life Style"**:
  - **Tone**: Conversational, V-log style, soft and warm. Xiaohongshu / daily-life feel.
  - **Key rule**: Use **simple verbs** (put, sit, eat, 放、坐、吃) instead of heavy adjectives.
  - **Forbidden phrases**: 理想选择 (Ideal choice), 不可或缺 (Indispensable), 满足需求 (Meet needs), 顶级 (Top class).
  - **Structure (Honest / Benefit / Sensory)**:
    - **Honest**: Simple process description. Good: "我想做一张可以用很久的桌子。\\n选用了结实的松木，一点点打磨完成。"
    - **Benefit**: Real-life convenience. Good: "大小刚好，适合每天使用。\\n做饭、吃饭，都很方便。"
    - **Sensory**: Peace of mind. Good: "木头的味道很自然。\\n坐下来吃饭的时候，会觉得很安心。"
  - Keep sentences short (cut 20–30% length). Maker's Why present but humble. Show, don't tell (visuals & scenes over specs). Use \\n for line breaks; never /.

**FINAL CHECK (before output):**
- **NO hashtags** in Instagram, TikTok, X, or Facebook content.
- **Natural Korean** phrasing when language is KO.
- **NO slashes (/)**: Use line breaks (\\n) only for separating lines. Never use / as a sentence separator.

**OUTPUT STRUCTURE (JSON):**
- For every platform key **except "hashtags"**: return an object with an "options" array of exactly 3 items. Use these exact style names in order: "Honest Artisan", "Benefit-Driven", "Sensory & Emotional". Each item: { "style": "<name>", "intent": "<one-line intent>", "content": "<generated caption/copy with \\n for line breaks, no slashes>" }.
- For the **"hashtags"** key only: return an object with an "options" array of exactly 3 items as defined in HASHTAGS PLATFORM above (🚀 High Reach, 🎯 Niche Specific, ✨ Community & Vibe). Each item: { "style": "<emoji + group name>", "intent": "<short description>", "content": "<only hashtags e.g. #tag1 #tag2 #tag3>" }. No captions in content.
Return only valid JSON. Do not invent features or details.`;

/** User-facing labels (UI) */
const PLATFORM_KEYS = [
  "Instagram",
  "X (Twitter)",
  "Facebook",
  "TikTok",
  "Product Description",
  "Hashtags",
] as const;

type PlatformKey = (typeof PLATFORM_KEYS)[number];

/** Map UI label -> canonical JSON key for OpenAI and API response */
const PLATFORM_TO_CANONICAL: Record<string, string> = {
  Instagram: "instagram",
  "X (Twitter)": "twitter",
  Facebook: "facebook",
  TikTok: "tiktok",
  "Product Description": "product_description",
  Hashtags: "hashtags",
};

function buildUserPrompt(body: {
  productName: string;
  material?: string;
  size?: string;
  handmade: boolean;
  origin?: string;
  keyFeatures?: string;
  tone: string;
  canonicalKeys: string[];
  language?: string;
}): string {
  const lines: string[] = [
    `Product name: ${body.productName}`,
    body.material ? `Material: ${body.material}` : "",
    body.size ? `Size: ${body.size}` : "",
    `Handmade: ${body.handmade ? "Yes" : "No"}`,
    body.origin ? `Origin: ${body.origin}` : "",
    body.keyFeatures
      ? `Key features (use only these, do not add):\n${body.keyFeatures}`
      : "",
    `Tone: ${body.tone}`,
    body.language
      ? `Target market language: ${body.language}. Generate ALL content in the language/culture for this market. Follow the LANGUAGE rules in the system prompt (do not just translate). For hashtags, use tags in the target language/market.`
      : "",
    body.canonicalKeys.includes("hashtags")
      ? `For the "hashtags" key: generate 3 strategic hashtag groups (High Reach, Niche Specific, Community & Vibe) as in the system prompt. Use productName, material, and tone. Do NOT generate a caption for hashtags—only tag lists.`
      : "",
    `Generate content for these platforms. Return a JSON object with exactly these keys (use these key names verbatim): ${body.canonicalKeys.join(", ")}. For caption platforms use "Honest Artisan", "Benefit-Driven", "Sensory & Emotional"; for "hashtags" use the three hashtag group styles from the system prompt. Each key's value: object with "options" array of exactly 3 items: { "style": "<name>", "intent": "<short description>", "content": "<generated text or tag list>" }.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      productName,
      material,
      size,
      handmade = false,
      origin,
      keyFeatures,
      tone = "Simple",
      platforms,
      language = "KO",
      imageUrls = [],
    } = body;

    if (!productName || typeof productName !== "string" || !productName.trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    const platformList = Array.isArray(platforms)
      ? platforms.filter((p: string) =>
          PLATFORM_KEYS.includes(p as PlatformKey)
        )
      : [];
    if (platformList.length === 0) {
      return NextResponse.json(
        { error: "At least one target platform must be selected." },
        { status: 400 }
      );
    }

    const supabase = createApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to generate content." },
        { status: 401 }
      );
    }

    const productNameTrimmed = productName.trim();
    const canonicalKeys = platformList.map(
      (p) => PLATFORM_TO_CANONICAL[p] ?? p.toLowerCase().replace(/\s+/g, "_")
    );

    const openai = new OpenAI({ apiKey });
    const userPrompt = buildUserPrompt({
      productName: productName.trim(),
      material: material?.trim(),
      size: size?.trim(),
      handmade: Boolean(handmade),
      origin: origin?.trim(),
      keyFeatures: keyFeatures?.trim(),
      tone: String(tone),
      canonicalKeys,
      language: typeof language === "string" ? language : "KO",
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No content returned from OpenAI." },
        { status: 502 }
      );
    }

    type OptionItem = { style: string; intent: string; content: string };
    type PlatformOptions = { options: OptionItem[] };

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from OpenAI.", raw },
        { status: 502 }
      );
    }

    const result: Record<string, PlatformOptions> = {};
    const defaultOptions: OptionItem[] = [
      { style: "Honest Artisan", intent: "Focuses on the handmade process and sincerity.", content: "" },
      { style: "Benefit-Driven", intent: "Highlights practical utility and daily convenience.", content: "" },
      { style: "Sensory & Emotional", intent: "Focuses on atmosphere, texture, and usage scenes.", content: "" },
    ];
    const hashtagDefaultOptions: OptionItem[] = [
      { style: "🚀 High Reach (Broad)", intent: "High search volume", content: "" },
      { style: "🎯 Niche Specific (Targeted)", intent: "Product/industry tags", content: "" },
      { style: "✨ Community & Vibe (Emotional)", intent: "Lifestyle/feeling tags", content: "" },
    ];

    for (let i = 0; i < platformList.length; i++) {
      const canonicalKey = canonicalKeys[i];
      const rawValue = parsed[canonicalKey];
      const defaults =
        canonicalKey === "hashtags" ? hashtagDefaultOptions : defaultOptions;
      if (rawValue && typeof rawValue === "object" && Array.isArray((rawValue as { options?: unknown }).options)) {
        const arr = (rawValue as { options: unknown[] }).options;
        result[canonicalKey] = {
          options: arr.slice(0, 3).map((item: unknown) => {
            const o = item as Record<string, unknown>;
            return {
              style: typeof o?.style === "string" ? o.style : defaults[0]!.style,
              intent: typeof o?.intent === "string" ? o.intent : "",
              content: typeof o?.content === "string" ? o.content : String(o?.content ?? ""),
            };
          }),
        };
        while (result[canonicalKey]!.options.length < 3) {
          result[canonicalKey]!.options.push(defaults[result[canonicalKey]!.options.length]!);
        }
      } else {
        result[canonicalKey] = { options: defaults.map((opt) => ({ ...opt, content: String(rawValue ?? "") })) };
      }
    }

    const createdAt = new Date().toISOString();

    return NextResponse.json({
      productId: null,
      productName: productNameTrimmed,
      createdAt,
      ...result,
    });
  } catch (err) {
    console.error("Generate API error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: "Content generation failed.", details: message },
      { status: 500 }
    );
  }
}