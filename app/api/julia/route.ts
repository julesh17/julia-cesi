import { generateText } from 'ai';
import { NextRequest } from 'next/server';
import { buildContinuityResponse } from '@/lib/fallback';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import type { Audience, JuliaAction, ProjectType, Specialty } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Modèles actuellement proposés gratuitement par Vercel AI Gateway.
// Le Gateway gère lui-même le passage d'un modèle au suivant si le premier
// n'est pas disponible. Le référentiel local prend ensuite le relais si
// l'ensemble du service IA est indisponible ou si l'authentification Gateway
// n'est pas active sur le projet Vercel.
const DEFAULT_PRIMARY_MODEL = 'minimax/minimax-m2.7-free';
const FREE_FALLBACK_MODELS = [
  'inclusionai/ling-3.0-tiny-free',
  'poolside/laguna-s-2.1-free',
  'inclusionai/ling-3.0-flash-free',
];

const PROJECT_TYPES: ProjectType[] = ['memoire', 'ads', 'pfe'];
const SPECIALTIES: Specialty[] = ['informatique', 's3e'];
const AUDIENCES: Audience[] = ['etudiant', 'maitre', 'pedagogie'];
const ACTIONS: JuliaAction[] = ['analyze', 'smart', 'reformulate', 'questions', 'chat'];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').trim().slice(0, max);
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

  if (!isOneOf(action, ACTIONS) || !isOneOf(projectType, PROJECT_TYPES) || !isOneOf(specialty, SPECIALTIES) || !isOneOf(audience, AUDIENCES)) {
    return Response.json({ error: 'Paramètres de requête invalides.' }, { status: 400 });
  }

  if (text.length < 30) {
    return Response.json({ error: 'Décrivez le projet avec un peu plus de précision avant de demander un avis.' }, { status: 400 });
  }

  if (action === 'chat' && question.length < 3) {
    return Response.json({ error: 'Écrivez une question de suivi.' }, { status: 400 });
  }

  const fallbackInput = {
    action,
    projectType,
    specialty,
    audience,
    text,
    previousAnalysis,
    question,
  };

  try {
    const system = buildSystemPrompt(projectType, specialty);
    const prompt = buildUserPrompt(fallbackInput);
    const primaryModel = process.env.JULIA_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
    const fallbackModels = FREE_FALLBACK_MODELS.filter((model) => model !== primaryModel);

    const result = await generateText({
      model: primaryModel,
      system,
      prompt,
      temperature: 0.25,
      maxOutputTokens: action === 'analyze' ? 1800 : 1300,
      maxRetries: 2,
      timeout: 52000,
      providerOptions: {
        gateway: {
          models: fallbackModels,
        },
      },
    });

    if (result.text?.trim()) {
      return Response.json({
        text: result.text.trim(),
        model: primaryModel,
        fallback: false,
      });
    }
  } catch (error) {
    console.error('[Julia] AI Gateway indisponible, bascule vers le référentiel local :', error);
  }

  // Continuité de service : aucune dépendance externe, aucun crédit et aucune
  // clé ne sont nécessaires pour ce mode. L'utilisateur reçoit toujours un
  // retour pédagogique exploitable au lieu d'une erreur 503.
  return Response.json({
    text: buildContinuityResponse(fallbackInput),
    model: 'julia-local-reference',
    fallback: true,
  });
}
