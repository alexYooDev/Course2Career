/**
 * frontend/src/types/index.ts
 *
 * TypeScript interfaces that mirror the Pydantic models in
 * backend/src/models.py.  Keep both files in sync.
 */

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export interface Unit {
  unit_code: string;
  title: string;
  learning_outcomes: string[];
  content: string;
  credit_points: string;
  pre_requisite: string;
  study_period: string;
  year: string;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface Job {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  redirect_url: string;
  salary_min: number | null;
  salary_max: number | null;
  category: string;
  contract_type: string;
  contract_time: string;
}

export interface JobSearchParams {
  query: string;
  country?: string;
  where?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export interface RecommendationRequest {
  job_description: string;
  completed_units: string[];
  program: 'Bachelor' | 'Master';
  year_of_study: number;
  top_k: number;
}

export interface RecommendationResult {
  unit_code: string;
  title: string;
  score: number;
  matching_reason: string;
  gap_skills: string[];
  is_completed: boolean;
}

export interface RecommendationResponse {
  job_title: string;
  recommendations: RecommendationResult[];
  gap_analysis: string;
  total_units_analyzed: number;
}

// ---------------------------------------------------------------------------
// UI state (not mirrored in backend)
// ---------------------------------------------------------------------------

export type Program = 'Bachelor' | 'Master';

export interface UserState {
  program: Program;
  year_of_study: number;
  completed_units: Set<string>;
}
