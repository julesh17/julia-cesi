export type ProjectType = 'memoire' | 'ads' | 'pfe';
export type Specialty = 'informatique' | 's3e';
export type Audience = 'etudiant' | 'maitre' | 'pedagogie';
export type JuliaAction = 'analyze' | 'smart' | 'reformulate' | 'questions' | 'chat';

export interface JuliaRequest {
  action: JuliaAction;
  projectType: ProjectType;
  specialty: Specialty;
  audience: Audience;
  text: string;
  previousAnalysis?: string;
  question?: string;
}

export interface JuliaResponse {
  text: string;
  model?: string;
}
