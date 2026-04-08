// region-services.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StatsService } from '../../../../core/services/stats.service';

export interface RegionServicesData {
  investmentServices: any[];
  collaborationServices: any[];
  touristServices: any[];
}

@Component({
  selector: 'app-region-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './region-services.component.html',
  styleUrls: ['./region-services.component.css']
})
export class RegionServicesComponent implements OnInit {
  @Input() regionName: string = '';
  @Input() regionId: number = 0;
  @Input() services: RegionServicesData | null = null;
  @Input() loading: boolean = false;
  @Output() close = new EventEmitter<void>();
  
  activeTab: 'investment' | 'collaboration' | 'tourist' = 'investment';
  selectedService: any = null;
  showDetail: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    console.log('🔍 RegionServicesComponent initialized');
    
    this.route.params.subscribe(params => {
      const id = params['id'];
      console.log('📌 Region ID from URL:', id);
      
      if (id && !this.regionId) {
        this.regionId = +id;
        this.loadRegionAndServices();
      } else if (this.services) {
        console.log('✅ Services already provided via @Input');
        this.loading = false;
      }
    });
  }

  loadRegionAndServices(): void {
    console.log('🔄 Loading region and services for ID:', this.regionId);
    this.loading = true;
    
    this.statsService.getRegionStats().subscribe({
      next: (regions) => {
        console.log('✅ Regions loaded:', regions?.length);
        const region = regions.find(r => r.id === this.regionId);
        if (region) {
          this.regionName = region.name;
          console.log('📍 Region name:', this.regionName);
        } else {
          this.regionName = 'Region';
        }
        this.loadServices();
      },
      error: (err) => {
        console.error('❌ Error loading regions:', err);
        this.loadServices();
      }
    });
  }

  loadServices(): void {
    const url = `http://localhost:8089/api/public/regions/${this.regionId}/services`;
    console.log('🌐 Fetching services from:', url);
    
    fetch(url)
      .then(response => {
        console.log('📡 Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ Services loaded:', data);
        this.services = {
          investmentServices: data.investmentServices || [],
          collaborationServices: data.collaborationServices || [],
          touristServices: data.touristServices || []
        };
        console.log('📊 Investment services:', this.services.investmentServices.length);
        console.log('📊 Collaboration services:', this.services.collaborationServices.length);
        console.log('📊 Tourist services:', this.services.touristServices.length);
        this.loading = false;
      })
      .catch(error => {
        console.error('❌ Error loading services:', error);
        this.loading = false;
      });
  }
  
  // ✅ MODIFIER POUR REDIRIGER VERS LA PAGE D'ACCUEIL (HOME)
  closePanel(): void {
    this.router.navigate(['/']);
  }
  
  // ========================================
  // ✅ NOUVELLES MÉTHODES DE FILTRAGE
  // ========================================

  /**
   * Filtrer pour ne garder que les services APPROVED
   */
  private filterApprovedServices(services: any[]): any[] {
    if (!services || services.length === 0) return [];
    return services.filter(service => service.status === 'APPROVED');
  }

  // ========================================
  // MÉTHODES MODIFIÉES AVEC FILTRAGE
  // ========================================

  getCurrentServices(): any[] {
    if (!this.services) return [];
    
    let services: any[] = [];
    switch (this.activeTab) {
      case 'investment':
        services = this.services.investmentServices || [];
        break;
      case 'collaboration':
        services = this.services.collaborationServices || [];
        break;
      case 'tourist':
        services = this.services.touristServices || [];
        break;
      default:
        return [];
    }
    
    // ✅ FILTRER UNIQUEMENT LES SERVICES APPROVED
    return this.filterApprovedServices(services);
  }
  
  selectTab(tab: 'investment' | 'collaboration' | 'tourist'): void {
    this.activeTab = tab;
    this.showDetail = false;
    this.selectedService = null;
  }
  
  viewServiceDetails(service: any): void {
    console.log('📋 Viewing service details:', service);
    this.selectedService = service;
    this.showDetail = true;
  }
  
  backToList(): void {
    this.showDetail = false;
    this.selectedService = null;
  }
  
  getInvestmentCount(): number {
    if (!this.services?.investmentServices) return 0;
    return this.filterApprovedServices(this.services.investmentServices).length;
  }
  
  getCollaborationCount(): number {
    if (!this.services?.collaborationServices) return 0;
    return this.filterApprovedServices(this.services.collaborationServices).length;
  }
  
  getTouristCount(): number {
    if (!this.services?.touristServices) return 0;
    return this.filterApprovedServices(this.services.touristServices).length;
  }
  
  getServiceType(service: any): string {
    if (this.activeTab === 'investment') return 'Investment Service';
    if (this.activeTab === 'collaboration') return 'Collaboration Service';
    return 'Tourist Service';
  }
  
  getServiceTitle(service: any): string {
    return service.title || service.name || 'Service';
  }
  
  getProviderName(service: any): string {
    if (service.provider) {
      if (service.provider.companyName) {
        return service.provider.companyName;
      }
      return `${service.provider.firstName || ''} ${service.provider.lastName || ''}`.trim() || 'N/A';
    }
    return 'N/A';
  }
  
  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return 'N/A';
    return amount.toLocaleString() + ' TND';
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}