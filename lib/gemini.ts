import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import type { GenerateRequest, ItineraryContent, ItineraryReview } from './types'

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

export async function* streamItinerary(
  request: GenerateRequest,
  priorReviews: ItineraryReview[]
): AsyncGenerator<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(priorReviews),
  })

  const result = await model.generateContentStream(buildUserPrompt(request))

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

export function parseItineraryContent(raw: string): ItineraryContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  return JSON.parse(jsonMatch[0]) as ItineraryContent
}
