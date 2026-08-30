# Julia — julia-cesi

Julia est une application web de cadrage pédagogique pour trois travaux du cycle ingénieur :

- **Mémoire technique — 3e année**
- **ADS (Application de la démarche scientifique) — 4e année**
- **PFE (Projet de fin d’études) — 5e année**

Elle est prévue pour être déposée **manuellement sur GitHub**, puis connectée à **Vercel**. Aucun terminal n'est nécessaire pour le propriétaire du site.

## Ce que fait Julia

1. L'utilisateur choisit le type de travail et la spécialité (Informatique ou S3E).
2. Il colle un texte libre : mail, proposition de sujet, descriptif de mission, etc.
3. Julia donne un avis **qualitatif et argumenté**, sans note ni pourcentage.
4. Elle distingue ce qui relève d'une mauvaise formulation de ce qui relève d'une vraie faiblesse de la mission.
5. Elle peut ensuite :
   - rendre les objectifs plus SMART ;
   - reformuler l'intitulé, la problématique et une version courte de fiche de validation ;
   - proposer les questions à clarifier avant validation ;
   - répondre à des questions de suivi.

## Référentiel intégré

Le contexte pédagogique est écrit directement dans `lib/knowledge.ts`. Il a été construit à partir des documents fournis pour le projet :

- note pédagogique « Parcours en entreprise de l’apprenti ingénieur » (septembre 2025) ;
- grille d’évaluation PFE ;
- présentation pédagogique de l’ADS ;
- exemples réels anonymisés de retours pédagogiques sur des sujets ADS.

Aucun RAG, aucune base vectorielle et aucun PDF ne sont nécessaires en production. Le référentiel est injecté directement au modèle selon le type de travail et la spécialité choisis.

### Mémoire technique

Le contexte rappelle notamment : premier travail de synthèse en entreprise, analyse et formalisation d'un savoir-faire, recherche d'informations, articulation théorie/pratique et niveau de complexité correspondant à un technicien supérieur confirmé.

### ADS

Le contexte impose le raisonnement : problématique ouverte formulée avec « Comment… ? », analyse de l'existant, bibliographie/état de l'art, plusieurs solutions crédibles, critères objectifs de comparaison, sélection argumentée, réalisation puis protocole de validation. Julia est explicitement entraînée par des exemples à repérer les sujets où la solution est déjà décidée.

### PFE

Le contexte rappelle le niveau ingénieur junior, la mission complexe à forte valeur ajoutée, l'ancrage scientifique/technique et les dimensions de pilotage : WBS, parties prenantes, planning, indicateurs, livrables, budget, ressources, risques, communication et gestion des écarts.

### Spécialités

`lib/knowledge.ts` contient aussi deux blocs de cadrage pour **Informatique** et **S3E**. Ils sont volontairement présentés comme des guides d'ancrage et non comme des grilles officielles exhaustives.

## Déploiement sans terminal

### 1. Mettre le projet sur GitHub

1. Décompresser `julia-cesi.zip` sur votre ordinateur.
2. Créer un dépôt GitHub vide, par exemple `julia-cesi`.
3. Dans GitHub : **Add file → Upload files**.
4. Glisser-déposer **le dossier `julia-cesi` ou son contenu** dans la zone d'upload. GitHub sait conserver les sous-dossiers.
5. Vérifier que `package.json`, `app`, `components` et `lib` sont bien à la racine du dépôt (si GitHub a créé un dossier `julia-cesi` autour de tout, remonter son contenu à la racine).
6. Cliquer sur **Commit changes**.

### 2. Connecter le dépôt à Vercel

1. Dans Vercel : **Add New → Project**.
2. Importer le dépôt GitHub `julia-cesi`.
3. Vercel détecte automatiquement Next.js.
4. Ne changer aucune commande de build.
5. Cliquer sur **Deploy**.

En production sur Vercel, l'authentification AI Gateway peut utiliser automatiquement le jeton OIDC du projet : aucune clé API n'est écrite dans le dépôt.

### 3. Si Julia affiche que le modèle est indisponible

Pour les projets Vercel récents, OIDC est normalement fourni automatiquement. Si l'appel AI Gateway renvoie une erreur d'authentification :

1. ouvrir le projet dans Vercel ;
2. **Settings** ;
3. rechercher **OIDC** ;
4. activer **Secure Backend Access with OIDC Federation** ;
5. redéployer le projet.

Il peut également être nécessaire d'ouvrir une première fois la section **AI Gateway** du compte Vercel pour accepter/initialiser le service.

## Modèles et coût

Par défaut, `app/api/julia/route.ts` essaie uniquement des modèles affichés comme gratuits dans Vercel AI Gateway au moment de la création du projet :

1. `inclusionai/ling-3.0-flash-free`
2. `inclusionai/ling-3.0-tiny-free`
3. `poolside/laguna-s-2.1-free`

Si le premier modèle échoue, Julia essaie le suivant. **Aucun modèle payant n'est utilisé par défaut.**

La disponibilité et les conditions des modèles gratuits peuvent changer avec le temps. Pour changer de modèle sans modifier le code, ajouter dans Vercel une variable d'environnement :

- nom : `JULIA_MODEL`
- valeur : identifiant du modèle choisi dans AI Gateway

Attention : si vous indiquez un modèle payant dans `JULIA_MODEL`, les requêtes pourront devenir payantes.

## Confidentialité

Le traitement est effectué côté serveur via Vercel AI Gateway. L'interface affiche donc explicitement : **ne pas transmettre d'informations confidentielles ou sensibles de l'entreprise** et anonymiser les éléments nécessaires.

Le site n'enregistre pas les projets dans une base de données. Aucun compte utilisateur n'est créé par cette V1. Le texte est transmis à la fonction serveur uniquement pour obtenir la réponse de Julia.

## Structure du projet

```text
julia-cesi/
├── app/
│   ├── api/julia/route.ts       # appel serveur à l'IA
│   ├── globals.css              # design responsive
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── JuliaApp.tsx             # interface principale
│   └── SimpleMarkdown.tsx       # rendu léger des réponses
├── lib/
│   ├── knowledge.ts             # référentiel Mémoire / ADS / PFE / spécialités
│   ├── prompts.ts               # identité et missions de Julia
│   └── types.ts
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Logo CESI

Le site utilise directement l'URL demandée :

`https://raw.githubusercontent.com/julesh17/cesi-edt/refs/heads/main/static/cesi.png`

Elle est définie dans `components/JuliaApp.tsx`.

## Principe pédagogique important

Julia ne doit jamais produire une formule du type « 82 % conforme ». Les quatre formulations qualitatives prévues sont :

- **Sujet adapté**
- **Sujet adapté sous conditions**
- **Sujet à retravailler**
- **Sujet non adapté en l'état**

L'avis reste explicatif et révisable lorsque l'utilisateur apporte de nouvelles informations.
