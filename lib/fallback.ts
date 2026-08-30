import type { Audience, JuliaAction, ProjectType, Specialty } from './types';

type FallbackInput = {
  action: JuliaAction;
  projectType: ProjectType;
  specialty: Specialty;
  audience: Audience;
  text: string;
  previousAnalysis?: string;
  question?: string;
};

type Signal = {
  found: boolean;
  label: string;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function bullet(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

function continuityNote() {
  return `\n\n*Julia utilise momentanément son référentiel pédagogique local de continuité. L'analyse reste exploitable, mais une nouvelle tentative pourra apporter une lecture plus fine du contenu.*`;
}

const SIGNALS = {
  problem: ['problème', 'probleme', 'dysfonctionnement', 'difficulté', 'difficulte', 'besoin', 'enjeu'],
  context: ['contexte', 'entreprise', 'service', 'équipe', 'equipe', 'existant', 'actuellement', 'situation'],
  objectives: ['objectif', 'atteindre', 'réduire', 'reduire', 'améliorer', 'ameliorer', 'augmenter', 'garantir', 'permettre'],
  bibliography: ['bibliographie', 'état de l’art', "etat de l'art", 'article', 'thèse', 'these', 'publication', 'littérature', 'litterature', 'benchmark'],
  alternatives: ['plusieurs solutions', 'solutions possibles', 'alternatives', 'comparer', 'comparaison', 'critères', 'criteres', 'matrice de décision', 'matrice de decision'],
  validation: ['test', 'essai', 'simulation', 'prototype', 'pilote', 'validation', 'mesure', 'performance', 'indicateur'],
  management: ['planning', 'jalon', 'wbs', 'risque', 'budget', 'parties prenantes', 'ressource', 'pilotage', 'management', 'coût', 'cout', 'délai', 'delai'],
  technical: ['développer', 'developper', 'concevoir', 'architecture', 'algorithme', 'logiciel', 'système', 'systeme', 'carte', 'électronique', 'electronique', 'réseau', 'reseau', 'données', 'donnees', 'prototype'],
  solutionLocked: [
    'la solution est', 'la solution sera', 'j’ai trouvé que', "j'ai trouvé que", 'le défaut vient', 'le defaut vient',
    'mettre en place la solution', 'réaliser une base', 'realiser une base', 'créer une base', 'creer une base',
    'il faut utiliser', 'nous allons utiliser', 'on va utiliser',
  ],
};

function signals(text: string) {
  const n = normalize(text);
  return {
    problem: hasAny(n, SIGNALS.problem),
    context: hasAny(n, SIGNALS.context),
    objectives: hasAny(n, SIGNALS.objectives),
    bibliography: hasAny(n, SIGNALS.bibliography),
    alternatives: hasAny(n, SIGNALS.alternatives),
    validation: hasAny(n, SIGNALS.validation),
    management: hasAny(n, SIGNALS.management),
    technical: hasAny(n, SIGNALS.technical),
    solutionLocked: hasAny(n, SIGNALS.solutionLocked),
    hasHow: /\bcomment\b/.test(n),
  };
}

function specialtyLabel(specialty: Specialty) {
  return specialty === 's3e'
    ? 'S3E — Systèmes Électriques et Électroniques Embarqués'
    : 'Informatique';
}

function analyzeAds(input: FallbackInput) {
  const s = signals(input.text);
  const positives: string[] = [];
  const gaps: string[] = [];

  if (s.context) positives.push("Le contexte ou la situation de départ apparaît dans le descriptif.");
  if (s.problem) positives.push("Un besoin ou un problème industriel est identifiable.");
  if (s.bibliography) positives.push("Une recherche bibliographique / un état de l'art est déjà envisagé.");
  if (s.alternatives) positives.push("Le texte fait apparaître l'idée de plusieurs solutions ou d'une comparaison objective.");
  if (s.validation) positives.push("Une validation par essais, mesures, simulation ou prototype semble possible.");

  if (!s.hasHow) gaps.push("Formuler une problématique ouverte commençant par « Comment », centrée sur le problème et non sur la solution.");
  if (s.solutionLocked) gaps.push("La formulation semble déjà orientée vers une solution ou une cause déterminée : il faut vérifier que l'étude conserve réellement plusieurs pistes possibles.");
  if (!s.bibliography) gaps.push("Faire apparaître la possibilité d'un état de l'art scientifique ou technique permettant de comprendre le problème et d'identifier des solutions.");
  if (!s.alternatives) gaps.push("Préciser quelles familles de solutions pourraient être comparées et selon quels critères objectifs.");
  if (!s.validation) gaps.push("Prévoir une méthode de validation permettant de démontrer objectivement si la solution retenue répond aux objectifs.");

  const verdict = gaps.length <= 1 && !s.solutionLocked
    ? 'Sujet adapté sous conditions'
    : gaps.length <= 3
      ? 'Sujet à retravailler'
      : "Sujet à retravailler";

  return `## Avis de Julia\n**${verdict}.** Le besoin industriel peut être exploitable pour une ADS, mais la qualité de l'exercice dépend surtout de la démarche scientifique réellement possible. Il faut pouvoir partir d'une problématique ouverte, étudier l'existant, identifier plusieurs solutions, les comparer avec des critères objectifs puis valider le choix retenu.\n\n## Ce qui fonctionne\n${bullet(positives.length ? positives : ["Le descriptif fournit une base de discussion, mais les éléments caractéristiques de la démarche ADS doivent encore être explicités."])}\n\n## Ce qui doit être précisé ou retravaillé\n${bullet(gaps.length ? gaps : ["Aucun point bloquant évident n'apparaît dans les éléments détectés ; il reste toutefois à vérifier que la mission réelle permet bien toute la démarche annoncée."])}\n\n## Questions à vous poser\n${bullet([
    "Quel est exactement le problème à résoudre, indépendamment de la solution déjà envisagée ?",
    "Peut-on formuler ce problème sous la forme d'une question commençant par « Comment » ?",
    "La bibliographie ou l'état de l'art peuvent-ils faire émerger plusieurs approches réellement différentes ?",
    "Quels critères objectifs permettront de comparer ces approches : performance, coût, complexité, fiabilité, maintenabilité, compatibilité, impact environnemental… selon le sujet ?",
    "La solution retenue résultera-t-elle réellement de cette comparaison, ou est-elle déjà imposée ?",
    "Quel protocole de test, mesure, simulation ou essai permettra de conclure par rapport aux objectifs ?",
  ])}\n\n## Proposition de reformulation\n**Problématique de travail :** « Comment répondre au problème décrit dans l'entreprise tout en respectant les contraintes techniques, économiques et opérationnelles à préciser ? »\n\nCette formulation est volontairement générale : elle doit être remplacée par une phrase qui nomme précisément le problème réel sans imposer la solution.\n\n## Démarche conseillée\nContexte et situation de départ → problématique ouverte → analyse de l'existant → bibliographie / état de l'art → identification de plusieurs solutions → critères de comparaison → sélection argumentée → réalisation ou expérimentation → protocole de validation → analyse des résultats → conclusion et perspectives.\n\n## Point de vigilance\nLe principal risque pour une ADS est de partir d'une solution déjà décidée et de reconstruire ensuite une justification. La démarche doit réellement permettre un choix.${continuityNote()}`;
}

function analyzePfe(input: FallbackInput) {
  const s = signals(input.text);
  const positives: string[] = [];
  const gaps: string[] = [];

  if (s.context) positives.push("Le contexte d'entreprise et/ou la situation de départ apparaissent dans le descriptif.");
  if (s.problem) positives.push("Un besoin ou une problématique de l'organisation est identifiable.");
  if (s.technical) positives.push(`Une dimension technique en lien potentiel avec la spécialité ${specialtyLabel(input.specialty)} apparaît.`);
  if (s.validation) positives.push("Des résultats, mesures, essais ou indicateurs semblent pouvoir être mobilisés pour objectiver le résultat.");
  if (s.management) positives.push("Des éléments de pilotage ou d'organisation du projet sont déjà évoqués.");

  if (!s.objectives) gaps.push("Préciser les objectifs attendus et les résultats permettant de constater qu'ils sont atteints.");
  if (!s.technical) gaps.push("Faire apparaître la valeur ajoutée scientifique ou technique et le lien avec la spécialité.");
  if (!s.management) gaps.push("Le PFE ne doit pas être présenté comme une simple réalisation technique : expliciter le pilotage, les étapes, ressources, parties prenantes, risques, délais, indicateurs et contraintes pertinentes.");
  if (!s.validation) gaps.push("Définir comment les résultats du projet seront évalués objectivement.");

  const verdict = s.technical && s.management && s.problem
    ? 'Sujet adapté sous conditions'
    : 'Sujet à retravailler';

  return `## Avis de Julia\n**${verdict}.** Un PFE doit correspondre à une mission complexe et à forte valeur ajoutée, menée avec le niveau d'autonomie et de responsabilité attendu d'un ingénieur junior. La dimension technique compte, mais elle doit s'accompagner d'une véritable conduite de projet et d'une contribution identifiable aux enjeux de l'entreprise.\n\n## Ce qui fonctionne\n${bullet(positives.length ? positives : ["Le descriptif constitue un point de départ, mais il ne fait pas encore apparaître assez clairement les dimensions attendues d'un PFE."])}\n\n## Ce qui doit être précisé ou retravaillé\n${bullet(gaps.length ? gaps : ["Aucun manque majeur n'est détecté dans la formulation, mais il faut vérifier que ces dimensions correspondent bien à la mission réelle et pas seulement au texte de présentation."])}\n\n## Questions à vous poser\n${bullet([
    "Quelle problématique complexe l'entreprise vous confie-t-elle réellement ?",
    "Quelle décision, conception, amélioration ou transformation relève de votre responsabilité ?",
    "Quelle expertise scientifique ou technique allez-vous mobiliser et quelle valeur ajoutée personnelle apporterez-vous ?",
    "Quelles sont les grandes étapes du projet et les principaux livrables ?",
    "Quelles parties prenantes, ressources humaines ou techniques devrez-vous coordonner ?",
    "Quels risques, contraintes de délai, de coût, de qualité ou de réglementation doivent être pilotés ?",
    "Quels indicateurs permettront de suivre l'avancement et d'évaluer les résultats ?",
    "Comment le projet s'inscrit-il dans les enjeux ou la stratégie de l'entreprise ?",
  ])}\n\n## Proposition de reformulation\n**Intitulé de travail :** « Conception et pilotage d'une solution répondant à [problématique de l'entreprise] dans le respect de [contraintes principales à préciser]. »\n\n**Objectif principal :** conduire la mission depuis l'analyse du besoin jusqu'à l'évaluation des résultats, en mobilisant l'expertise ${specialtyLabel(input.specialty)} et les méthodes de gestion de projet adaptées.\n\n## Démarche conseillée\nContexte et enjeux → problématique et objectifs → analyse de l'existant → étude des solutions → choix argumenté → plan de management (WBS, planning, parties prenantes, ressources, risques, budget si pertinent, indicateurs, livrables) → réalisation / déploiement → suivi des écarts → validation des résultats → bilan et perspectives.\n\n## Point de vigilance\nUn sujet techniquement intéressant peut rester insuffisant pour un PFE s'il place l'étudiant uniquement en position d'exécutant et ne lui confie ni arbitrage, ni autonomie, ni pilotage réel.${continuityNote()}`;
}

function analyzeMemoire(input: FallbackInput) {
  const s = signals(input.text);
  const positives: string[] = [];
  const gaps: string[] = [];

  if (s.context) positives.push("Le sujet semble ancré dans une pratique ou un besoin de l'entreprise.");
  if (s.technical) positives.push(`Une composante technique en lien potentiel avec ${specialtyLabel(input.specialty)} est identifiable.`);
  if (s.objectives) positives.push("Le descriptif fait apparaître un objectif ou un résultat attendu.");
  if (s.bibliography) positives.push("La recherche d'information ou la bibliographie est déjà envisagée.");

  if (!s.technical) gaps.push("Identifier clairement le procédé, la technologie, la méthode ou l'étude technique qui sera approfondi.");
  if (!s.bibliography) gaps.push("Prévoir des sources documentaires et humaines permettant d'aller au-delà d'une simple description de ce qui est déjà connu dans l'entreprise.");
  if (!s.objectives) gaps.push("Préciser ce que le mémoire doit permettre de comprendre, analyser, formaliser ou transmettre.");

  return `## Avis de Julia\n**Sujet adapté sous conditions.** Le mémoire technique de 3e année vise surtout l'approfondissement et la formalisation d'un savoir-faire technique, avec un niveau de complexité correspondant à celui d'un technicien supérieur confirmé. Il n'est donc pas nécessaire de transformer artificiellement le sujet en PFE ou en ADS.\n\n## Ce qui fonctionne\n${bullet(positives.length ? positives : ["Le sujet peut servir de base à un mémoire technique si une véritable analyse et une restitution structurée sont possibles."])}\n\n## Ce qui doit être précisé ou retravaillé\n${bullet(gaps.length ? gaps : ["La formulation paraît compatible avec l'exercice ; il reste à préciser la profondeur d'analyse et les sources qui seront mobilisées."])}\n\n## Questions à vous poser\n${bullet([
    "Quel procédé, technologie, équipement, méthode ou problème technique allez-vous réellement approfondir ?",
    "Quelles connaissances théoriques sont nécessaires pour comprendre le sujet ?",
    "Quelles sources documentaires et quelles personnes ressources pourrez-vous consulter ?",
    "Quelle part du travail relève de l'analyse et quelle part relève de la simple description ?",
    "Quel résultat concret produirez-vous : synthèse, spécifications, plan d'essais, étude, recommandations, document de formation… ?",
    "Comment montrerez-vous les résultats, les limites ou les écarts observés ?",
  ])}\n\n## Proposition de reformulation\n**Intitulé de travail :** « Étude et analyse de [procédé / technologie / méthode] dans le contexte de [activité ou besoin de l'entreprise]. »\n\n## Démarche conseillée\nPrésentation du contexte → définition du sujet et des objectifs → recherche d'informations → concepts techniques → analyse de l'existant → travail ou étude réalisée → résultats et écarts → bilan → conclusion personnelle et professionnelle.\n\n## Point de vigilance\nÉviter un mémoire purement descriptif : l'étudiant doit montrer qu'il a recherché, compris, analysé et formalisé un savoir technique.${continuityNote()}`;
}

function analyze(input: FallbackInput) {
  if (input.projectType === 'ads') return analyzeAds(input);
  if (input.projectType === 'pfe') return analyzePfe(input);
  return analyzeMemoire(input);
}

function smart(input: FallbackInput) {
  const projectSpecific = input.projectType === 'ads'
    ? "Pour une ADS, les objectifs doivent notamment permettre de comparer les solutions et de valider objectivement celle qui sera retenue."
    : input.projectType === 'pfe'
      ? "Pour un PFE, les objectifs doivent couvrir le résultat technique mais aussi, lorsque la mission le permet, le pilotage et les livrables du projet."
      : "Pour un mémoire technique, les objectifs peuvent porter sur la compréhension, l'analyse, la formalisation et la restitution d'un savoir technique.";

  return `## Diagnostic des objectifs actuels\nUn objectif SMART décrit un résultat attendu et vérifiable, pas seulement une liste de tâches. ${projectSpecific} Évitez les formulations comme « améliorer », « optimiser », « développer » ou « mettre en place » lorsqu'elles ne précisent pas ce qui devra objectivement changer ou être démontré.\n\n## Objectifs SMART proposés\n${bullet([
    "Caractériser précisément la situation de départ à l'aide de critères ou d'indicateurs [à préciser].",
    "Définir le résultat attendu en indiquant la performance, la qualité, le délai ou la contrainte qui permettra de vérifier son atteinte [à préciser].",
    input.projectType === 'ads'
      ? "Comparer les solutions identifiées à l'aide de critères objectifs définis avant la sélection, puis justifier la solution retenue."
      : input.projectType === 'pfe'
        ? "Conduire les étapes du projet jusqu'au livrable final en suivant des jalons, indicateurs et contraintes [à préciser]."
        : "Produire une analyse technique structurée permettant de comprendre et de restituer le procédé, la technologie ou la méthode étudiée.",
    "Valider le résultat obtenu au moyen d'un protocole, d'essais, de mesures, d'une revue ou d'éléments de preuve adaptés au sujet.",
  ])}\n\n## Indicateurs à définir\n${bullet([
    "Une mesure de performance ou de qualité pertinente pour le sujet.",
    "Une situation de référence permettant de comparer avant / après ou solution A / solution B.",
    "Les contraintes à respecter : coût, délai, fiabilité, consommation, maintenabilité, compatibilité, sécurité… uniquement si elles sont pertinentes.",
    "Une échéance ou un jalon permettant de rendre l'objectif temporel.",
  ])}\n\n## À compléter avant validation\nRemplacez chaque « [à préciser] » par une valeur ou un critère réel fourni par l'entreprise. Julia ne doit pas inventer de seuil ou de délai à votre place.${continuityNote()}`;
}

function reformulate(input: FallbackInput) {
  if (input.projectType === 'ads') {
    return `## Intitulé proposé\n**Étude et sélection d'une solution pour répondre à la problématique technique décrite**\n\n## Problématique proposée\n**« Comment résoudre le problème observé dans l'entreprise tout en respectant les contraintes techniques, économiques et opérationnelles à préciser ? »**\n\nCette formulation est un canevas : remplacez « le problème observé » par le phénomène exact, sans inscrire d'emblée la solution dans la question.\n\n## Objectif principal\nIdentifier, comparer et valider une solution répondant au problème à partir d'une démarche scientifique argumentée.\n\n## Version courte pour une fiche de validation\nL'étude part d'un problème observé dans l'entreprise. Après caractérisation de la situation de départ, un état de l'art permettra d'identifier plusieurs solutions envisageables. Ces solutions seront comparées selon des critères objectifs adaptés aux contraintes du projet. La solution retenue sera ensuite mise en œuvre ou expérimentée et évaluée à l'aide d'un protocole de validation permettant de conclure par rapport aux objectifs fixés.\n\n## Ce que cette reformulation améliore\nElle replace la problématique avant la solution et fait apparaître la logique attendue d'une ADS : comprendre, rechercher, comparer, choisir, tester et conclure.${continuityNote()}`;
  }

  if (input.projectType === 'pfe') {
    return `## Intitulé proposé\n**Conception et pilotage d'une solution répondant à [besoin principal de l'entreprise]**\n\n## Problématique proposée\n**Comment répondre à [problématique complexe] en respectant [contraintes principales] et en assurant le pilotage du projet jusqu'à la validation des résultats ?**\n\n## Objectif principal\nConduire une mission à forte valeur ajoutée depuis l'analyse du besoin jusqu'à la livraison et l'évaluation des résultats, en mobilisant l'expertise ${specialtyLabel(input.specialty)} et les méthodes de gestion de projet pertinentes.\n\n## Version courte pour une fiche de validation\nLe projet vise à répondre à [besoin de l'entreprise] par l'analyse, la conception et la mise en œuvre d'une solution adaptée. L'étudiant assurera le pilotage des principales étapes, le suivi des contraintes, des ressources, des risques, des parties prenantes et des livrables pertinents, puis évaluera les résultats à l'aide d'indicateurs définis en amont.\n\n## Ce que cette reformulation améliore\nElle fait apparaître à la fois la problématique technique et la responsabilité de conduite de projet attendue au niveau ingénieur junior, sans inventer de missions qui n'existeraient pas réellement.${continuityNote()}`;
  }

  return `## Intitulé proposé\n**Étude et analyse de [procédé / technologie / méthode] dans le contexte de [activité de l'entreprise]**\n\n## Problématique proposée\n**Comment comprendre, analyser et formaliser [élément technique étudié] afin de répondre à [objectif de l'entreprise] ?**\n\n## Objectif principal\nApprofondir le sujet technique, articuler la théorie avec sa mise en œuvre dans l'entreprise et produire une restitution claire et exploitable.\n\n## Version courte pour une fiche de validation\nLe mémoire portera sur l'étude de [sujet technique]. Après présentation du contexte et des objectifs, l'étudiant recherchera les informations nécessaires, explicitera les concepts techniques associés, analysera la mise en œuvre observée dans l'entreprise et présentera les résultats, limites et enseignements de son étude.\n\n## Ce que cette reformulation améliore\nElle conserve le niveau attendu du mémoire technique et met l'accent sur l'analyse et la transmission d'un savoir, sans transformer artificiellement le sujet en projet de 4e ou 5e année.${continuityNote()}`;
}

function questions(input: FallbackInput) {
  if (input.projectType === 'ads') {
    return `## Problématique et état de l'art\n${bullet([
      "Quel problème précis l'entreprise cherche-t-elle à résoudre ?",
      "La problématique peut-elle être formulée avec « Comment » sans nommer la solution ?",
      "Quelles connaissances scientifiques ou techniques faut-il rechercher pour comprendre le problème ?",
      "Quelles sources sérieuses pourront alimenter l'état de l'art ?",
    ])}\n\n## Solutions et critères\n${bullet([
      "Existe-t-il réellement plusieurs solutions ou stratégies envisageables ?",
      "Quels critères objectifs permettront de les comparer ?",
      "Ces critères sont-ils définis avant le choix de la solution ?",
      "La solution finale pourra-t-elle être justifiée autrement que par une préférence ou une habitude de l'entreprise ?",
    ])}\n\n## Validation\n${bullet([
      "Quel protocole permettra de vérifier que la solution répond au problème ?",
      "Quelles mesures ou observations permettront de conclure ?",
      "Que fera-t-on si les résultats ne confirment pas l'hypothèse ou la solution retenue ?",
    ])}\n\n## Les réponses qui peuvent changer l'avis de Julia\nL'existence de plusieurs solutions réelles, la possibilité de les comparer objectivement et la possibilité de valider expérimentalement le choix sont les trois points les plus déterminants.${continuityNote()}`;
  }

  if (input.projectType === 'pfe') {
    return `## Niveau ingénieur et valeur ajoutée\n${bullet([
      "Quelle problématique complexe vous est réellement confiée ?",
      "Quelle part de conception, d'analyse ou d'arbitrage vous appartient ?",
      "Quelle valeur ajoutée scientifique ou technique apporterez-vous personnellement ?",
      "En quoi la mission dépasse-t-elle une simple exécution de tâches ?",
    ])}\n\n## Pilotage\n${bullet([
      "Quelles sont les grandes étapes et les livrables du projet ?",
      "Quelles parties prenantes devrez-vous coordonner ?",
      "Quels sont les principaux risques, contraintes et dépendances ?",
      "Quels indicateurs permettront de suivre coûts, délais, qualité ou avancement selon le contexte ?",
      "Existe-t-il un budget ou des ressources à gérer ?",
    ])}\n\n## Résultats et entreprise\n${bullet([
      "Comment les résultats seront-ils évalués ?",
      "Comment la mission contribue-t-elle aux enjeux ou à la stratégie de l'entreprise ?",
      "Quels impacts humains, organisationnels, techniques, économiques ou de développement durable doivent être pris en compte ?",
    ])}\n\n## Les réponses qui peuvent changer l'avis de Julia\nLe niveau réel d'autonomie, la responsabilité de pilotage et la valeur ajoutée technique sont les points les plus déterminants.${continuityNote()}`;
  }

  return `## Sujet technique\n${bullet([
    "Quel procédé, technologie, méthode ou équipement allez-vous approfondir ?",
    "Pourquoi ce sujet est-il utile à l'entreprise ?",
    "Quelles notions théoriques devez-vous comprendre pour l'expliquer correctement ?",
    "Quelles sources documentaires et humaines pourrez-vous exploiter ?",
  ])}\n\n## Analyse et restitution\n${bullet([
    "Quelle analyse personnelle allez-vous mener au-delà d'une simple description ?",
    "Quelles étapes de la mission seront présentées ?",
    "Quels résultats, écarts ou limites pourrez-vous discuter ?",
    "Quel livrable permettra de transmettre le savoir technique acquis ?",
  ])}\n\n## Les réponses qui peuvent changer l'avis de Julia\nLa profondeur d'analyse, la qualité des sources et la capacité à articuler théorie et pratique sont les points les plus déterminants.${continuityNote()}`;
}

function chat(input: FallbackInput) {
  const q = normalize(input.question ?? '');
  if (hasAny(q, ['smart', 'objectif', 'mesurable'])) return smart(input);
  if (hasAny(q, ['reformul', 'problématique', 'problematique', 'intitulé', 'intitule'])) return reformulate(input);
  if (hasAny(q, ['question', 'manque', 'préciser', 'preciser'])) return questions(input);
  if (hasAny(q, ['valid', 'adapté', 'adapte', 'conforme', 'avis', 'tenir la route'])) return analyze(input);

  const focus = input.projectType === 'ads'
    ? "Pour une ADS, raisonnez toujours dans l'ordre : problème → état de l'art → plusieurs solutions → critères objectifs → choix → validation."
    : input.projectType === 'pfe'
      ? "Pour un PFE, vérifiez simultanément le niveau technique, l'autonomie, la valeur ajoutée et le pilotage réel de la mission."
      : "Pour un mémoire technique, vérifiez surtout la profondeur d'analyse, les sources mobilisées et l'articulation entre théorie et pratique.";

  return `## Réponse de Julia\n${focus}\n\nÀ partir des seules informations fournies, je préfère ne pas inventer une réponse précise à votre question. Pour la trancher, revenez aux faits de la mission : ce que vous devez décider ou analyser, les éléments que vous pouvez comparer, les preuves disponibles et les responsabilités qui vous sont réellement confiées.\n\nSi votre question porte sur un élément concret du sujet, reformulez-la en indiquant l'option envisagée, la contrainte concernée ou le résultat que vous cherchez à démontrer ; Julia pourra alors vous aider sans supposer des informations absentes.${continuityNote()}`;
}

export function buildContinuityResponse(input: FallbackInput) {
  switch (input.action) {
    case 'analyze': return analyze(input);
    case 'smart': return smart(input);
    case 'reformulate': return reformulate(input);
    case 'questions': return questions(input);
    case 'chat': return chat(input);
  }
}
