// recommendation-agent.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface RecommendationRequest {
  userType: string;

  // ── Critères généraux ──────────────────────────────────────
  regionId?: number;
  activityDomain?: string;   // Enum ActivityDomain du back
  budget?: number;
  availability?: string;     // Enum Availability : IMMEDIATE | ON_DEMAND | UPCOMING

  // ── Touriste ───────────────────────────────────────────────
  groupSize?: number;
  preferredLanguages?: string[];
  targetAudience?: string;   // Enum TargetAudience : FAMILY | STUDENT | BUSINESS | TOURIST | VIP

  // ── Investisseur ───────────────────────────────────────────
  investmentHorizon?: string;
  preferredSector?: string;
  minimumReturn?: number;
  riskLevel?: string;        // low | medium | high
  projectDescription?: string;      // Description libre pour l'IA
  specificRequirements?: string;    // Contraintes spécifiques

  // ── Collaboration (Partenaire / Société Internationale) ────
  collaborationGoal?: string;
  offeredSkills?: string[];
  collaborationType?: string;  // Enum CollaborationType du back
  partnershipDuration?: string; // project | annual | multi_year | permanent
  partnerCriteria?: string;    // Critères du partenaire idéal

  // ── Société Internationale ─────────────────────────────────
  serviceTypeFilter?: string;  // COLLABORATION | INVESTMENT | '' (les deux)
  companyPresentation?: string;
  originCountry?: string;
  companySize?: string;        // startup | tpe | pme | grande
  strategicGoal?: string;      // market_entry | production | partnership | acquisition | r_and_d | other
  legalConstraints?: string;
}

export interface RecommendationResponse {
  service: any;
  score: number;
  aiExplanation: string;
  isAIScored: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecommendationAgentService {
  private readonly API_URL = 'http://localhost:8089/api/recommendations';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token ?? ''}`)
      .set('Content-Type', 'application/json');
  }

  getRecommendations(dto: RecommendationRequest): Observable<RecommendationResponse[]> {
    return this.http.post<RecommendationResponse[]>(this.API_URL, dto, {
      headers: this.getHeaders()
    });
  }
}