'use client';

import { useMemo, useState } from 'react';
import { SimpleMarkdown } from './SimpleMarkdown';
import { buildContinuityResponse } from '@/lib/fallback';
import type { Audience, JuliaAction, ProjectType, Specialty } from '@/lib/types';

const CESI_LOGO = 'https://raw.githubusercontent.com/julesh17/cesi-edt/refs/heads/main/static/cesi.png';

type ResponseItem = {
  id: number;
  title: string;
  text: string;
};

const projectOptions: Array<{ value: ProjectType; year: string; title: string; short: string; icon: string }> = [
  { value: 'memoire', year: '3e année', title: 'Mémoire technique', short: 'Analyser, comprendre et transmettre un savoir technique.', icon: 'MT' },
  { value: 'ads', year: '4e année', title: 'ADS', short: 'Appliquer une démarche scientifique et justifier un choix.', icon: 'DS' },
  { value: 'pfe', year: '5e année', title: 'Projet de fin d’études', short: 'Porter une mission complexe au niveau ingénieur junior.', icon: 'PF' },
];

const specialtyOptions: Array<{ value: Specialty; title: string; short: string }> = [
  { value: 'informatique', title: 'Informatique', short: 'Logiciel, données, IA, systèmes, réseaux, cybersécurité…' },
  { value: 's3e', title: 'S3E', short: 'Systèmes Électriques et Électroniques Embarqués' },
];

const audienceOptions: Array<{ value: Audience; label: string }> = [
  { value: 'etudiant', label: 'Étudiant·e' },
  { value: 'maitre', label: 'Maître d’apprentissage' },
  { value: 'pedagogie', label: 'Équipe pédagogique' },
];

const placeholders: Record<ProjectType, string> = {
  memoire: "Décrivez le sujet, le procédé ou la technologie étudiée, le contexte de l'entreprise, ce que vous devrez comprendre/analyser et le résultat attendu…",
  ads: "Collez le mail ou décrivez librement le contexte, le problème rencontré, les solutions déjà envisagées éventuelles, les objectifs et ce que l'entreprise attend…",
  pfe: "Décrivez le contexte, le besoin de l'entreprise, la mission, vos responsabilités, les objectifs, les travaux prévus, les parties prenantes et les résultats attendus…",
};

const actionLabels: Record<Exclude<JuliaAction, 'analyze' | 'chat'>, { label: string; title: string; icon: string }> = {
  smart: { label: 'Rendre mes objectifs SMART', title: 'Objectifs SMART', icon: '◎' },
  reformulate: { label: 'Reformuler mon sujet', title: 'Reformulation proposée', icon: '✦' },
  questions: { label: 'Quelles questions me poser ?', title: 'Questions utiles avant validation', icon: '?' },
};

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export default function JuliaApp() {
  const [projectType, setProjectType] = useState<ProjectType>('ads');
  const [specialty, setSpecialty] = useState<Specialty>('s3e');
  const [audience, setAudience] = useState<Audience>('etudiant');
  const [text, setText] = useState('');
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState<JuliaAction | null>(null);
  const [error, setError] = useState('');

  const initialAnalysis = useMemo(() => responses.find((item) => item.title === 'Analyse du sujet')?.text ?? '', [responses]);
  const selectedProject = projectOptions.find((option) => option.value === projectType)!;

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
      const response = await fetch('/api/julia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          projectType,
          specialty,
          audience,
          text: text.trim(),
          previousAnalysis: initialAnalysis,
          question: customQuestion?.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status < 500) {
          setError(data?.error || "La demande n'est pas complète.");
          return;
        }
        throw new Error('server-unavailable');
      }
      if (typeof data?.text !== 'string' || !data.text.trim()) {
        throw new Error('server-unavailable');
      }

      const title = action === 'analyze'
        ? 'Analyse du sujet'
        : action === 'chat'
          ? customQuestion!.trim()
          : actionLabels[action].title;

      setResponses((current) => [
        ...current,
        { id: Date.now(), title, text: data.text },
      ]);
      if (action === 'chat') setQuestion('');

      requestAnimationFrame(() => {
        document.getElementById('julia-responses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      // Si la Function Vercel, AI Gateway ou le réseau est momentanément
      // indisponible, Julia continue directement dans le navigateur grâce
      // au même référentiel pédagogique déterministe que le serveur.
      const title = action === 'analyze'
        ? 'Analyse du sujet'
        : action === 'chat'
          ? customQuestion!.trim()
          : actionLabels[action].title;

      const localText = buildContinuityResponse({
        action,
        projectType,
        specialty,
        audience,
        text: text.trim(),
        previousAnalysis: initialAnalysis,
        question: customQuestion?.trim(),
      });

      setResponses((current) => [
        ...current,
        { id: Date.now(), title, text: localText },
      ]);
      if (action === 'chat') setQuestion('');

      requestAnimationFrame(() => {
        document.getElementById('julia-responses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } finally {
      setLoading(null);
    }
  }

  function resetAll() {
    setText('');
    setResponses([]);
    setQuestion('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked by some browsers; no disruptive error is needed.
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
              <p className="hero-lead">Julia vous aide à examiner un mémoire technique, une ADS ou un PFE, à repérer les points faibles et à reformuler le sujet sans inventer une mission qui n’existe pas.</p>
              <div className="hero-badges">
                <span>Sans note ni pourcentage</span>
                <span>Référentiel pédagogique intégré</span>
                <span>Conseils et reformulations</span>
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
              <p>Vous pouvez simplement copier-coller le message ou le descriptif que vous comptiez envoyer.</p>
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
                    onClick={() => setProjectType(option.value)}
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

            <div className="form-section two-column-section">
              <div>
                <label className="form-label">Spécialité</label>
                <div className="specialty-grid">
                  {specialtyOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={`choice-card specialty-choice ${specialty === option.value ? 'selected' : ''}`}
                      onClick={() => setSpecialty(option.value)}
                      aria-pressed={specialty === option.value}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.short}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Vous êtes</label>
                <div className="audience-pills">
                  {audienceOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setAudience(option.value)}
                      className={audience === option.value ? 'active' : ''}
                    >{option.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section text-section">
              <div className="label-row">
                <label className="form-label" htmlFor="project-text">Décrivez le projet</label>
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
                <span><strong>Confidentialité :</strong> ne collez pas d’informations sensibles ou confidentielles de votre entreprise. Anonymisez les noms, produits et données si nécessaire.</span>
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
                <p>Julia s’appuie sur le type de travail choisi et votre spécialité, sans produire de score artificiel.</p>
              </div>
            </div>

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
                        <span><strong>{actionLabels[action].label}</strong><small>{action === 'smart' ? 'Des objectifs vérifiables sans inventer de chiffres.' : action === 'reformulate' ? 'Un intitulé, une problématique et une version courte.' : 'Les points à éclaircir avant de soumettre.'}</small></span>
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
              <div className="reference-card"><span>3A</span><h3>Mémoire technique</h3><p>Approfondir un savoir-faire, rechercher l’information, articuler théorie et pratique et produire une synthèse technique. Niveau attendu : technicien supérieur confirmé.</p></div>
              <div className="reference-card featured"><span>4A</span><h3>ADS</h3><p>Partir d’une problématique ouverte, étudier l’existant et la bibliographie, comparer plusieurs solutions avec des critères objectifs puis valider expérimentalement le choix.</p></div>
              <div className="reference-card"><span>5A</span><h3>PFE</h3><p>Conduire une mission complexe à forte valeur ajoutée au niveau ingénieur junior, avec expertise technique, responsabilités et véritable pilotage de projet.</p></div>
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
