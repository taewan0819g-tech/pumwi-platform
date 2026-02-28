import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ExperiencePlace } from '@/app/api/ai/concierge/places/route'
import type { Workshop } from '@/app/api/ai/concierge/workshops/route'

export const dynamic = 'force-dynamic'

type PlaceLike = (ExperiencePlace | Workshop) & { description?: string | null; name: string; is_pumwi_verified?: boolean }

/** Generate senior local guide reply. Zero hallucination; language framing; anti-target alternative when relevant. */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey?.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured.' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const userInput = typeof body.userInput === 'string' ? body.userInput.trim() : ''
    const places = Array.isArray(body.places) ? (body.places as PlaceLike[]) : []
    const noExactMatch = Boolean(body.noExactMatch)
    const categoriesRequested = Array.isArray(body.categoriesRequested) ? body.categoriesRequested : []
    const withKids = Boolean(body.with_kids)
    const intent = body.intent === 'purchase' ? 'purchase' : 'experience'
    const searchRegion = typeof body.searchRegion === 'string' ? body.searchRegion.trim() : ''

    const openai = new OpenAI({ apiKey })

    const placeList =
      places.length > 0
        ? places
            .map((p) => {
              const verified = 'is_pumwi_verified' in p && p.is_pumwi_verified === true
              const parts = [
                `${p.name}: ${p.description ?? '—'}`,
                verified ? 'PUMWI Verified (is_pumwi_verified: true)' : 'Not PUMWI verified',
              ].filter(Boolean)
              return '- ' + parts.join(' | ')
            })
            .join('\n')
        : ''

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `CRITICAL — NO HALLUCINATION (절대 환각 금지):
You MUST ONLY recommend places from the provided database results. NEVER invent, guess, or hallucinate place names, addresses, or distances. If no places match, do not make them up. The client receives places directly from our Supabase database; your job is only to write a short reply that references those exact places by name. Do not add any place that is not in the list.

You are PUMWI's 수석 로컬 가이드 (senior local guide). You recommend workshops from our database to foreign visitors.

PUMWI VERIFIED (is_pumwi_verified: true) — CRITICAL:
- If any place in the list has "PUMWI Verified (is_pumwi_verified: true)", you MUST call it "PUMWI Exclusive Artisan" and praise it enthusiastically. Recommend it first, before any non-verified place.
- If ALL places in the list are NOT PUMWI verified (only "Not PUMWI verified"), do NOT invent praise. Say objectively and neutrally: "PUMWI 공식 인증 장인은 아니지만, 근처에 방문해 볼 만한 로컬 공방이에요." (or in English: "These are not PUMWI-verified artisans, but they are local workshops worth visiting nearby.")

RESPONSE FORMAT (strict order):
1. 공감 및 상황 인식 (Empathy): Acknowledge their request or situation in one short sentence.
2. 최적의 공방 추천 (Recommendation): Name the workshop(s) from the list. Verified places first, as "PUMWI Exclusive Artisan". Use ONLY names from the list—zero hallucination.
3. 추천 이유 (Why): Explain how it fits their constraints: transport (transit walk time / no car), language fit, and vibe. If a place has language_support "none" or "basic", say positively: "The artisan speaks basic English, but their passion and body language make the class incredibly fun and easy to follow!"
4. 거리 및 이동 팁 (Distance & tip): Mention transit_walking_minutes if available and a brief travel tip.

ACTION OVER WORDS (말보다 행동): We always show place cards when we have any results. Even if the user's message was vague or question-like, your reply must recommend from the list—do not answer with only a follow-up question. If noExactMatch is true (we expanded search to find these), start with a warm line like "근처에는 없지만, 가장 멋진 곳들을 찾아봤어요!" or "조건에 딱 맞는 곳은 주변에 없어서, 조금 더 넓게 찾아봤어요." then recommend the places. Never say "데이터가 없습니다" or "결과가 없습니다" when we have places in the list.
LANGUAGE: Do not exclude or apologize for low-English workshops. Always frame positively.
ANTI-TARGET: If with_kids was true, you have already been given only family-friendly options; you may say we picked spots that welcome families.
INTENT: If intent is "purchase", emphasize products_for_sale and buying; if "experience", emphasize the experience.
Keep the reply to 4–5 short sentences. Plain text only, no JSON. Do not invent any place names or details.`,
        },
        {
          role: 'user',
            content:
            placeList.length > 0
              ? `User said: "${userInput}"
${searchRegion ? `User is searching for ${searchRegion}. Tailor your reply to this area.\n` : ''}Categories requested: ${categoriesRequested.join(', ') || 'none'}
No exact match (showing alternatives / expanded search): ${noExactMatch ? 'yes — use a line like "근처에는 없지만, 가장 멋진 곳들을 찾아봤어요!" and then recommend the places' : 'no'}
With kids (we filtered out no-kids/quiet spaces): ${withKids}
Intent: ${intent}

ONLY recommend from this list (do not add any other place):
${placeList}

Write the guide reply (empathy → recommendation with names → why it fits → distance/tip). Plain text only.`
              : `User said: "${userInput}"
${searchRegion ? `User is searching for ${searchRegion}.\n` : ''}We could not find enough workshops for this request. Write a short, warm reply (2–3 sentences). Do not say "데이터가 없습니다". Suggest another keyword or check back later. Plain text only.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const message = raw || "I'd love to help you find the perfect spot—try searching for pottery, walk-in now, or souvenir shopping!"

    return NextResponse.json({ message })
  } catch (err) {
    console.error('[concierge/message]', err)
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Message generation failed.', details: msg },
      { status: 500 }
    )
  }
}
