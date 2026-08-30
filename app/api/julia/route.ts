import { generateText } from 'ai';
import { NextRequest } from 'next/server';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import type { Audience, JuliaAction, ProjectType, Specialty } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PROJECT_TYPES: ProjectType[] = ['memoire', 'ads', 'pfe'];
const SPECIALTIES: Specialty[] = ['informatique', 's3e'];
const AUDIENCES: Audience[] = ['etudiant', 'maitre', 'pedagogie'];
const ACTIONS: JuliaAction[] = ['analyze', 'smart', 'reformulate', 'questions', 'chat'];

// Chaîne de secours indépendante :
// 1) Gemini API (clé Google AI Studio)
// 2) Groq API
// 3) Vercel AI Gateway (si disponible sur le projet)
// Les clés restent exclusivement côté serveur.
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
const GATEWAY_PRIMARY = 'minimax/minimax-m2.7-free';
const GATEWAY_FALLBACKS = [
  'inclusionai/ling-3.0-tiny-free',
  'poolside/laguna-s-2.1-free',
  'inclusionai/ling-3.0-flash-free',
];

type ProviderResult = {
  text: string;
  provider: 'gemini' | 'groq' | 'vercel-gateway';
  model: string;
};

class ProviderError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').trim().slice(0, max);
}

function outputLimit(action: JuliaAction) {
  return action === 'analyze' ? 1800 : 1300;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => null);
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  apiKey: string,
  system: string,
  prompt: string,
  action: JuliaAction,
): Promise<ProviderResult> {
  let lastError: unknown;

  for (const model of GEMINI_MODELS) {
    try {
      const { response, data } = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: system }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: outputLimit(action),
            },
          }),
        },
        10000,
      );

      if (!response.ok) {
        throw new ProviderError(`Gemini ${model}: HTTP ${response.status}`, response.status);
      }

      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part?.text || '')
        .join('')
        .trim();

      if (!text) throw new ProviderError(`Gemini ${model}: réponse vide`);
      return { text, provider: 'gemini', model };
    } catch (error) {
      lastError = error;
      console.warn(`[Julia] Gemini ${model} indisponible :`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini indisponible');
}

async function callGroq(
  apiKey: string,
  system: string,
  prompt: string,
  action: JuliaAction,
): Promise<ProviderResult> {
  let lastError: unknown;

  for (const model of GROQ_MODELS) {
    try {
      const { response, data } = await fetchJson(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
            temperature: 0.25,
            max_completion_tokens: outputLimit(action),
          }),
        },
        10000,
      );

      if (!response.ok) {
        throw new ProviderError(`Groq ${model}: HTTP ${response.status}`, response.status);
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new ProviderError(`Groq ${model}: réponse vide`);
      return { text, provider: 'groq', model };
    } catch (error) {
      lastError = error;
      console.warn(`[Julia] Groq ${model} indisponible :`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Groq indisponible');
}

async function callVercelGateway(
  system: string,
  prompt: string,
  action: JuliaAction,
): Promise<ProviderResult> {
  const primaryModel = process.env.JULIA_MODEL?.trim() || GATEWAY_PRIMARY;
  const fallbackModels = GATEWAY_FALLBACKS.filter((model) => model !== primaryModel);

  const result = await generateText({
    model: primaryModel,
    system,
    prompt,
    temperature: 0.25,
    maxOutputTokens: outputLimit(action),
    maxRetries: 1,
    timeout: 14000,
    providerOptions: {
      gateway: {
        models: fallbackModels,
      },
    },
  });

  const text = result.text?.trim();
  if (!text) throw new Error('AI Gateway : réponse vide');

  return {
    text,
    provider: 'vercel-gateway',
    model: primaryModel,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload?.action;
  const projectType = payload?.projectType;
  const specialty = payload?.specialty;
  const audience = payload?.audience;
  const text = cleanText(payload?.text, 12000);
  const previousAnalysis = cleanText(payload?.previousAnalysis, 12000);
  const question = cleanText(payload?.question, 3000);

  if (
    !isOneOf(action, ACTIONS) ||
    !isOneOf(projectType, PROJECT_TYPES) ||
    !isOneOf(specialty, SPECIALTIES) ||
    !isOneOf(audience, AUDIENCES)
  ) {
    return Response.json({ error: 'Paramètres de requête invalides.' }, { status: 400 });
  }

  if (text.length < 30) {
    return Response.json(
      { error: 'Décrivez le projet avec un peu plus de précision avant de demander un avis.' },
      { status: 400 },
    );
  }

  if (action === 'chat' && question.length < 3) {
    return Response.json({ error: 'Écrivez une question de suivi.' }, { status: 400 });
  }

  const promptInput = {
    action,
    projectType,
    specialty,
    audience,
    text,
    previousAnalysis,
    question,
  };

  const system = buildSystemPrompt(projectType, specialty);
  const prompt = buildUserPrompt(promptInput);
  const failures: string[] = [];

  // Fournisseur principal : Gemini.
  // En cas de quota, de timeout ou d'incident : bascule automatique vers Groq,
  // puis vers les modèles gratuits de Vercel AI Gateway.
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const result = await callGemini(geminiKey, system, prompt, action);
      return Response.json({ ...result, fallback: false });
    } catch (error) {
      failures.push(`gemini:${error instanceof Error ? error.message : 'erreur'}`);
    }
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    try {
      const result = await callGroq(groqKey, system, prompt, action);
      return Response.json({ ...result, fallback: true });
    } catch (error) {
      failures.push(`groq:${error instanceof Error ? error.message : 'erreur'}`);
    }
  }

  try {
    const result = await callVercelGateway(system, prompt, action);
    return Response.json({ ...result, fallback: true });
  } catch (error) {
    failures.push(`gateway:${error instanceof Error ? error.message : 'erreur'}`);
  }

  console.error('[Julia] Tous les fournisseurs IA ont échoué :', failures);
  return Response.json(
    {
      error:
        "Julia a essayé Gemini, Groq et Vercel AI Gateway sans obtenir de réponse. Relancez la demande : tous les fournisseurs seront retentés automatiquement.",
    },
    { status: 503 },
  );
}
