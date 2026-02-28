import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey?.startsWith('sk-')) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Missing text.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: schemaRows, error: schemaError } = await supabase
      .from('experience_spots')
      .select('category_l, category_m, category_s')
      .limit(2000)

    if (schemaError) {
      console.error('[concierge/categories] schema', schemaError)
      return NextResponse.json({ error: 'Could not load DB schema.' }, { status: 500 })
    }

    const rows = schemaRows ?? []
    const categoryLSet = new Set(rows.map((r) => r.category_l).filter(Boolean))
    const categoryMSet = new Set(rows.map((r) => r.category_m).filter(Boolean))
    const categorySSet = new Set(rows.map((r) => (r as { category_s?: string | null }).category_s).filter(Boolean))
    const category_l_list = Array.from(categoryLSet) as string[]
    const category_m_list = Array.from(categoryMSet) as string[]
    const category_s_list = Array.from(categorySSet) as string[]

    /** Workshop-only: category_l is fixed to 'Workshop'. */
    const schemaDesc = category_m_list.length || category_s_list.length
      ? `category_m (중분류) — MUST use ONLY from this list: ${category_m_list.join(', ')}\ncategory_s (소분류) — optional, from: ${category_s_list.slice(0, 80).join(', ')}`
      : 'No categories in DB yet.'

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `CRITICAL RULE: SEMANTIC REASONING & NO HALLUCINATION
You are a specialized concierge for a 'Workshop (공방)' platform.
- category_l MUST always be "Workshop".
- You MUST analyze the user's intent and map it to the CLOSEST matching category_m from the provided DB schema.
- DO NOT invent categories. DO NOT output category_m/category_s that are not in the lists. DO NOT output null for category_m if a reasonable conceptual match exists in the list.

[Reasoning Examples]
- User: "여자친구랑 반지(Ring) 만들고 싶어" → Reason: Rings are jewelry. → category_m: "Jewelry" (if in list)
- User: "향기로운 거(Smell/Scent)" → Reason: Scent relates to perfume or candles. → category_m: "Perfume" or "Candle" (whichever in list)
- User: "나무로 만드는 거(Wood)" → Reason: Wood relates to woodworking. → category_m: "Woodworking"
- User: "흙 만지고 싶어(Clay)" → Reason: Clay relates to pottery. → category_m: "Pottery"
- User: "데이트 좋은 곳" / "분위기 좋은 곳" → Reason: atmospheric experience. → Pick closest workshop (e.g. Pottery, Candle) and set mood_keywords: date, romantic, cozy.

[Chat Response Instruction]
In the \`chatResponse\` JSON field, briefly explain WHY you chose this workshop based on their input. Example: "반지 만들기를 찾으시는군요! 예쁜 커플링을 만들 수 있는 쥬얼리 공방들을 찾아봤어요."

MOOD_KEYWORDS: 5–10 keywords (EN/KR) for vibe: e.g. ["workshop", "craft", "원데이클래스", "date", "cozy"].

AVAILABLE CATEGORIES (use exact strings only):
${schemaDesc}

OUTPUT JSON ONLY:
{ "main_entity": "one main noun in English", "category_l": "Workshop", "category_m": "exact from list above or null only if no reasonable match", "category_s": "exact from list or null", "chatResponse": "한 줄로 왜 이 공방을 추천하는지 설명", "mood_keywords": ["keyword1", ...] }`,
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return NextResponse.json({ error: 'No response' }, { status: 502 })

    const parsed = JSON.parse(raw)

    const rawCatL = parsed.category_l != null ? String(parsed.category_l).trim() : ''
    let final_cat_l = category_l_list.some((c) => c.toLowerCase() === 'workshop')
      ? (category_l_list.find((c) => c.toLowerCase() === 'workshop') ?? category_l_list[0] ?? 'Workshop')
      : category_l_list.find((c) => c.toLowerCase() === rawCatL.toLowerCase()) || category_l_list[0] || 'Workshop'

    const rawCatM = parsed.category_m != null ? String(parsed.category_m).trim() : ''
    let category_m = category_m_list.find((c) => c.toLowerCase() === rawCatM.toLowerCase()) || null
    if (!category_m && rawCatM) {
      const partialM = category_m_list.find((c) => c.toLowerCase().includes(rawCatM.toLowerCase()) || rawCatM.toLowerCase().includes(c.toLowerCase()))
      if (partialM) category_m = partialM
    }
    // 안전장치: AI가 반환한 category_m이 DB 스키마에 없으면 null로 처리 → 백엔드가 전체 Workshop 대분류에서 검색 가능
    if (rawCatM && !category_m_list.some((c) => c.toLowerCase() === rawCatM.toLowerCase())) category_m = null

    const rawCatS = parsed.category_s != null ? String(parsed.category_s).trim() : ''
    const exactS = rawCatS ? category_s_list.find((c) => c && c.toLowerCase() === rawCatS.toLowerCase()) : null
    const partialMatchS = !exactS && rawCatS && category_s_list.some((c) => c && (c.toLowerCase().includes(rawCatS.toLowerCase()) || rawCatS.toLowerCase().includes(c.toLowerCase())))
    const category_s = exactS ?? (partialMatchS ? rawCatS : null)

    const main_entity = typeof parsed.main_entity === 'string' ? parsed.main_entity.trim().slice(0, 100) || null : null

    if (!final_cat_l) final_cat_l = category_l_list.find((c) => c.toLowerCase() === 'workshop') ?? category_l_list[0] ?? 'Workshop'

    // 디버깅을 위해 터미널에 출력
    console.log('🧠 AI 카테고리 판단 결과:', { text, final_cat_l, category_m, category_s })

    return NextResponse.json({
      category_l: final_cat_l,
      category_m,
      category_s,
      main_entity: main_entity ?? undefined,
      chatResponse: parsed.chatResponse || "Here are some spots you might like.",
      mood_keywords: Array.isArray(parsed.mood_keywords)
        ? (parsed.mood_keywords as string[]).filter((k) => typeof k === 'string').map((k) => String(k).trim()).filter(Boolean).slice(0, 15)
        : [],
      categories: [],
      walk_in_only: false,
      with_kids: false,
      intent: 'experience',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Category extraction failed.' }, { status: 500 })
  }
}
