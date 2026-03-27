import OpenAI from 'openai'
import type { Lead, MessageTemplate, MessageTone } from '@/types'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const TEMPLATE_PROMPTS: Record<MessageTemplate, string> = {
  cold_outreach: `You are a skilled outreach specialist. Write a personalized cold DM to the person below.
Rules:
- Keep it under 300 characters (DM-friendly)
- Open with something specific to their profile (bio, niche, or content)
- One clear value proposition or question
- No generic openers like "Hope you're well"
- No hard sells`,

  follow_up: `You are a skilled outreach specialist. Write a brief follow-up DM.
Rules:
- Reference that this is a follow-up
- Keep it under 200 characters
- Add a clear call to action`,

  partnership: `You are a partnership manager. Write a collaboration pitch DM.
Rules:
- Mention a specific collaboration idea relevant to their niche
- Keep it under 350 characters
- Sound like a peer, not a fan or salesperson`,

  custom: `You are a skilled outreach specialist. Write a personalized DM following the custom instructions provided.`,
}

interface GenerateOptions {
  lead: Lead
  template?: MessageTemplate
  campaignType?: string
  customPrompt?: string
  tone: MessageTone
}

export async function generateOutreachMessage(opts: GenerateOptions): Promise<string> {
  const { lead, template, campaignType, customPrompt, tone } = opts

  const toneGuide: Record<MessageTone, string> = {
    professional: 'Tone: professional and polished.',
    casual: 'Tone: casual and conversational, like texting a friend.',
    friendly: 'Tone: warm and enthusiastic.',
    direct: 'Tone: direct and concise, no fluff.',
  }

  const systemPrompt = campaignType
    ? `You are a skilled outreach specialist. Write a short, personalized DM.
Rules:
- Keep it under 300 characters (DM-friendly)
- Be specific to their profile
- No generic openers like "Hope you're well"`
    : TEMPLATE_PROMPTS[template ?? 'cold_outreach']

  const campaignInstruction = campaignType ? `\nCampaign: ${campaignType}` : ''
  const customInstruction = !campaignType && template === 'custom' && customPrompt
    ? `\nCustom instructions: ${customPrompt}`
    : ''

  const userContent = `
Profile:
- Name: ${lead.name ?? 'Unknown'}
- Username: @${lead.username}
- Platform: ${lead.platform}
- Bio: ${lead.bio ?? 'No bio available'}
- Followers: ${lead.followers?.toLocaleString() ?? 'Unknown'}
- Niche: ${lead.niche ?? 'Unknown'}

${toneGuide[tone]}${campaignInstruction}${customInstruction}

Write the message now (just the message text, no labels or quotes):
`.trim()

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 200,
    temperature: 0.8,
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned an empty response')
  return text
}
