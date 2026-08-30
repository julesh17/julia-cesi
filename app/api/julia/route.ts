import { generateText } from 'ai';
import { NextRequest } from 'next/server';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import type { Audience, JuliaAction, ProjectType, Specialty } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FREE_MODELS = [
  'inclusionai/ling-3.0-flash-free',
  'inclusionai/ling-3.0-tiny-free',
  'poolside/laguna-s-2.1-free',
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
  try {
    const body = await request.json();
    const action = body?.action;
    const projectType = body?.projectType;
    const specialty = body?.specialty;
    const audience = body?.audience;
    const text = cleanText(body?.text, 12000);
    const previousAnalysis = cleanText(body?.previousAnalysis, 12000);
    const question = cleanText(body?.question, 3000);

    if (!isOneOf(action, ACTIONS) || !isOneOf(projectType, PROJECT_TYPES) || !isOneOf(specialty, SPECIALTIES) || !isOneOf(audience, AUDIENCES)) {
      return Response.json({ error: 'Paramètres de requête invalides.' }, { status: 400 });
    }

    if (text.length < 30) {
      return Response.json({ error: 'Décrivez le projet avec un peu plus de précision avant de demander un avis.' }, { status: 400 });
    }

    if (action === 'chat' && question.length < 3) {
      return Response.json({ error: 'Écrivez une question de suivi.' }, { status: 400 });
    }

    const system = buildSystemPrompt(projectType, specialty);
    const prompt = buildUserPrompt({
      action,
      projectType,
      specialty,
      audience,
      text,
      previousAnalysis,
      question,
    });

    // Par défaut Julia n'utilise que des modèles annoncés gratuits dans AI Gateway.
    // JULIA_MODEL est volontairement optionnel : le propriétaire peut remplacer le modèle
    // plus tard depuis les variables d'environnement Vercel, sans modifier le code.
    const models = process.env.JULIA_MODEL
      ? [process.env.JULIA_MODEL]
      : FREE_MODELS;

    let lastError: unknown = null;

    for (const model of models) {
      try {
        const result = await generateText({
          model,
          system,
          prompt,
          temperature: 0.25,
          maxOutputTokens: action === 'analyze' ? 1800 : 1300,
          maxRetries: 1,
          timeout: 45000,
        });

        if (result.text?.trim()) {
          return Response.json({ text: result.text.trim(), model });
        }
      } catch (error) {
        lastError = error;
        console.error(`[Julia] Échec du modèle ${model}:`, error);
      }
    }

    console.error('[Julia] Tous les modèles ont échoué:', lastError);
    return Response.json(
      {
        error: "Julia n'arrive pas à joindre un modèle gratuit pour le moment. Réessayez dans quelques instants.",
      },
      { status: 503 },
    );
  } catch (error) {
    console.error('[Julia] Erreur API:', error);
    return Response.json(
      { error: "Une erreur inattendue s'est produite. Réessayez dans quelques instants." },
      { status: 500 },
    );
  }
}
