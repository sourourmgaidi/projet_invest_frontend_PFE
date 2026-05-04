import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { FilterPanelComponent } from '../../../shared/filter-panel/filter-panel.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent,
    NotificationBellComponent,
    FilterPanelComponent
  ],
  templateUrl: 'services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  activeTab: 'collaboration' | 'investment' = 'collaboration';

  collaborationServices: any[] = [];
  investmentServices: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  dataReady = false;
  error: string | null = null;
  success: string | null = null;

  availableRegions: { id: number; name: string }[] = [];

  // ✅ NOUVEAU: Propriétés pour le diagnostic
  tokenDebug: { exists: boolean; keyName: string; value: string } = {
    exists: false,
    keyName: '',
    value: ''
  };

  get filterConfig() {
    return {
      showBudget: this.activeTab === 'investment',
      showRegion: true,
      showServiceType: false,
    };
  }

  get budgetMax(): number {
    return this.activeTab === 'investment' ? 10_000_000 : 500_000;
  }

  get budgetStep(): number {
    return this.activeTab === 'investment' ? 50_000 : 5_000;
  }

  private currentFilters: any = {};

  onFiltersChanged(filters: any): void {
    if (!this.dataReady) return;
    this.currentFilters = filters;
    this.applyFiltersAndSearch();
  }

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteCollabService = inject(FavoriteCollaborationService);
  private favoriteService = inject(FavoriteService);

  /**
   * ✅ CORRECTION: Récupération du token avec plusieurs clés possibles
   */
  private getHeaders(): HttpHeaders {
    // Essayez plusieurs clés possibles pour le token
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('access_token') ||
                  sessionStorage.getItem('auth_token') ||
                  sessionStorage.getItem('token') || '';
    
    console.log('🔑 [getHeaders] Token présent:', !!token);
    if (token) {
      console.log('🔑 [getHeaders] Token début:', token.substring(0, 50) + '...');
    }
    
    return new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  ngOnInit(): void {
    this.debugLocalStorage();
    this.loadAllServices();
  }

  /**
   * ✅ NOUVEAU: Fonction de debug pour voir ce qu'il y a dans localStorage
   */
  private debugLocalStorage(): void {
    console.log('========== DEBUG LOCALSTORAGE ==========');
    
    // Liste des clés possibles pour le token
    const possibleKeys = ['auth_token', 'token', 'access_token', 'jwt_token', 'id_token'];
    
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`✅ TROUVÉ: "${key}" = ${value.substring(0, 50)}...`);
        this.tokenDebug.exists = true;
        this.tokenDebug.keyName = key;
        this.tokenDebug.value = value.substring(0, 100);
      } else {
        console.log(`❌ Absent: "${key}"`);
      }
    }
    
    // Vérifier aussi sessionStorage
    console.log('--- SessionStorage ---');
    for (const key of possibleKeys) {
      const value = sessionStorage.getItem(key);
      if (value) {
        console.log(`✅ TROUVÉ dans sessionStorage: "${key}" = ${value.substring(0, 50)}...`);
      }
    }
    
    console.log('=========================================');
    
    // Afficher toutes les clés localStorage
    console.log('📦 Toutes les clés localStorage:', Object.keys(localStorage));
  }

  loadAllServices(): void {
    this.loading = true;
    this.dataReady = false;
    this.error = null;

    // ✅ DEBUG: Vérifier le token avant l'appel
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || '';
    
    console.log('🚀 [loadAllServices] Token avant appel:', !!token);
    console.log('🚀 [loadAllServices] URL collaboration:', 'http://localhost:8089/api/international-companies/services/collaboration');
    console.log('🚀 [loadAllServices] URL investment:', 'http://localhost:8089/api/international-companies/services/investment');

    const headers = this.getHeaders();
    
    const collab$ = this.http.get<any[]>(
      'http://localhost:8089/api/international-companies/services/collaboration',
      { headers }
    ).pipe(
      catchError(err => {
        console.error('❌ Erreur collaboration API:', err);
        console.error('❌ Status:', err.status);
        console.error('❌ Message:', err.message);
        if (err.status === 403) {
          console.error('❌ Erreur 403 = Token invalide ou rôle incorrect');
        }
        if (err.status === 401) {
          console.error('❌ Erreur 401 = Token manquant ou expiré');
        }
        return of([]);
      })
    );

    const invest$ = this.http.get<any[]>(
      'http://localhost:8089/api/international-companies/services/investment',
      { headers }
    ).pipe(
      catchError(err => {
        console.error('❌ Erreur investment API:', err);
        console.error('❌ Status:', err.status);
        return of([]);
      })
    );

    forkJoin({ collab: collab$, invest: invest$ }).subscribe({
      next: ({ collab, invest }) => {
        console.log('✅ Collaboration services reçus:', collab?.length || 0);
        console.log('✅ Investment services reçus:', invest?.length || 0);
        
        this.collaborationServices = collab || [];
        this.investmentServices = invest || [];

        if (this.collaborationServices.length === 0 && this.investmentServices.length === 0) {
          this.error = 'Aucun service disponible. Vérifiez votre token et vos droits.';
        }

        this.checkCollaborationFavorites();
        this.checkInvestmentFavorites();

        this.rebuildRegions();

        this.dataReady = true;
        this.applyFiltersAndSearch();

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement services:', err);
        this.error = `Impossible de charger les services: ${err.message || 'Erreur inconnue'}`;
        this.loading = false;
      }
    });
  }

  checkCollaborationFavorites(): void {
    if (!this.collaborationServices.length) return;
    
    this.collaborationServices.forEach(service => {
      this.favoriteCollabService.checkCompanyFavorite(service.id).subscribe({
        next: (res) => service.isFavorite = res.isFavorite,
        error: () => service.isFavorite = false
      });
    });
  }

  checkInvestmentFavorites(): void {
    if (!this.investmentServices.length) return;
    
    this.investmentServices.forEach(service => {
      this.favoriteService.checkCompanyFavorite(service.id).subscribe({
        next: (res) => service.isFavorite = res.isFavorite,
        error: () => service.isFavorite = false
      });
    });
  }

  switchTab(tab: 'collaboration' | 'investment'): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.currentFilters = {};
    this.rebuildRegions();
    this.applyFiltersAndSearch();
  }

  private rebuildRegions(): void {
    const source = this.activeTab === 'collaboration'
      ? this.collaborationServices
      : this.investmentServices;

    const set = new Set<string>();
    source.forEach(s => { if (s.region?.name) set.add(s.region.name); });
    this.availableRegions = Array.from(set).sort().map((name, i) => ({ id: i, name }));
  }

  private applyFiltersAndSearch(): void {
    const source = this.activeTab === 'collaboration'
      ? this.collaborationServices
      : this.investmentServices;

    let result = [...source];

    if (this.currentFilters.regionId != null) {
      const regionName = this.availableRegions.find(r => r.id === this.currentFilters.regionId)?.name;
      if (regionName) result = result.filter(s => s.region?.name === regionName);
    }

    if (this.activeTab === 'investment' && this.currentFilters.budget != null) {
      result = result.filter(s =>
        !s.minimumAmount || s.minimumAmount <= this.currentFilters.budget
      );
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      if (this.activeTab === 'collaboration') {
        result = result.filter(s =>
          [s.name, s.description, s.region?.name, s.contactPerson,
           s.collaborationType, s.activityDomain, s.expectedBenefits,
           s.provider?.firstName, s.provider?.lastName]
          .some(val => val && val.toString().toLowerCase().includes(q))
        );
      } else {
        result = result.filter(s =>
          [s.title, s.name, s.description, s.region?.name,
           s.economicSector?.name, s.contactPerson, s.zone,
           s.provider?.firstName, s.provider?.lastName,
           s.totalAmount?.toString()]
          .some(val => val && val.toString().toLowerCase().includes(q))
        );
      }
    }

    this.filtered = result;
  }

  onSearch(): void {
    this.applyFiltersAndSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFiltersAndSearch();
  }

  toggleFavorite(service: any): void {
    if (service.favoriteLoading) return;
    service.favoriteLoading = true;

    if (this.activeTab === 'collaboration') {
      if (service.isFavorite) {
        this.favoriteCollabService.removeCompanyFavorite(service.id).subscribe({
          next: () => {
            service.isFavorite = false;
            service.favoriteLoading = false;
            this.success = 'Service retiré des favoris';
            setTimeout(() => this.success = null, 3000);
          },
          error: () => service.favoriteLoading = false
        });
      } else {
        this.favoriteCollabService.addCompanyFavorite(service.id).subscribe({
          next: () => {
            service.isFavorite = true;
            service.favoriteLoading = false;
            this.success = 'Service ajouté aux favoris';
            setTimeout(() => this.success = null, 3000);
          },
          error: () => service.favoriteLoading = false
        });
      }
    } else {
      if (service.isFavorite) {
        this.favoriteService.removeCompanyFavorite(service.id).subscribe({
          next: () => {
            service.isFavorite = false;
            service.favoriteLoading = false;
            this.success = 'Service retiré des favoris';
            setTimeout(() => this.success = null, 3000);
          },
          error: () => service.favoriteLoading = false
        });
      } else {
        this.favoriteService.addCompanyFavorite(service.id).subscribe({
          next: () => {
            service.isFavorite = true;
            service.favoriteLoading = false;
            this.success = 'Service ajouté aux favoris';
            setTimeout(() => this.success = null, 3000);
          },
          error: () => service.favoriteLoading = false
        });
      }
    }
  }

  /**
   * ✅ Méthode utilitaire pour forcer la reconnexion (optionnel)
   */
  logoutAndRelogin(): void {
    console.log('🔄 Déconnexion recommandée...');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
}