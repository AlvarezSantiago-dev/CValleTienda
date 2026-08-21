// =============================================================
// lib/cajero/anthropic.ts
// Chat + tool use contra la API de Anthropic (Messages).
// Server-only — la API key nunca sale de acá.
// =============================================================

import type { ChatMessage, EjecutorTool, ToolDef } from './openai'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_ITERACIONES_TOOLS = 6
const TIMEOUT_MS = 30_000

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY || process.env.ANTROPOPEDIA_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada')
  return key
}

function modeloChat(): string {
  const m = process.env.CAJERO_MODELO
  if (m && m.startsWith('claude')) return m
  return 'claude-haiku-4-5'
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface AnthropicResponse {
  stop_reason?: string
  content?: ContentBlock[]
}

export async function chatConToolsAnthropic(
  mensajes: ChatMessage[],
  tools: ToolDef[],
  ejecutar: EjecutorTool
): Promise<string> {
  const system = mensajes
    .filter((m) => m.role === 'system' && m.content)
    .map((m) => m.content as string)
    .join('\n\n')

  const historial: AnthropicMessage[] = mensajes
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content ?? '',
    }))

  const toolsAnthropic = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

  for (let i = 0; i < MAX_ITERACIONES_TOOLS; i++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modeloChat(),
        max_tokens: 1024,
        temperature: 0.2,
        system,
        tools: toolsAnthropic,
        messages: historial,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      throw new Error(`El modelo no respondió (${res.status})`)
    }

    const json = (await res.json()) as AnthropicResponse
    const blocks = json.content ?? []
    const toolUses = blocks.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use'
    )

    if (toolUses.length === 0) {
      const texto = blocks
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join(' ')
        .trim()
      return texto || 'No entendí, ¿me lo repetís?'
    }

    historial.push({ role: 'assistant', content: blocks })

    const resultados: ContentBlock[] = []
    for (const call of toolUses) {
      let resultado: Record<string, unknown>
      try {
        resultado = await ejecutar(call.name, call.input ?? {})
      } catch (e) {
        resultado = { error: (e as Error).message }
      }
      resultados.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(resultado),
      })
    }
    historial.push({ role: 'user', content: resultados })
  }

  return 'Me perdí con ese pedido. Probá de nuevo con una frase más corta.'
}
