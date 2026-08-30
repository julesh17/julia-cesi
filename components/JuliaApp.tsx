'use client';

import { useMemo, useState } from 'react';
import { SimpleMarkdown } from './SimpleMarkdown';
import type { JuliaAction, ProjectType, Specialty } from '@/lib/types';

const CESI_LOGO = 'https://raw.githubusercontent.com/julesh17/cesi-edt/refs/heads/main/static/cesi.png';

type Tone = 'green' | 'yellow' | 'orange' | 'red' | 'gray';
type VerdictTone = Exclude<Tone, 'gray'>;

type CriterionResult = {
  status: Tone;
  note?: string;
};

type AnalysisMeta = {
  verdict: VerdictTone;
  criteria: Record<string, CriterionResult>;
};

type ResponseItem = {
  id: number;
  title: string;
  text: string;
};

const projectOptions: Array<{ value: ProjectType; year: string; title: string; short: string; icon: string }> = [
  { value: 'memoire', year: 'A3', title: 'Mémoire technique', short: 'Analyser, comprendre et transmettre un savoir technique.', icon: 'MT' },
  { value: 'ads', year: 'A4', title: 'Projet ADS', short: 'Appliquer une démarche scientifique et justifier un choix.', icon: 'DS' },
  { value: 'pfe', year: 'A5', title: 'Projet de fin d’études', short: 'Porter une mission complexe au niveau ingénieur junior.', icon: 'PF' },
];

const specialtyOptions: Array<{ value: Specialty; title: string; short: string }> = [
  { value: 'informatique', title: 'Informatique', short: 'Logiciel, données, IA, systèmes, réseaux, cybersécurité…' },
  { value: 's3e', title: 'S3E', short: 'Systèmes Électriques et Électroniques Embarqués' },
];

const placeholders: Record<ProjectType, string> = {
  memoire: "Décrivez votre projet : contexte, sujet technique étudié, objectifs, travail prévu et résultat attendu…",
  ads: "Décrivez votre projet : contexte, problème rencontré, objectifs, pistes envisagées, démarche possible et résultat attendu…",
  pfe: "Décrivez votre projet : contexte, besoin de l'entreprise, mission, responsabilités, objectifs, travaux prévus, parties prenantes et résultats attendus…",
};

const checklistDefinitions: Record<ProjectType, Array<{ id: string; label: string }>> = {
  memoire: [
    { id: 'level', label: 'Adéquation au niveau A3' },
    { id: 'specialty', label: 'Lien avec la spécialité' },
    { id: 'subject', label: 'Sujet et objectifs' },
    { id: 'technical', label: 'Analyse technique' },
    { id: 'research', label: "Recherche d'information" },
    { id: 'theory', label: 'Articulation théorie / pratique' },
    { id: 'mission', label: 'Déroulement de la mission' },
    { id: 'results', label: 'Résultats et bilan' },
  ],
  ads: [
    { id: 'level', label: 'Adéquation au projet ADS' },
    { id: 'specialty', label: 'Lien avec la spécialité' },
    { id: 'problem', label: 'Problématique ouverte' },
    { id: 'smart', label: 'Objectifs SMART' },
    { id: 'bibliography', label: "État de l'art / bibliographie" },
    { id: 'solutions', label: 'Solutions réellement comparables' },
    { id: 'criteria', label: 'Critères objectifs de choix' },
    { id: 'validation', label: 'Validation de la solution' },
  ],
  pfe: [
    { id: 'level', label: 'Adéquation au niveau ingénieur' },
    { id: 'specialty', label: 'Lien avec la spécialité' },
    { id: 'problem', label: 'Problématique' },
    { id: 'smart', label: 'Objectifs SMART' },
    { id: 'technical', label: 'Démarche technique' },
    { id: 'management', label: 'Conduite de projet' },
    { id: 'validation', label: 'Critères de validation' },
    { id: 'business', label: "Enjeux de l'entreprise" },
  ],
};

const statusLabels: Record<Tone, string> = {
  green: 'Adéquat',
  yellow: 'À préciser',
  orange: 'À retravailler',
  red: 'Insuffisant',
  gray: 'Non précisé',
};

const verdictLabels: Record<VerdictTone, string> = {
  green: 'Sujet adapté',
  yellow: 'Sujet adapté sous conditions',
  orange: 'Sujet à retravailler',
  red: "Sujet non adapté en l'état",
};

const actionLabels: Record<Exclude<JuliaAction, 'analyze' | 'chat'>, { label: string; title: string; icon: string }> = {
  smart: { label: 'Rendre mes objectifs SMART', title: 'Objectifs SMART', icon: '◎' },
  reformulate: { label: 'Reformuler mon sujet', title: 'Reformulation proposée', icon: '✦' },
  questions: { label: 'Quelles questions me poser ?', title: 'Questions utiles avant validation', icon: '?' },
};

const validTones = new Set<Tone>(['green', 'yellow', 'orange', 'red', 'gray']);
const validVerdicts = new Set<VerdictTone>(['green', 'yellow', 'orange', 'red']);

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function detectVerdict(text: string): VerdictTone {
  const normalized = text.toLowerCase();
  if (normalized.includes("sujet non adapté en l'état")) return 'red';
  if (normalized.includes('sujet à retravailler')) return 'orange';
  if (normalized.includes('sujet adapté sous conditions')) return 'yellow';
  return 'green';
}

function parseJuliaAnalysis(rawText: string): { text: string; meta: AnalysisMeta } {
  const regex = /\[\[JULIA_META\]\]\s*([\s\S]*?)\s*\[\[\/JULIA_META\]\]/i;
  const match = rawText.match(regex);
  const cleanText = rawText.replace(regex, '').trim();
  const fallback: AnalysisMeta = { verdict: detectVerdict(cleanText), criteria: {} };

  if (!match) return { text: cleanText, meta: fallback };

  try {
    const parsed = JSON.parse(match[1]) as {
      verdict?: unknown;
      criteria?: Record<string, { status?: unknown; note?: unknown }>;
    };

    const verdict = typeof parsed.verdict === 'string' && validVerdicts.has(parsed.verdict as VerdictTone)
      ? parsed.verdict as VerdictTone
      : fallback.verdict;

    const criteria: Record<string, CriterionResult> = {};
    if (parsed.criteria && typeof parsed.criteria === 'object') {
      Object.entries(parsed.criteria).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') return;
        const status = typeof value.status === 'string' && validTones.has(value.status as Tone)
          ? value.status as Tone
          : 'gray';
        const note = typeof value.note === 'string' ? value.note.trim().slice(0, 120) : '';
        criteria[key] = { status, note };
      });
    }

    return { text: cleanText, meta: { verdict, criteria } };
  } catch {
    return { text: cleanText, meta: fallback };
  }
}

export default function JuliaApp() {
  const [projectType, setProjectType] = useState<ProjectType>('ads');
  const [specialty, setSpecialty] = useState<Specialty>('s3e');
  const [text, setText] = useState('');
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState<JuliaAction | null>(null);
  const [error, setError] = useState('');

  const initialAnalysis = useMemo(() => responses.find((item) => item.title === 'Analyse du sujet')?.text ?? '', [responses]);
  const selectedProject = projectOptions.find((option) => option.value === projectType)!;
  const checklist = checklistDefinitions[projectType];

  function clearResults() {
    setResponses([]);
    setAnalysisMeta(null);
    setQuestion('');
    setError('');
  }

  function selectProjectType(value: ProjectType) {
    if (value !== projectType && responses.length > 0) clearResults();
    setProjectType(value);
  }

  function selectSpecialty(value: Specialty) {
    if (value !== specialty && responses.length > 0) clearResults();
    setSpecialty(value);
  }

  async function askJulia(action: JuliaAction, customQuestion?: string) {
    setError('');
    if (text.trim().length < 30) {
      setError('Décrivez un peu plus le projet avant de demander un avis à Julia.');
      return;
    }
    if (action === 'chat' && (!customQuestion || customQuestion.trim().length < 3)) {
      setError('Écrivez une question de suivi.');
      return;
    }

    setLoading(action);
    try {
      const payload = {
        action,
        projectType,
        specialty,
        audience: 'etudiant',
        text: text.trim(),
        previousAnalysis: initialAnalysis,
        question: customQuestion?.trim(),
      };

      let data: any = null;
      let lastStatus = 0;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch('/api/julia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          lastStatus = response.status;
          data = await response.json().catch(() => ({}));

          if (response.ok && typeof data?.text === 'string' && data.text.trim()) break;

          if (response.status < 500) {
            setError(data?.error || "La demande n'est pas complète.");
            return;
          }
        } catch {
          lastStatus = 0;
        }

        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 900));
      }

      if (typeof data?.text !== 'string' || !data.text.trim()) {
        throw new Error(`server-unavailable-${lastStatus}`);
      }

      const parsed = action === 'analyze' ? parseJuliaAnalysis(data.text) : { text: data.text.trim(), meta: null };
      if (action === 'analyze') setAnalysisMeta(parsed.meta);

      const title = action === 'analyze'
        ? 'Analyse du sujet'
        : action === 'chat'
          ? customQuestion!.trim()
          : actionLabels[action].title;

      setResponses((current) => [
        ...current,
        { id: Date.now(), title, text: parsed.text },
      ]);
      if (action === 'chat') setQuestion('');

      requestAnimationFrame(() => {
        document.getElementById('julia-responses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setError("Julia n'a pas pu répondre pour le moment. Réessayez dans quelques instants.");
    } finally {
      setLoading(null);
    }
  }

  function resetAll() {
    setText('');
    setResponses([]);
    setAnalysisMeta(null);
    setQuestion('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Certains navigateurs peuvent bloquer le presse-papiers.
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="Julia - accueil">
            <span className="julia-mark">J</span>
            <span className="brand-copy"><strong>Julia</strong><small>Assistant de cadrage pédagogique</small></span>
          </a>
          <img src={CESI_LOGO} className="cesi-logo" alt="CESI École d'Ingénieurs" />
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> Cadrer avant de soumettre</span>
              <h1>Votre projet tient-il vraiment la route&nbsp;?</h1>
              <p className="hero-lead">Julia vous aide à examiner un mémoire technique, un projet ADS ou un PFE, à vérifier son adéquation aux attendus et à améliorer sa formulation.</p>
              <div className="hero-badges">
                <span>Référentiel pédagogique intégré</span>
                <span>Avis clair et argumenté</span>
                <span>Reformulation et objectifs SMART</span>
              </div>
            </div>
            <div className="hero-note">
              <div className="note-icon">i</div>
              <div>
                <strong>Un outil d’aide, pas une validation officielle</strong>
                <p>L’avis de Julia complète les échanges avec l’équipe pédagogique. La validation du sujet reste humaine.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container workspace">
          <div className="workspace-header">
            <div>
              <span className="section-kicker">1 · Cadrage</span>
              <h2>Présentez votre projet à Julia</h2>
              <p>Décrivez simplement le contexte, le besoin, les objectifs, la mission envisagée et les résultats attendus.</p>
            </div>
            {responses.length > 0 && <button className="text-button" onClick={resetAll}>Nouvelle analyse</button>}
          </div>

          <div className="form-card">
            <div className="form-section">
              <label className="form-label">Quel travail préparez-vous ?</label>
              <div className="project-grid">
                {projectOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`choice-card project-choice ${projectType === option.value ? 'selected' : ''}`}
                    onClick={() => selectProjectType(option.value)}
                    aria-pressed={projectType === option.value}
                  >
                    <span className="choice-icon">{option.icon}</span>
                    <span className="choice-copy">
                      <small>{option.year}</small>
                      <strong>{option.title}</strong>
                      <span>{option.short}</span>
                    </span>
                    <span className="choice-check">✓</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Spécialité</label>
              <div className="specialty-grid">
                {specialtyOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`choice-card specialty-choice ${specialty === option.value ? 'selected' : ''}`}
                    onClick={() => selectSpecialty(option.value)}
                    aria-pressed={specialty === option.value}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.short}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section text-section">
              <div className="label-row">
                <label className="form-label" htmlFor="project-text">Décrivez votre projet</label>
                <span className="character-count">{text.length.toLocaleString('fr-FR')} / 12 000</span>
              </div>
              <textarea
                id="project-text"
                value={text}
                maxLength={12000}
                onChange={(event) => setText(event.target.value)}
                placeholder={placeholders[projectType]}
                rows={11}
              />
              <div className="privacy-note">
                <span className="lock-icon">⌁</span>
                <span><strong>Confidentialité :</strong> ne saisissez pas d’informations sensibles ou confidentielles de votre entreprise. Anonymisez les noms, produits et données si nécessaire.</span>
              </div>
            </div>

            {error && <div className="error-banner" role="alert">{error}</div>}

            <div className="submit-row">
              <div className="selected-summary">
                <span>{selectedProject.year}</span>
                <strong>{selectedProject.title}</strong>
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={loading !== null}
                onClick={() => askJulia('analyze')}
              >
                {loading === 'analyze' ? <><Spinner /> Julia analyse votre sujet…</> : <>Demander l’avis de Julia <span>→</span></>}
              </button>
            </div>
          </div>
        </section>

        {responses.length > 0 && (
          <section className="container results-section" id="julia-responses">
            <div className="workspace-header results-heading">
              <div>
                <span className="section-kicker">2 · Retour pédagogique</span>
                <h2>L’avis de Julia</h2>
                <p>Julia synthétise les points essentiels et situe chaque attendu avec un code couleur.</p>
              </div>
            </div>

            {analysisMeta && (
              <section className={`assessment-overview tone-${analysisMeta.verdict}`} aria-label="Check-list d'adéquation du sujet">
                <div className="assessment-header">
                  <div>
                    <span className="section-kicker">Check-list du sujet</span>
                    <h3>Adéquation aux attendus</h3>
                  </div>
                  <span className={`verdict-badge tone-${analysisMeta.verdict}`}>{verdictLabels[analysisMeta.verdict]}</span>
                </div>

                <div className="assessment-legend" aria-label="Légende des couleurs">
                  <span className="legend-item"><i className="tone-dot tone-green" /> Adéquat</span>
                  <span className="legend-item"><i className="tone-dot tone-yellow" /> À préciser</span>
                  <span className="legend-item"><i className="tone-dot tone-orange" /> À retravailler</span>
                  <span className="legend-item"><i className="tone-dot tone-red" /> Insuffisant</span>
                  <span className="legend-item"><i className="tone-dot tone-gray" /> Non précisé</span>
                </div>

                <div className="criteria-grid">
                  {checklist.map((criterion) => {
                    const result = analysisMeta.criteria[criterion.id] ?? { status: 'gray' as Tone, note: '' };
                    return (
                      <div className={`criterion-row tone-${result.status}`} key={criterion.id}>
                        <span className={`criterion-indicator tone-${result.status}`} aria-hidden="true" />
                        <div className="criterion-copy">
                          <strong>{criterion.label}</strong>
                          {result.note && <small>{result.note}</small>}
                        </div>
                        <span className={`status-chip tone-${result.status}`}>{statusLabels[result.status]}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="results-layout">
              <div className="responses-stack">
                {responses.map((item, index) => (
                  <article className="response-card" key={item.id}>
                    <div className="response-topline">
                      <div className="response-identity">
                        <span className="mini-julia">J</span>
                        <div><small>{index === 0 ? 'Julia · analyse' : 'Julia · complément'}</small><strong>{item.title}</strong></div>
                      </div>
                      <button className="copy-button" onClick={() => copyText(item.text)} title="Copier la réponse">Copier</button>
                    </div>
                    <SimpleMarkdown text={item.text} />
                  </article>
                ))}

                {loading && loading !== 'analyze' && (
                  <article className="response-card loading-card"><Spinner /><span>Julia prépare sa réponse…</span></article>
                )}
              </div>

              <aside className="actions-panel">
                <div className="actions-card">
                  <span className="section-kicker">Aller plus loin</span>
                  <h3>Travaillez le sujet avec Julia</h3>
                  <p>Utilisez le même contexte pour approfondir un point sans tout réécrire.</p>
                  <div className="action-buttons">
                    {(Object.keys(actionLabels) as Array<keyof typeof actionLabels>).map((action) => (
                      <button key={action} onClick={() => askJulia(action)} disabled={loading !== null}>
                        <span className="action-icon">{actionLabels[action].icon}</span>
                        <span><strong>{actionLabels[action].label}</strong><small>{action === 'smart' ? 'Clarifier et rendre vos objectifs vérifiables.' : action === 'reformulate' ? 'Un intitulé, une problématique et une version courte.' : 'Les points à éclaircir avant de soumettre.'}</small></span>
                        <span className="action-arrow">→</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="question-card">
                  <span className="section-kicker">Question libre</span>
                  <h3>Demandez une précision</h3>
                  <textarea
                    value={question}
                    maxLength={3000}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ex. : Est-ce que mes critères de comparaison sont assez objectifs ?"
                    rows={4}
                  />
                  <button className="secondary-button" onClick={() => askJulia('chat', question)} disabled={loading !== null || question.trim().length < 3}>
                    {loading === 'chat' ? <><Spinner /> Réponse…</> : 'Poser la question'}
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}

        <section className="reference-section">
          <div className="container">
            <div className="reference-header">
              <span className="section-kicker">Repères</span>
              <h2>Trois exercices, trois niveaux d’attente</h2>
            </div>
            <div className="reference-grid">
              <div className="reference-card"><span>A3</span><h3>Mémoire technique</h3><p>Approfondir un savoir-faire, rechercher l’information, articuler théorie et pratique et produire une synthèse technique. Niveau attendu : technicien supérieur confirmé.</p></div>
              <div className="reference-card featured"><span>A4</span><h3>Projet ADS</h3><p>Partir d’une problématique ouverte, étudier l’existant et la bibliographie, comparer plusieurs solutions avec des critères objectifs puis valider expérimentalement le choix.</p></div>
              <div className="reference-card"><span>A5</span><h3>PFE</h3><p>Conduire une mission complexe à forte valeur ajoutée au niveau ingénieur junior, avec expertise technique, responsabilités et véritable pilotage de projet.</p></div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <div><strong>Julia</strong><span>Outil d’aide au cadrage pédagogique</span></div>
          <p>Julia ne remplace pas l’accompagnement ni la validation de l’équipe pédagogique de CESI.</p>
        </div>
      </footer>
    </div>
  );
}
