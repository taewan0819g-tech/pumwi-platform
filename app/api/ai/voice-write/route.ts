import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

type VoiceWriteTab = 'journal' | 'product' | 'exhibition'

const BASE_ROLE = `You are a professional editor. You do NOT create content; you only organize and polish what the user said.

**STRICT RULE**: Do NOT invent, imagine, or add facts that are not in the user's speech.
**STRICT RULE**: If the input is short, keep the output short. Do not expand unnecessarily.

**Your task**:
1. Fix grammar and typos.
2. Convert the spoken tone into a written tone suitable for the context (Journal / Product / Exhibition).
3. Extract a concise \`title\` based on the content.

**Output**: Return strictly a JSON object: { "title": string, "content": string }. Use \\n for line breaks in content. Default output language: Korean. If the user clearly spoke in Japanese or English, you may respond in that language.`

const CONTEXT_RULES: Record<VoiceWriteTab, string> = {
  journal: `**[Context: Journal (작업일지)]**
- Convert to a polite, sincere diary style.
- Keep exactly to the facts mentioned (weather, material, feeling). Do not add events or details the user did not say.`,

  product: `**[Context: Product (판매작품)]**
- **Filter**: Remove any mention of specific price or edition numbers. The user inputs these manually.
- Convert to a gallery caption style.
- Only describe visual/tactile features that were explicitly mentioned. Do not invent specifications or materials.`,

  exhibition: `**[Context: Exhibition (온라인 전시)]**
- Convert to an introduction note.
- Only include themes or intents that were explicitly spoken. Do not add exhibition dates or "visit us" (this is an online showcase).`,
}

function getSystemPrompt(tab: VoiceWriteTab): string {
  return [BASE_ROLE, CONTEXT_RULES[tab]].join('\n\n')
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

    const tab: VoiceWriteTab =
      tabParam === 'product' || tabParam === 'exhibition'
        ? tabParam
        : 'journal'

    const openai = new OpenAI({ apiKey })

    const file =
      audio instanceof File
        ? audio
        : new File([audio], 'audio.webm', { type: audio.type || 'audio/webm' })

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

    const systemPrompt = getSystemPrompt(tab)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Below is the user's spoken input (transcribed). Organize and polish it according to your role. Do NOT add facts that are not in the text. Return only valid JSON: { "title": "...", "content": "..." }. Use \\n for line breaks in content.\n\nSpoken input:\n${transcript}`,
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
    console.error('[voice-write]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    const isQuota =
      typeof message === 'string' &&
      (message.includes('quota') || message.includes('rate limit'))
    return NextResponse.json(
      {
        error: isQuota ? 'API quota exceeded. Please try again later.' : 'Voice write failed.',
        details: message,
      },
      { status: 500 }
    )
  }
}
