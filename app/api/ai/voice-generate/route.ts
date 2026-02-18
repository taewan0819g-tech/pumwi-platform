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
**Focus**: Emotions, weather, the struggle and joy of creation, raw materials, the intimate process of making.
**Output**: Return a JSON object with exactly two keys:
- "title": An emotional, evocative title for the diary entry.
- "content": Diary-style content that reads like a personal journal: reflective, sensory, and connected to the act of creating. Use line breaks (\\n) where natural. No slashes (/) as separators.`,

  exhibition: `You are a digital curator introducing an online collection.
**Constraint**: This is an ONLINE showcase. Do NOT mention physical opening dates, "visit us", or in-person attendance.
**Focus**: The theme of the collection, the collective atmosphere of the works, and the artistic intention behind the curation.
**Output**: Return a JSON object with exactly two keys:
- "title": A thematic title for the online exhibition.
- "content": Curatorial introduction content: atmospheric, thematic, and focused on the works and intention. Use line breaks (\\n) where natural. No slashes (/) as separators.`,

  product: `You are a high-end gallery manager describing a masterpiece.
**Constraint**: DO NOT mention price, edition number, or stock count. The user will input these manually.
**Focus**: Aesthetic details, texture, usage scenario, and artistic value. Elevate the object with refined, gallery-style language.
**Output**: Return a JSON object with exactly two keys:
- "title": An elegant, descriptive title for the work.
- "content": Descriptive content highlighting aesthetics, texture, context of use, and artistic value. Use line breaks (\\n) where natural. No slashes (/) as separators.`,
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
    const audio = formData.get('audio')
    const tabParam = formData.get('tab')

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing or invalid audio file.' },
        { status: 400 }
      )
    }

    const tabRaw = typeof tabParam === 'string' ? tabParam.trim().toLowerCase() : 'log'
    const tab: 'journal' | 'product' | 'exhibition' =
      TAB_MAP[tabRaw] ?? TAB_MAP.log ?? 'journal'

    const openai = new OpenAI({ apiKey })

    // 1) Transcribe with Whisper
    const file = audio instanceof File ? audio : new File([audio], 'audio.webm', { type: audio.type || 'audio/webm' })
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
