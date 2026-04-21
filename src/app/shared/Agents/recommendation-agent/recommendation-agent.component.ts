import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { Role, CurrentUser } from '../../models/user.model';
import {
  RecommendationAgentService,
  RecommendationRequest,
  RecommendationResponse
} from '../../../core/services/recommendation-agent.service';
import jsPDF from 'jspdf';

const BLOCKED_ROLES: Role[] = [Role.ADMIN, Role.LOCAL_PARTNER];

@Component({
  selector: 'app-recommendation-agent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recommendation-agent.component.html',
  styleUrls: ['./recommendation-agent.component.css']
})
export class RecommendationAgentComponent implements OnInit {

  currentUser: CurrentUser | null = null;
  userRole: Role | null = null;
  isBlocked = false;
  step: 'form' | 'loading' | 'results' = 'form';
  results: RecommendationResponse[] = [];
  errorMessage = '';
  loadingMessage = 'Chargement des candidats...';

  // ── Dark mode ──────────────────────────────────────────
  @HostBinding('class.ra-dark') isDark = false;

  toggleDark(): void {
    this.isDark = !this.isDark;
  }

  // ── Filtre & tri ───────────────────────────────────────
  activeTypeFilter: 'ALL' | 'AI' | 'RULES' | 'TOP' = 'ALL';
  sortMode: 'score_desc' | 'score_asc' | 'name_asc' | 'type' = 'score_desc';

  setTypeFilter(f: 'ALL' | 'AI' | 'RULES' | 'TOP'): void {
    this.activeTypeFilter = f;
  }

  onSortChange(): void { /* triggers getter */ }

  get countAI():    number { return this.results.filter(r => r.isAIScored).length; }
  get countRules(): number { return this.results.filter(r => !r.isAIScored).length; }
  get countTop():   number { return this.results.filter(r => r.score >= 7).length; }

  get filteredSortedResults(): RecommendationResponse[] {
    let filtered = [...this.results];

    switch (this.activeTypeFilter) {
      case 'AI':    filtered = filtered.filter(r => r.isAIScored);   break;
      case 'RULES': filtered = filtered.filter(r => !r.isAIScored);  break;
      case 'TOP':   filtered = filtered.filter(r => r.score >= 7);   break;
    }

    switch (this.sortMode) {
      case 'score_desc': filtered.sort((a, b) => b.score - a.score); break;
      case 'score_asc':  filtered.sort((a, b) => a.score - b.score); break;
      case 'name_asc':   filtered.sort((a, b) => this.getServiceName(a).localeCompare(this.getServiceName(b))); break;
      case 'type':       filtered.sort((a, b) => this.getServiceType(a).localeCompare(this.getServiceType(b))); break;
    }

    return filtered;
  }

  isTopMatch(item: RecommendationResponse): boolean {
    return item.score === Math.max(...this.results.map(r => r.score));
  }

  // ── Score ring (SVG dashoffset) ────────────────────────
  // stroke-dasharray = 2π×18 ≈ 113.1
  getRingOffset(score: number): number {
    return 113 - (score / 10) * 113;
  }

  // ── Score label ────────────────────────────────────────
  getScoreLabel(score: number): string {
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Très bon';
    if (score >= 5) return 'Correct';
    if (score >= 3) return 'Moyen';
    return 'Faible';
  }

  // ── Skeleton loading progress ──────────────────────────
  loadingStepIndex = 0;
  loadingPercent   = 0;

  form: RecommendationRequest = { userType: '' };
  skillTags: string[] = [];
  langTags: string[] = [];
  newSkill = '';
  newLang = '';

  regions: { id: number; name: string }[] = [];

  readonly loadingSteps = [
    'Chargement des candidats...',
    'Calcul des scores par règles métier...',
    'Analyse IA en cours (Ollama phi3)...',
    'Tri et sélection des meilleurs résultats...'
  ];

  readonly activityDomains = [
    { value: 'HOTEL',            label: '🏨 Hôtel' },
    { value: 'GUEST_HOUSE',      label: '🏡 Maison d\'hôtes' },
    { value: 'TRAVEL_AGENCY',    label: '✈️ Agence de voyage' },
    { value: 'TOUR_GUIDE',       label: '🗺️ Guide touristique' },
    { value: 'TRANSPORT',        label: '🚌 Transport' },
    { value: 'RESTAURANT',       label: '🍽️ Restauration' },
    { value: 'CRAFTS',           label: '🎨 Artisanat' },
    { value: 'TOURISM',          label: '🌴 Tourisme général' },
    { value: 'AGRICULTURE',      label: '🌾 Agriculture' },
    { value: 'AGRI_FOOD',        label: '🥫 Agroalimentaire' },
    { value: 'INDUSTRY',         label: '🏭 Industrie' },
    { value: 'MANUFACTURING',    label: '⚙️ Fabrication' },
    { value: 'TEXTILE',          label: '🧵 Textile' },
    { value: 'ENERGY',           label: '⚡ Énergie' },
    { value: 'RENEWABLE_ENERGY', label: '☀️ Énergie renouvelable' },
    { value: 'TECHNOLOGY',       label: '💻 Technologie' },
    { value: 'IT',               label: '🖥️ Informatique / IT' },
    { value: 'REAL_ESTATE',      label: '🏗️ Immobilier' },
    { value: 'CONSTRUCTION',     label: '🧱 Construction' },
    { value: 'TRADE',            label: '🛒 Commerce' },
    { value: 'SERVICES',         label: '🤝 Services' },
    { value: 'OTHER',            label: '➕ Autre' }
  ];

  readonly targetAudiences = [
    { value: 'FAMILY',   label: '👨‍👩‍👧 Famille' },
    { value: 'STUDENT',  label: '🎓 Étudiant' },
    { value: 'BUSINESS', label: '💼 Business' },
    { value: 'TOURIST',  label: '🧳 Touriste' },
    { value: 'VIP',      label: '⭐ VIP' }
  ];

  readonly collaborationTypes = [
    { value: 'PARTNERSHIP',             label: '🤝 Partenariat' },
    { value: 'JOINT_VENTURE',           label: '🏢 Co-entreprise (Joint Venture)' },
    { value: 'SUBCONTRACTING',          label: '📋 Sous-traitance' },
    { value: 'FRANCHISE',               label: '🏪 Franchise' },
    { value: 'LICENSING',               label: '📜 Licence' },
    { value: 'RESEARCH_COLLABORATION',  label: '🔬 Collaboration de recherche' },
    { value: 'DISTRIBUTION_AGREEMENT',  label: '🚚 Accord de distribution' },
    { value: 'SUPPLY_CHAIN',            label: '⛓️ Chaîne d\'approvisionnement' },
    { value: 'MARKETING_ALLIANCE',      label: '📣 Alliance marketing' },
    { value: 'TECHNICAL_COLLABORATION', label: '🔧 Collaboration technique' },
    { value: 'OTHER',                   label: '➕ Autre' }
  ];

  readonly availabilities = [
    { value: 'IMMEDIATE', label: '✅ Immédiat' },
    { value: 'ON_DEMAND', label: '📞 Sur demande' },
    { value: 'UPCOMING',  label: '🗓️ À venir' }
  ];

  readonly investmentHorizons = [
    { value: 'court terme', label: '⚡ Court terme (< 2 ans)' },
    { value: 'moyen terme', label: '📈 Moyen terme (2 – 5 ans)' },
    { value: 'long terme',  label: '🏗️ Long terme (> 5 ans)' }
  ];

  readonly riskLevels = [
    { value: 'low',    label: '🟢 Faible — Sécurité prioritaire' },
    { value: 'medium', label: '🟡 Modéré — Équilibre risque/rendement' },
    { value: 'high',   label: '🔴 Élevé — Maximiser le rendement' }
  ];

  readonly strategicGoals = [
    { value: 'market_entry', label: '🌍 Entrée sur le marché tunisien / africain' },
    { value: 'production',   label: '🏭 Délocalisation / Centre de production' },
    { value: 'partnership',  label: '🤝 Recherche de partenaires locaux' },
    { value: 'acquisition',  label: '💰 Acquisition d\'entreprises locales' },
    { value: 'r_and_d',      label: '🔬 Centre R&D / Innovation' },
    { value: 'other',        label: '➕ Autre' }
  ];

  readonly companySizes = [
    { value: 'startup', label: '🚀 Startup (< 10 employés)' },
    { value: 'tpe',     label: '🏪 TPE (10 – 50 employés)' },
    { value: 'pme',     label: '🏢 PME (50 – 250 employés)' },
    { value: 'grande',  label: '🏛️ Grande entreprise (> 250 employés)' }
  ];

  readonly partnershipDurations = [
    { value: 'project',    label: '📌 Par projet (ponctuel)' },
    { value: 'annual',     label: '📅 1 an' },
    { value: 'multi_year', label: '📆 Pluriannuel (> 2 ans)' },
    { value: 'permanent',  label: '♾️ Permanent / Indéfini' }
  ];

  constructor(
    private authService: AuthService,
    private recommendationService: RecommendationAgentService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.userRole    = this.authService.getUserRole();

    if (!this.userRole || BLOCKED_ROLES.includes(this.userRole)) {
      this.isBlocked = true;
      return;
    }

    this.http.get<any[]>('http://localhost:8089/api/regions').subscribe(r => this.regions = r);
    this.autoFillFromProfile();
  }

  getRegionName(id: number | undefined): string {
    if (!id) return '';
    const r = this.regions.find(reg => reg.id === id);
    return r ? r.name : `Région ${id}`;
  }

  private autoFillFromProfile(): void {
    if (!this.currentUser || !this.userRole) return;
    const u = this.currentUser as any;
    this.form.userType = this.userRole;

    switch (this.userRole) {
      case Role.INVESTOR:
        if (u.activitySector || u.secteurActivite) {
          this.form.preferredSector = u.activitySector || u.secteurActivite || '';
          this.form.activityDomain  = this.mapSectorToDomain(this.form.preferredSector ?? '');
        }
        this.form.investmentHorizon = 'long terme';
        break;
      case Role.TOURIST:
        this.form.targetAudience = 'TOURIST';
        this.form.groupSize = 1;
        break;
      case Role.PARTNER:
        if (u.activitySector || u.secteurActivite) {
          this.form.activityDomain = this.mapSectorToDomain(u.activitySector || u.secteurActivite);
        }
        if (u.companyName) {
          this.form.collaborationGoal = `${u.companyName} cherche des partenaires dans le secteur ${u.activitySector || ''}`.trim();
        }
        break;
      case Role.INTERNATIONAL_COMPANY:
        if (u.activitySector) {
          this.form.activityDomain  = this.mapSectorToDomain(u.activitySector);
          this.form.preferredSector = u.activitySector;
        }
        if (u.companyName) {
          this.form.collaborationGoal = `${u.companyName} (${u.originCountry || u.paysOrigine || ''}) recherche des opportunités`.trim();
        }
        if (!this.form.budget) this.form.budget = 100000;
        break;
    }
  }

  private mapSectorToDomain(sector: string): string {
    if (!sector) return '';
    const s = sector.toUpperCase();
    if (s.includes('TECH') || s.includes('DIGIT'))         return 'TECHNOLOGY';
    if (s.includes('INFORMAT') || s.includes('IT'))        return 'IT';
    if (s.includes('AGRO') || s.includes('ALIMENTAIRE'))   return 'AGRI_FOOD';
    if (s.includes('AGRI'))                                 return 'AGRICULTURE';
    if (s.includes('TOUR') || s.includes('HOSPITALI'))     return 'TOURISM';
    if (s.includes('HOTEL'))                                return 'HOTEL';
    if (s.includes('MANUFACTUR') || s.includes('FABRIC'))  return 'MANUFACTURING';
    if (s.includes('INDUS'))                                return 'INDUSTRY';
    if (s.includes('TEXTILE'))                              return 'TEXTILE';
    if (s.includes('RENOUV') || s.includes('SOLAIRE'))     return 'RENEWABLE_ENERGY';
    if (s.includes('ENERG'))                                return 'ENERGY';
    if (s.includes('IMMOB'))                                return 'REAL_ESTATE';
    if (s.includes('CONSTRU') || s.includes('BTP'))        return 'CONSTRUCTION';
    if (s.includes('COMMERC') || s.includes('TRADE'))      return 'TRADE';
    if (s.includes('SERVICE'))                              return 'SERVICES';
    return 'OTHER';
  }

  addSkill(value?: string): void {
    const val = (value || this.newSkill).trim();
    if (val && !this.skillTags.includes(val)) this.skillTags.push(val);
    this.newSkill = '';
  }

  removeSkill(tag: string): void { this.skillTags = this.skillTags.filter(t => t !== tag); }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); this.addSkill(); }
  }

  addLang(value?: string): void {
    const val = (value || this.newLang).trim();
    if (val && !this.langTags.includes(val)) this.langTags.push(val);
    this.newLang = '';
  }

  removeLang(tag: string): void { this.langTags = this.langTags.filter(t => t !== tag); }

  onLangKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); this.addLang(); }
  }

  get isInvestor():           boolean { return this.userRole === Role.INVESTOR; }
  get isTourist():            boolean { return this.userRole === Role.TOURIST; }
  get isPartner():            boolean { return this.userRole === Role.PARTNER || this.userRole === Role.INTERNATIONAL_COMPANY; }
  get isInternationalCompany(): boolean { return this.userRole === Role.INTERNATIONAL_COMPANY; }
  get isEconomicPartner():    boolean { return this.userRole === Role.PARTNER; }
  get wantsInvestment():      boolean { return this.form.serviceTypeFilter === 'INVESTMENT'; }
  get wantsCollaboration():   boolean { return !this.form.serviceTypeFilter || this.form.serviceTypeFilter === 'COLLABORATION'; }

  get roleLabel(): string {
    const labels: Partial<Record<Role, string>> = {
      [Role.INVESTOR]:             'Investisseur',
      [Role.TOURIST]:              'Touriste',
      [Role.PARTNER]:              'Partenaire Économique',
      [Role.INTERNATIONAL_COMPANY]:'Société Internationale'
    };
    return this.userRole ? (labels[this.userRole] || this.userRole) : '';
  }

  get roleIcon(): string {
    const icons: Partial<Record<Role, string>> = {
      [Role.INVESTOR]:             '📈',
      [Role.TOURIST]:              '🧳',
      [Role.PARTNER]:              '🤝',
      [Role.INTERNATIONAL_COMPANY]:'🌍'
    };
    return this.userRole ? (icons[this.userRole] || '👤') : '👤';
  }

  submit(): void {
    this.step = 'loading';
    this.errorMessage    = '';
    this.loadingStepIndex = 0;
    this.loadingPercent   = 0;

    const validTargetAudiences = ['FAMILY', 'STUDENT', 'BUSINESS', 'TOURIST', 'VIP'];
    const payload: RecommendationRequest = {
      ...this.form,
      targetAudience: this.form.targetAudience &&
                      validTargetAudiences.includes(this.form.targetAudience.toUpperCase())
                      ? this.form.targetAudience.toUpperCase() : undefined,
      offeredSkills:     this.skillTags.length ? this.skillTags : undefined,
      preferredLanguages: this.langTags.length ? this.langTags  : undefined
    };
    console.log('🔥 PAYLOAD:', payload);

    let idx = 0;
    const stepDuration = 900;
    const totalSteps   = this.loadingSteps.length;

    const interval = setInterval(() => {
      if (idx < totalSteps) {
        this.loadingMessage   = this.loadingSteps[idx];
        this.loadingStepIndex = idx;
        this.loadingPercent   = Math.round(((idx + 1) / totalSteps) * 90);
        idx++;
      }
    }, stepDuration);

    this.recommendationService.getRecommendations(payload).subscribe({
      next: (data: RecommendationResponse[]) => {
        clearInterval(interval);
        this.loadingPercent = 100;
        this.loadingStepIndex = totalSteps;
        setTimeout(() => {
          this.results  = data || [];
          this.step     = 'results';
          this.activeTypeFilter = 'ALL';
          this.sortMode = 'score_desc';
        }, 400);
      },
      error: (err: any) => {
        clearInterval(interval);
        console.error('❌ Erreur recommandations:', err);
        this.errorMessage = 'Le service de recommandation est temporairement indisponible.';
        this.results = [];
        this.step    = 'results';
      }
    });
  }

  reset(): void {
    this.step             = 'form';
    this.results          = [];
    this.errorMessage     = '';
    this.skillTags        = [];
    this.langTags         = [];
    this.form             = { userType: '' };
    this.activeTypeFilter = 'ALL';
    this.sortMode         = 'score_desc';
    this.autoFillFromProfile();
  }

  getScoreClass(score: number): string {
    if (score >= 7) return 'score-high';
    if (score >= 4) return 'score-mid';
    return 'score-low';
  }

  getBarColor(score: number): string {
    if (score >= 7) return '#1D9E75';
    if (score >= 4) return '#BA7517';
    return '#A32D2D';
  }

  getServiceName(item: RecommendationResponse): string {
    return item.service?.name || item.service?.title || 'Service';
  }

  getServiceType(item: RecommendationResponse): string {
    const s = item.service;
    if (!s) return '';
    if (s.type === 'TOURIST' || s.category)                                   return 'Service Touristique';
    if (s.type === 'INVESTMENT' || s.economicSector || s.minimumAmount != null) return "Opportunité d'investissement";
    if (s.type === 'COLLABORATION' || s.collaborationType || s.requiredSkills) return 'Service de Collaboration';
    return 'Service';
  }

  getFullServiceDetails(item: RecommendationResponse): { label: string; value: string }[] {
    const s = item.service;
    if (!s) return [];
    const details: { label: string; value: string }[] = [];

    if (s.name)              details.push({ label: 'Nom',          value: s.name });
    if (s.description)       details.push({ label: 'Description',  value: s.description });
    if (s.region?.name)      details.push({ label: 'Région',       value: s.region.name });
    if (s.availability)      details.push({ label: 'Disponibilité',value: this.formatAvailability(s.availability) });
    if (s.publicationDate)   details.push({ label: 'Date publication', value: s.publicationDate });
    if (s.contactPerson)     details.push({ label: 'Contact',      value: s.contactPerson });
    if (s.price != null)     details.push({ label: 'Prix',         value: `${s.price} DT` });
    if (s.groupPrice)        details.push({ label: 'Prix groupe',  value: `${s.groupPrice} DT` });
    if (s.category)          details.push({ label: 'Catégorie',    value: s.category });
    if (s.targetAudience)    details.push({ label: 'Audience',     value: this.formatTargetAudience(s.targetAudience) });
    if (s.durationHours)     details.push({ label: 'Durée',        value: `${s.durationHours} heures` });
    if (s.maxCapacity)       details.push({ label: 'Capacité max', value: `${s.maxCapacity}` });
    if (s.availableLanguages?.length) details.push({ label: 'Langues',   value: s.availableLanguages.join(', ') });
    if (s.includedServices?.length)   details.push({ label: 'Services inclus', value: s.includedServices.join(', ') });
    if (s.totalAmount)       details.push({ label: 'Montant total',  value: `${s.totalAmount} DT` });
    if (s.minimumAmount)     details.push({ label: 'Montant minimum',value: `${s.minimumAmount} DT` });
    if (s.deadlineDate)      details.push({ label: 'Date limite',   value: s.deadlineDate });
    if (s.projectDuration)   details.push({ label: 'Durée projet',  value: s.projectDuration });
    if (s.economicSector?.name) details.push({ label: 'Secteur',   value: s.economicSector.name });
    if (s.requestedBudget)   details.push({ label: 'Budget demandé',      value: `${s.requestedBudget} DT` });
    if (s.collaborationType) details.push({ label: 'Type collaboration',  value: this.formatCollaborationType(s.collaborationType) });
    if (s.activityDomain)    details.push({ label: 'Domaine',             value: this.formatActivityDomain(s.activityDomain) });
    if (s.expectedBenefits)  details.push({ label: 'Bénéfices attendus',  value: s.expectedBenefits });
    if (s.requiredSkills?.length) details.push({ label: 'Compétences',    value: s.requiredSkills.join(', ') });
    if (s.collaborationDuration) details.push({ label: 'Durée collaboration', value: s.collaborationDuration });
    if (s.address)           details.push({ label: 'Adresse',       value: s.address });

    return details;
  }

  private formatAvailability(a: string): string {
    const map: Record<string, string> = { IMMEDIATE: 'Immédiat', ON_DEMAND: 'Sur demande', UPCOMING: 'À venir' };
    return map[a] || a;
  }

  private formatTargetAudience(a: string): string {
    const map: Record<string, string> = { FAMILY: 'Famille', STUDENT: 'Étudiant', BUSINESS: 'Business', TOURIST: 'Touriste', VIP: 'VIP' };
    return map[a] || a;
  }

  private formatCollaborationType(t: string): string {
    const map: Record<string, string> = {
      PARTNERSHIP: 'Partenariat', JOINT_VENTURE: 'Joint Venture',
      SUBCONTRACTING: 'Sous-traitance', FRANCHISE: 'Franchise',
      LICENSING: 'Licence', RESEARCH_COLLABORATION: 'Recherche',
      DISTRIBUTION_AGREEMENT: 'Distribution', SUPPLY_CHAIN: 'Supply Chain',
      MARKETING_ALLIANCE: 'Marketing', TECHNICAL_COLLABORATION: 'Technique', OTHER: 'Autre'
    };
    return map[t] || t;
  }

  private formatActivityDomain(d: string): string {
    const found = this.activityDomains.find(a => a.value === d);
    return found ? found.label.replace(/^[^\s]+\s/, '') : d;
  }

  get userDisplayName(): string {
    if (!this.currentUser) return '';
    const u = this.currentUser as any;
    return u.prenom || u.firstName || u.nom || u.lastName || (this.currentUser as any).email?.split('@')[0] || '';
  }

  // ── PDF (identique à l'original) ──────────────────────
  // ═══════════════════════════════════════════════════════════════
// REMPLACER l'ancienne méthode downloadPDF() par celle-ci
// ═══════════════════════════════════════════════════════════════

downloadPDF(): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
 
    // ── Palette ────────────────────────────────────────────────
    const navy:      [number,number,number] = [12,  68, 124];
    const blue:      [number,number,number] = [24,  95, 165];
    const blueMid:   [number,number,number] = [55, 138, 221];
    const blueLight: [number,number,number] = [230,241,251];
    const success:   [number,number,number] = [29, 158, 117];
    const succLight: [number,number,number] = [234,243,222];
    const warn:      [number,number,number] = [186,117,  23];
    const warnLight: [number,number,number] = [250,238,218];
    const danger:    [number,number,number] = [163, 45,  45];
    const dangLight: [number,number,number] = [252,235,235];
    const textDark:  [number,number,number] = [ 26, 26,  46];
    const muted:     [number,number,number] = [107,114, 128];
    const border:    [number,number,number] = [229,231, 235];
    const bgGray:    [number,number,number] = [248,249, 252];
    const white:     [number,number,number] = [255,255, 255];
 
    const W = 210; const H = 297;
    const ML = 18; const MR = 18; const col = W - ML - MR;
    let y = 0;
 
    // ── Helpers ────────────────────────────────────────────────
    const ln = (h = 5) => { y += h; };
 
    const scoreColor = (s: number): [number,number,number] =>
      s >= 7 ? success : s >= 4 ? warn : danger;
    const scoreBg = (s: number): [number,number,number] =>
      s >= 7 ? succLight : s >= 4 ? warnLight : dangLight;
    const scoreLabel = (s: number): string => {
      if (s >= 8) return 'Excellent';
      if (s >= 7) return 'Tres bon';
      if (s >= 5) return 'Correct';
      if (s >= 3) return 'Moyen';
      return 'Faible';
    };
 
    // Supprime emojis et tout caractère hors Latin-1 (incompatible Helvetica/jsPDF)
    const clean = (str: string): string =>
      (str || '')
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u2600-\u27BF]/g, '')
        .replace(/[\uFE00-\uFE0F]/g, '')
        .replace(/[^\x00-\xFF]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
 
    const setFont = (style: 'bold'|'normal'|'italic', size: number, color: [number,number,number]) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
 
    const hrLine = (lx: number, ly: number, lw: number, thick = 0.3, c = border) => {
      doc.setDrawColor(...c); doc.setLineWidth(thick);
      doc.line(lx, ly, lx + lw, ly);
    };
 
    const roundRect = (
      rx: number, ry: number, rw: number, rh: number,
      fillC: [number,number,number]|null,
      strokeC: [number,number,number]|null = null,
      sw = 0.3, radius = 2
    ) => {
      if (fillC)   doc.setFillColor(...fillC);
      if (strokeC) { doc.setDrawColor(...strokeC); doc.setLineWidth(sw); }
      const mode = fillC && strokeC ? 'FD' : fillC ? 'F' : 'D';
      doc.roundedRect(rx, ry, rw, rh, radius, radius, mode);
    };
 
    const chip = (cx: number, cy: number, label: string, value: string): number => {
      const CHIP_H = 9; const CHIP_PAD = 3; const CHIP_MAX = 58;
      const lbl = clean(label); const val = clean(value);
      const tw = Math.min(doc.getTextWidth(`${lbl}: ${val}`) + CHIP_PAD * 2 + 2, CHIP_MAX);
      roundRect(cx, cy - 5.5, tw, CHIP_H, bgGray, border, 0.3, 2);
      setFont('bold', 5.5, muted);
      doc.text(lbl.toUpperCase(), cx + CHIP_PAD, cy - 1.5);
      setFont('normal', 6.5, textDark);
      const maxV = 22;
      doc.text(val.length > maxV ? val.substring(0, maxV - 1) + '.' : val, cx + CHIP_PAD, cy + 2.5);
      return tw + 2;
    };
 
    // ── Explication contextuelle et professionnelle ────────────
    // Remplace les explications vides ou génériques par une analyse réelle
    const buildExplanation = (item: RecommendationResponse): string => {
      const raw = clean(item.aiExplanation || '');
      const lower = raw.toLowerCase();
      const isGeneric =
        !raw ||
        raw.length < 25 ||
        lower.includes('score attribu') ||
        lower.includes('analyse ia') ||
        lower === 'score attribue par analyse ia.';
 
      if (!isGeneric) return raw;
 
      // Construction contextuelle à partir des données du service
      const s = item.service || {};
      const parts: string[] = [];
 
      const name   = clean(this.getServiceName(item));
      const type   = clean(this.getServiceType(item));
      const sc     = item.score;
      const region = clean(s.region?.name || '');
      const sector = clean(s.economicSector?.name || s.activityDomain || '');
      // Appel direct aux méthodes privées existantes du composant
      const collab = s.collaborationType ? clean(this.formatCollaborationTypePDF(s.collaborationType)) : '';
      const budget = s.requestedBudget
        ? `${s.requestedBudget} DT`
        : s.minimumAmount ? `${s.minimumAmount} DT` : '';
      const avail  = s.availability ? clean(this.formatAvailabilityPDF(s.availability)) : '';
 
      parts.push(`"${name}" est classe comme ${type}.`);
 
      if (sc >= 7) {
        parts.push(`Avec un score de ${sc}/10, ce service presente une forte adequation avec le profil.`);
      } else if (sc >= 4) {
        parts.push(`Un score de ${sc}/10 indique une adequation partielle ; certains criteres meritent verification.`);
      } else {
        parts.push(`Le score de ${sc}/10 reflete un ecart notable avec les criteres du profil defini.`);
      }
 
      if (region)  parts.push(`Localisation : ${region}.`);
      if (sector)  parts.push(`Secteur : ${sector}.`);
      if (collab)  parts.push(`Type de collaboration : ${collab}.`);
      if (budget)  parts.push(`Budget requis : ${budget}.`);
      if (avail)   parts.push(`Disponibilite : ${avail}.`);
 
      parts.push(item.isAIScored
        ? 'Score calcule par analyse semantique IA (modele Ollama phi3).'
        : 'Score etabli par application des regles metier configurees.');
 
      return parts.join(' ');
    };
 
    const footer = (page: number) => {
      hrLine(ML, H - 14, col, 0.3, border);
      setFont('normal', 6.5, muted);
      doc.text('InvestPlatform - Rapport confidentiel', ML, H - 9);
      doc.text(`Page ${page}`, W - MR, H - 9, { align: 'right' });
    };
 
    const newPage = () => {
      doc.addPage(); y = 22; footer(doc.getNumberOfPages());
    };
 
    const checkBreak = (need: number) => {
      if (y + need > H - 22) newPage();
    };
 
    // ══════════════════════════════════════════════════════════
    //  PAGE 1 — COUVERTURE
    // ══════════════════════════════════════════════════════════
    doc.setFillColor(...navy);
    doc.rect(0, 0, W, 5, 'F');
    y = 18;
 
    setFont('bold', 8, blue);
    doc.text('INVESTPLATFORM', ML, y); ln(7);
    hrLine(ML, y, col, 0.5, border); ln(10);
 
    setFont('bold', 22, textDark);
    doc.text('Rapport de Recommandations', ML, y); ln(10);
    setFont('normal', 10, muted);
    doc.text('Intelligence Artificielle & Regles Metier', ML, y); ln(14);
    hrLine(ML, y, col, 0.5, border); ln(10);
 
    // Métadonnées
    const aiCount   = this.results.filter(r => r.isAIScored).length;
    const ruleCount = this.results.length - aiCount;
    const topScore  = this.results.length > 0 ? Math.max(...this.results.map(r => r.score)) : 0;
    const topItem   = this.results.find(r => r.score === topScore);
    const topName   = clean(topItem ? this.getServiceName(topItem) : '-');
    const dateStr   = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
 
    const metaRows: string[][] = [
      ['DATE',        clean(dateStr),             'RESULTATS',  `${this.results.length} recommandations`],
      ['PROFIL',      clean(this.roleLabel),       'MEILLEUR',   `${topScore}/10 - ${topName}`],
      ['UTILISATEUR', clean(this.userDisplayName), 'SCORING IA', `${aiCount} IA / ${ruleCount} regles`],
    ];
    if (this.isInternationalCompany && this.form.serviceTypeFilter) {
      metaRows.push([
        'FILTRE',
        this.form.serviceTypeFilter === 'INVESTMENT'
          ? "Opportunites d'investissement" : 'Services de collaboration',
        '', ''
      ]);
    }
 
    const c1 = 24; const c3 = 26;
    metaRows.forEach((row, ri) => {
      setFont('bold', 7, muted);   doc.text(row[0], ML, y);
      setFont('normal', 8, textDark); doc.text(row[1], ML + c1, y);
      if (row[2]) {
        setFont('bold', 7, muted);    doc.text(row[2], ML + col / 2, y);
        setFont('normal', 8, textDark); doc.text(row[3], ML + col / 2 + c3, y);
      }
      if (ri < metaRows.length - 1) hrLine(ML, y + 3, col, 0.3, border);
      ln(8);
    });
    ln(6);
 
    // Synthèse
    const synthH = 30;
    roundRect(ML, y, col, synthH, blueLight, border, 0.3, 3);
    doc.setFillColor(...blue); doc.rect(ML, y, 3, synthH, 'F');
    setFont('bold', 7.5, blue);
    doc.text('SYNTHESE EXECUTIVE', ML + 8, y + 8);
    setFont('bold', 8.5, textDark);
    doc.text(`${this.results.length} recommandations  |  Meilleur score : ${topScore}/10  |  ${topName}`, ML + 8, y + 16);
    setFont('normal', 7.5, muted);
    doc.text(`Scores IA : ${aiCount}/${this.results.length}     Scores par regles metier : ${ruleCount}/${this.results.length}`, ML + 8, y + 23);
 
    footer(1); newPage();
 
    // ══════════════════════════════════════════════════════════
    //  PAGES RÉSULTATS
    // ══════════════════════════════════════════════════════════
    setFont('bold', 8, blue);
    doc.text('RECOMMANDATIONS', ML, y);
    doc.setDrawColor(...blue); doc.setLineWidth(0.8);
    doc.line(ML, y + 2, W - MR, y + 2);
    doc.setLineWidth(0.3); ln(12);
 
    this.results.forEach((item, i) => {
      const sc      = item.score;
      const isTop   = i === 0;
      const sCol    = scoreColor(sc);
      const sBg     = scoreBg(sc);
      const sLbl    = scoreLabel(sc);
      const details = this.getFullServiceDetails(item).slice(0, 8);
      const expl    = buildExplanation(item);
 
      // Calcul hauteur explication
      setFont('italic', 6.5, textDark);
      const explLines  = (doc.splitTextToSize(expl, col - 22) as string[]).length;
      const explBlockH = Math.max(14, explLines * 4.5 + 10);
 
      const chipsRows = Math.ceil(details.length / 3);
      const cardH = (isTop ? 10 : 0) + 46 + chipsRows * 14 + explBlockH + 12;
      checkBreak(cardH + 6);
 
      const cardTop    = y;
      const cardBorder = isTop ? success : border;
      const cardBW     = isTop ? 0.8 : 0.4;
 
      roundRect(ML, cardTop, col, cardH, white, cardBorder, cardBW, 3);
      doc.setFillColor(...(isTop ? success : ([210,218,230] as [number,number,number])));
      doc.rect(ML, cardTop, 3, cardH, 'F');
 
      y = cardTop + 8;
 
      // Badge meilleur match (sans emoji)
      if (isTop) {
        roundRect(ML + 7, y - 1, 42, 6, succLight, success, 0.4, 3);
        setFont('bold', 6, [6, 95, 70]);
        doc.text('>> MEILLEUR MATCH', ML + 10, y + 3);
        ln(9);
      }
 
      // Numéro + Nom
      setFont('bold', 9, muted);
      doc.text(i < 9 ? `0${i + 1}` : `${i + 1}`, ML + 7, y);
      setFont('bold', 11, textDark);
      doc.text(clean(this.getServiceName(item)), ML + 15, y);
 
      // Score box
      const sbX = W - MR - 24; const sbY = y - 7;
      roundRect(sbX, sbY, 22, 20, sBg, sCol, 0.5, 3);
      setFont('bold', 15, sCol);
      doc.text(`${sc}`, sbX + 11, sbY + 9, { align: 'center' });
      setFont('normal', 6.5, muted);
      doc.text('/10', sbX + 11, sbY + 14, { align: 'center' });
      setFont('bold', 5.5, sCol);
      doc.text(sLbl, sbX + 11, sbY + 18, { align: 'center' });
 
      ln(5);
      setFont('normal', 7.5, muted);
      doc.text(clean(this.getServiceType(item)), ML + 15, y); ln(7);
 
      // Barre score
      const barW = col - 14;
      doc.setFillColor(...border);
      doc.roundedRect(ML + 7, y, barW, 4, 2, 2, 'F');
      doc.setFillColor(...sCol);
      doc.roundedRect(ML + 7, y, (sc / 10) * barW, 4, 2, 2, 'F');
      ln(10);
 
      // Chips
      let cx = ML + 7;
      details.forEach((d, di) => {
        if (di > 0 && di % 3 === 0) { ln(13); cx = ML + 7; }
        cx += chip(cx, y, d.label, d.value);
      });
      ln(13);
 
      // Bloc explication
      checkBreak(explBlockH + 4);
      roundRect(ML + 7, y, col - 14, explBlockH, blueLight, null, 0, 2);
      doc.setFillColor(...blueMid);
      doc.rect(ML + 7, y, 2.5, explBlockH, 'F');
 
      setFont('bold', 6, blue);
      doc.text(item.isAIScored ? 'Analyse IA (Ollama phi3)' : 'Regles metier', ML + 13, y + 5);
 
      setFont('italic', 6.5, [30, 58, 95]);
      const wrappedExpl = doc.splitTextToSize(expl, col - 24) as string[];
      let ey = y + 10;
      const maxY = y + explBlockH - 3;
      wrappedExpl.forEach((line: string) => {
        if (ey < maxY) { doc.text(line, ML + 13, ey); ey += 4.5; }
      });
      ln(explBlockH + 4);
 
      // Tag source
      const tagLbl = item.isAIScored ? '[IA] Score par analyse semantique' : '[Regles] Score par regles metier';
      const tagCol = item.isAIScored ? blue : muted;
      const tagBg  = item.isAIScored ? blueLight : bgGray;
      const tagW   = Math.min(doc.getTextWidth(tagLbl) + 12, col - 14);
      roundRect(ML + 7, y - 1, tagW, 7, tagBg, tagCol, 0.4, 3);
      setFont('bold', 6.5, tagCol);
      doc.text(tagLbl, ML + 13, y + 3.5);
 
      y = cardTop + cardH + 8;
    });
 
    // Note méthodologique
    checkBreak(32); ln(4);
    hrLine(ML, y, col, 0.4, border); ln(7);
    setFont('bold', 7.5, muted);
    doc.text('NOTE METHODOLOGIQUE', ML, y); ln(6);
    setFont('normal', 7, muted);
    [
      "Ce rapport a ete genere automatiquement par le moteur de recommandation IA d'InvestPlatform.",
      'Les scores combinent regles metier (60%) et analyse semantique IA (40%) pour une recommandation optimale.',
      'Le modele IA utilise est Ollama phi3. Les resultats sont classes par pertinence decroissante.',
      'Les explications sont construites de facon contextuelle selon le profil et les caracteristiques du service.',
    ].forEach(line => { doc.text(line, ML, y); ln(5); });
 
    doc.save(`Rapport_Recommandations_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
 
  // ── Helpers PDF internes (noms distincts pour éviter les doublons) ──
  private formatAvailabilityPDF(a: string): string {
    const map: Record<string, string> = {
      IMMEDIATE: 'Immediat', ON_DEMAND: 'Sur demande', UPCOMING: 'A venir'
    };
    return map[a] || a;
  }
 
  private formatCollaborationTypePDF(t: string): string {
    const map: Record<string, string> = {
      PARTNERSHIP: 'Partenariat', JOINT_VENTURE: 'Joint Venture',
      SUBCONTRACTING: 'Sous-traitance', FRANCHISE: 'Franchise',
      LICENSING: 'Licence', RESEARCH_COLLABORATION: 'Recherche',
      DISTRIBUTION_AGREEMENT: 'Distribution', SUPPLY_CHAIN: 'Supply Chain',
      MARKETING_ALLIANCE: 'Marketing', TECHNICAL_COLLABORATION: 'Technique', OTHER: 'Autre'
    };
    return map[t] || t;
  }
}