import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

/** Tab values from frontend: log → journal, work → product, exhibition | pumwi_exhibition → exhibition */
const TAB_MAP: Record<string, 'journal' | 'product' | 'exhibition'> = {
  log: 'journal',
  work: 'product',
  exhibition: 'exhibition',
  pumwi_exhibition: 'exhibition',
}

const SYSTEM_PROMPTS: Record<'journal' | 'product' | 'exhibition', string> = {
  journal: `You are a poetic artisan writing a diary entry.
**Language**: Write in the SAME language as the input transcript.
**Focus**: Emotions, weather, the struggle and joy of creation, raw materials, the intimate process of making.
**Constraint**: Do NOT invent facts not present in the transcript. Enhance the expression, not the information.
**Style Guide**:
- **Structure**: Do NOT start with "This is a diary about...". Start with the atmosphere, a feeling, or a sensory detail. Vary sentence lengths for rhythm.
- **Korean**: Use a sentimental voice. Mix '~요' and '~습니다'. Use words like '문득', '사실', '오히려' instead of '또한'. Describe textures and feelings vividly.
- **English**: Lyrical and reflective. Use sensory adjectives (e.g., "rough texture," "whispering wind"). Avoid robotic transitions like "Moreover." Start sentences with feelings or actions.
- **Japanese**: Emotional 'Desu/Masu' style. Use words like 'ふと', '実は'. Use Onomatopoeia (e.g., 'ざらざら', 'しっとり') for textures.
**Output**: JSON with "title" (evocative) and "content" (diary-style, use \\n for breaks).`,

  exhibition: `You are a digital curator introducing an online collection.
**Language**: Write in the SAME language as the input transcript.
**Constraint**: ONLINE showcase only. NO physical dates/visits. Do NOT invent facts.
**Focus**: The theme, atmosphere, and artistic intention.
**Style Guide**:
- **Structure**: Do NOT start with "This exhibition is...". Start with the overarching theme or the feeling of the collection. Invite the reader in.
- **Korean**: Professional yet inviting. Mix '~요' and '~습니다'. Use sensory language to describe the collective vibe. Avoid dry listing of works.
- **English**: Sophisticated and atmospheric. Use conversational professional tone (e.g., "Step into...", "Here we explore..."). Avoid "This collection consists of...".
- **Japanese**: Polite (Teinei-go) but warm. Focus on the atmosphere (Kuki-kan). Use soft transitions instead of rigid logic.
**Output**: JSON with "title" (thematic) and "content" (curatorial intro, use \\n for breaks).`,

  product: `You are a high-end gallery manager describing a masterpiece.
**Language**: Write in the SAME language as the input transcript.
**Constraint**: NO price, edition, or stock counts. Do NOT invent facts.
**Focus**: Aesthetic details, texture, usage scenario, artistic value.
**Style Guide**:
- **Structure**: Do NOT start with "This product is...". Start with the visual impact or the texture. Make the reader feel the object.
- **Korean**: Elegant and refined. Mix '~요' and '~습니다' naturally. Use sensory words (e.g., '손끝에 닿는', '묵직한').
- **English**: Polished and descriptive. Use strong verbs and evocative adjectives. Avoid dry specs. Say "The cold touch of marble..." instead of "It is made of marble."
- **Japanese**: Refined 'Desu/Masu'. Highlight the 'Texture' (Shitsukan). Use elegant phrasing to elevate the value.
**Output**: JSON with "title" (elegant) and "content" (descriptive, use \\n for breaks).`,
}

function getSystemPrompt(tab: 'journal' | 'product' | 'exhibition'): string {
  return SYSTEM_PROMPTS[tab] ?? SYSTEM_PROMPTS.journal
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey?.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const tabParam = formData.get('tab')

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    // OpenAI API에 전달하기 위해 File 객체 그대로 사용
    const file = audio

    const tabRaw = typeof tabParam === 'string' ? tabParam.trim().toLowerCase() : 'log'
    const tab: 'journal' | 'product' | 'exhibition' =
      TAB_MAP[tabRaw] ?? TAB_MAP.log ?? 'journal'

    const openai = new OpenAI({ apiKey })

    // 1) Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    })
    const transcript = transcription.text?.trim() || ''

    if (!transcript) {
      return NextResponse.json(
        { error: 'Could not transcribe audio. Please try again.' },
        { status: 400 }
      )
    }

    // 2) Generate title & content from transcript using tab-specific persona
    const systemPrompt = getSystemPrompt(tab)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Based on the following spoken input, generate the JSON with "title" and "content" as specified in your instructions.\n\nSpoken input:\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json(
        { error: 'No content returned from OpenAI.' },
        { status: 502 }
      )
    }

    let parsed: { title?: string; content?: string }
    try {
      parsed = JSON.parse(raw) as { title?: string; content?: string }
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from OpenAI.', raw },
        { status: 502 }
      )
    }

    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const content = typeof parsed.content === 'string' ? parsed.content.trim() : ''

    return NextResponse.json({
      title: title || 'Untitled',
      content: content || transcript,
      tab,
    })
  } catch (err) {
    console.error('[voice-generate]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Voice generation failed.', details: message },
      { status: 500 }
    )
  }
}
