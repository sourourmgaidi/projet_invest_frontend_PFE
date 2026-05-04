import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterConfig {
  showRegion?: boolean;
  showDomain?: boolean;
  showBudget?: boolean;
  showAvailability?: boolean;
  showCollaborationType?: boolean;
  showSector?: boolean;
  showCategory?: boolean;
  showTargetAudience?: boolean;
  showServiceType?: boolean;
  sortOptions?: { value: string; label: string }[];
}

export interface ActiveFilters {
  regionId?: number | null;
  regionName?: string;
  activityDomain?: string;
  budget?: number | null;
  availability?: string;
  collaborationType?: string;
  sector?: string;
  category?: string;
  targetAudience?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Region { id: number; name: string; }

export interface ServiceGroup {
  regionName: string;
  services: any[];
}

export function groupByRegion(services: any[], regionFiltered: boolean): ServiceGroup[] {
  if (!regionFiltered) {
    return [{ regionName: '', services }];
  }
  const map = new Map<string, any[]>();
  for (const s of services) {
    const name = s.region?.name || 'Unknown Region';
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(s);
  }
  return Array.from(map.entries()).map(([regionName, svcs]) => ({ regionName, services: svcs }));
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-panel">

      <button class="filter-toggle-btn" (click)="isCollapsed=!isCollapsed">
        ⚙️ Filters {{ isCollapsed ? '▼' : '▲' }}
      </button>

      <div *ngIf="!isCollapsed" class="filter-body">

        <!-- Service Type -->
        <div class="filter-item" *ngIf="config.showServiceType">
          <label>📂 Service Type</label>
          <select [(ngModel)]="filters.serviceType" (change)="emit()">
            <option value="">All</option>
            <option value="INVESTMENT">Investment</option>
            <option value="COLLABORATION">Collaboration</option>
          </select>
        </div>

        <!-- Region -->
        <div class="filter-item" *ngIf="config.showRegion">
          <label>📍 Region</label>
          <select [(ngModel)]="filters.regionId" (change)="emit()">
            <option [ngValue]="null">All</option>
            <option *ngFor="let r of regions" [ngValue]="r.id">{{r.name}}</option>
          </select>
        </div>

        <!-- Budget -->
        <div class="filter-item" *ngIf="config.showBudget">
          <label>💰 Budget max ({{ filters.budget | number }})</label>
          <input
            type="range"
            [(ngModel)]="filters.budget"
            [min]="0"
            [max]="budgetMax"
            [step]="budgetStep"
            (change)="emit()"
          />
          <input type="number" [(ngModel)]="filters.budget" (change)="emit()" />
        </div>

        <!-- Domain -->
        <div class="filter-item" *ngIf="config.showDomain">
          <label>🏭 Domain</label>
          <select [(ngModel)]="filters.activityDomain" (change)="emit()">
            <option value="">All</option>
            <option *ngFor="let d of activityDomains" [value]="d">{{d}}</option>
          </select>
        </div>

        <!-- Collaboration Type -->
        <div class="filter-item" *ngIf="config.showCollaborationType">
          <label>🔗 Type</label>
          <select [(ngModel)]="filters.collaborationType" (change)="emit()">
            <option value="">All</option>
            <option *ngFor="let c of collaborationTypes" [value]="c">{{c}}</option>
          </select>
        </div>

        <!-- Category -->
        <div class="filter-item" *ngIf="config.showCategory">
          <label>🗺️ Category</label>
          <select [(ngModel)]="filters.category" (change)="emit()">
            <option value="">All</option>
            <option *ngFor="let c of categories" [value]="c">{{c}}</option>
          </select>
        </div>

        <!-- Availability -->
        <div class="filter-item" *ngIf="config.showAvailability">
          <label>🕒 Availability</label>
          <select [(ngModel)]="filters.availability" (change)="emit()">
            <option value="">All</option>
            <option *ngFor="let a of availabilities" [value]="a">{{a}}</option>
          </select>
        </div>

        <!-- Audience -->
        <div class="filter-item" *ngIf="config.showTargetAudience">
          <label>👥 Audience</label>
          <select [(ngModel)]="filters.targetAudience" (change)="emit()">
            <option value="">All</option>
            <option *ngFor="let a of audiences" [value]="a">{{a}}</option>
          </select>
        </div>

        <!-- Reset button -->
        <button class="reset-btn" (click)="resetFilters()">🔄 Reset</button>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :host {
      --primary: #2f4f7f;
      --primary-dark: #1e3a5f;
      --secondary: #f2f2f2;
      --accent: #ffd700;
      --font: 'Inter', sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .filter-panel {
      margin-bottom: 1.5rem;
      width: 100%;
    }

    /* ==============================
       FILTER TOGGLE BUTTON
    ============================== */
    .filter-toggle-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1.5rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border: none;
      border-radius: 999px;
      color: white;
      font-weight: 700;
      font-size: 0.9rem;
      font-family: var(--font);
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 2px 8px rgba(47, 79, 127, 0.25);
    }

    .filter-toggle-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(47, 79, 127, 0.38);
    }

    /* ==============================
       FILTER BODY (GLASS CARD)
    ============================== */
    .filter-body {
      margin-top: 1rem;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-radius: 25px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 215, 0, 0.4);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    /* ==============================
       FILTER ITEM
    ============================== */
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-item label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    /* Select styles */
    .filter-item select {
      padding: 0.65rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 0.88rem;
      font-family: var(--font);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
      color: #1e293b;
      width: 100%;
      cursor: pointer;
    }

    .filter-item select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.08);
    }

    /* Input range styles */
    .filter-item input[type="range"] {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      background: #e2e8f0;
      border-radius: 2px;
      outline: none;
    }

    .filter-item input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: var(--primary);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .filter-item input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      background: var(--primary-dark);
    }

    /* Number input */
    .filter-item input[type="number"] {
      padding: 0.55rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 0.88rem;
      font-family: var(--font);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
      color: #1e293b;
      width: 100%;
      margin-top: 0.25rem;
    }

    .filter-item input[type="number"]:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.08);
    }

    /* Reset button */
    .reset-btn {
      grid-column: 1 / -1;
      justify-self: center;
      padding: 0.65rem 1.8rem;
      background: rgba(47, 79, 127, 0.1);
      border: 2px solid var(--primary);
      border-radius: 999px;
      color: var(--primary);
      font-weight: 700;
      font-size: 0.85rem;
      font-family: var(--font);
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }

    .reset-btn:hover {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(47, 79, 127, 0.2);
    }

    /* ==============================
       RESPONSIVE
    ============================== */
    @media (max-width: 768px) {
      .filter-body {
        grid-template-columns: 1fr;
        padding: 1rem;
        gap: 1rem;
      }

      .filter-toggle-btn {
        padding: 0.7rem 1.2rem;
        font-size: 0.85rem;
      }

      .filter-item label {
        font-size: 0.78rem;
      }

      .filter-item select,
      .filter-item input[type="number"] {
        padding: 0.55rem 0.85rem;
        font-size: 0.82rem;
      }

      .reset-btn {
        padding: 0.55rem 1.5rem;
        font-size: 0.8rem;
      }
    }
  `]
})
export class FilterPanelComponent implements OnInit, OnChanges {

  @Input() config: FilterConfig = {};
  @Input() regions: Region[] = [];
  @Input() services: any[] = [];
  @Input() budgetMax: number = 1000000;
  @Input() budgetStep: number = 1000;

  @Output() filtersChanged = new EventEmitter<ActiveFilters>();

  isCollapsed = true;

  private initialized = false;

  filters: ActiveFilters = {
    regionId: null,
    regionName: '',
    budget: null,
    sortOrder: 'asc'
  };

  activityDomains = [
    "HOTEL","GUEST_HOUSE","TRAVEL_AGENCY","TOUR_GUIDE","TRANSPORT","RESTAURANT",
    "CRAFTS","TOURISM","AGRICULTURE","AGRI_FOOD","INDUSTRY","MANUFACTURING",
    "TEXTILE","ENERGY","RENEWABLE_ENERGY","TECHNOLOGY","IT","REAL_ESTATE",
    "CONSTRUCTION","TRADE","SERVICES","OTHER"
  ];

  collaborationTypes = [
    "PARTNERSHIP","JOINT_VENTURE","SUBCONTRACTING","FRANCHISE","LICENSING",
    "RESEARCH_COLLABORATION","DISTRIBUTION_AGREEMENT","SUPPLY_CHAIN",
    "MARKETING_ALLIANCE","TECHNICAL_COLLABORATION","OTHER"
  ];

  categories = ["HOTEL","GUIDE","TRANSPORT","ACTIVITY","EVENT","RESTAURANT"];
  availabilities = ["IMMEDIATE","ON_DEMAND","UPCOMING"];
  audiences = ["INVESTOR","COMPANY","TOURIST","ALL"];

  ngOnInit(): void {
    setTimeout(() => { this.initialized = true; }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['regions'] && !changes['regions'].firstChange) {
      this.filters.regionId = null;
      this.filters.regionName = '';
    }
  }

  resetFilters(): void {
    this.filters = {
      regionId: null,
      regionName: '',
      budget: null,
      activityDomain: '',
      availability: '',
      collaborationType: '',
      category: '',
      targetAudience: '',
      serviceType: '',
      sortOrder: 'asc'
    };
    this.emit();
  }

  emit() {
    if (!this.initialized) return;
    this.filtersChanged.emit({ ...this.filters });
  }
}