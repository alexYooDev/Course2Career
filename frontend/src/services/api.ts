/**
 * frontend/src/services/api.ts
 *
 * Centralised Axios service layer.  All components and hooks make requests
 * through these functions — never directly via axios.
 *
 * The Vite dev proxy (vite.config.ts) forwards /api/* to localhost:8000,
 * so no base-URL configuration is needed in development.
 */

import axios from 'axios'
import type {
  Job,
  RecommendationRequest,
  RecommendationResponse,
  Unit,
} from '../types'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export const unitApi = {
  /** Fetch all units stored in ChromaDB. */
  getAll: (): Promise<Unit[]> =>
    http.get<Unit[]>('/units').then(r => r.data),

  /** Re-trigger ingestion of utils/*.json files. */
  ingest: (): Promise<{ ingested: number; total_in_db: number }> =>
    http.post('/units/ingest').then(r => r.data),
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const jobApi = {
  search: (
    query: string,
    options: { country?: string; where?: string; limit?: number } = {},
  ): Promise<Job[]> =>
    http
      .get<Job[]>('/jobs/search', {
        params: { query, ...options },
      })
      .then(r => r.data),
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export const recommendationApi = {
  get: (body: RecommendationRequest): Promise<RecommendationResponse> =>
    http.post<RecommendationResponse>('/recommendations', body).then(r => r.data),
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const healthApi = {
  check: (): Promise<{ status: string; units_in_db: number }> =>
    http.get('/health').then(r => r.data),
}
