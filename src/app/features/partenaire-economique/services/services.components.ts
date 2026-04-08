import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service'; 
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';

@Component({
  selector: 'app-economic-partner-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, NotificationBellComponent ,CurrencyConverterComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <!-- Header -->
          <div class="page-header">
            <div>
              <a routerLink="/partenaire-economique/dashboard" class="back-link">← Back to Dashboard</a>
              <h1>Collaboration Opportunities</h1>
              <p class="subtitle">All approved collaboration services available for you</p>
            </div>
            <div class="header-actions">
              <!-- ✅ LIEN VERS LES FAVORIS -->
              <a routerLink="/partenaire-economique/favorites-collaboration" class="favorites-link">
                <span>❤️</span> My Favorites
              </a>
              <app-notification-bell></app-notification-bell>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="search-wrapper">
            <div class="search-box">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearch()"
                placeholder="Search by name, description, type, region, contact, domain..."
                class="search-input"
              />
              <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">✕</button>
            </div>
            <span class="results-count" *ngIf="searchQuery">
              {{ filtered.length }} result{{ filtered.length !== 1 ? 's' : '' }} found
            </span>
          </div>

          <!-- Messages -->
          <div class="alert alert-success" *ngIf="success">
            ✅ {{ success }}
          </div>
          <div class="alert alert-error" *ngIf="error">
            ❌ {{ error }}
          </div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading services...</p>
          </div>

          <!-- Empty -->
          <div class="empty-state" *ngIf="!loading && filtered.length === 0">
            <div class="empty-icon">{{ searchQuery ? '🔍' : '🤝' }}</div>
            <h3>{{ searchQuery ? 'No results for "' + searchQuery + '"' : 'No collaboration services available yet' }}</h3>
            <p>{{ searchQuery ? 'Try different keywords' : 'Check back later for new opportunities' }}</p>
            <button class="clear-search-btn" *ngIf="searchQuery" (click)="clearSearch()">Clear search</button>
          </div>

          <!-- Services Grid -->
          <div class="services-grid" *ngIf="!loading && filtered.length > 0">
            <div class="service-card" *ngFor="let s of filtered">
              <div class="card-top">
                <span class="card-type">🤝 Collaboration</span>
                <span class="card-domain" *ngIf="s.activityDomain">{{ s.activityDomain }}</span>
              </div>
              <div class="card-body">
                <div class="card-header-row">
                  <h3>{{ s.name }}</h3>
                  <!-- ✅ BOUTON FAVORI -->
                  <button 
                    class="favorite-btn"
                    [class.is-favorite]="s.isFavorite"
                    (click)="toggleFavorite(s)"
                    [disabled]="s.favoriteLoading"
                    [title]="s.isFavorite ? 'Remove from favorites' : 'Add to favorites'"
                  >
                    <span class="heart">{{ s.isFavorite ? '❤️' : '🤍' }}</span>
                    <span class="loading-spinner" *ngIf="s.favoriteLoading"></span>
                  </button>
                </div>
                <p class="card-desc">{{ (s.description || '') | slice:0:120 }}{{ (s.description?.length || 0) > 120 ? '...' : '' }}</p>

                <!-- ✅ DOCUMENTS SECTION - AJOUTÉ ICI -->
               

                <div class="card-meta" *ngIf="s.region">
                  <span class="meta-label">📍 Region:</span>
                  <span>{{ s.region.name }}</span>
                </div>
                <div class="card-meta" *ngIf="s.collaborationType">
                  <span class="meta-label">🔗 Type:</span>
                  <span>{{ s.collaborationType }}</span>
                </div>
                <div class="card-meta" *ngIf="s.collaborationDuration">
                  <span class="meta-label">⏱ Duration:</span>
                  <span>{{ s.collaborationDuration }}</span>
                </div>
                <div class="card-meta" *ngIf="s.expectedBenefits">
                  <span class="meta-label">✨ Benefits:</span>
                  <span>{{ s.expectedBenefits | slice:0:60 }}...</span>
                </div>
                <div class="card-meta" *ngIf="s.contactPerson">
                  <span class="meta-label">👤 Contact:</span>
                  <span>{{ s.contactPerson }}</span>
                </div>
                <div class="card-meta" *ngIf="s.provider">
                  <span class="meta-label">🏢 Provider:</span>
                  <span>{{ s.provider.firstName }} {{ s.provider.lastName }}</span>
                </div>
                <div class="card-meta" *ngIf="s.address">
                  <span class="meta-label">🏠 Address:</span>
                  <span>{{ s.address }}</span>
                </div>
                <div class="card-meta" *ngIf="s.requestedBudget">
  <span class="meta-label">💰 Budget:</span>
  <span class="budget-value">{{ s.requestedBudget | number }} TND</span>
</div>
                <div class="currency-converter-wrap" *ngIf="s.requestedBudget">
  <app-currency-converter
    [initialAmount]="s.requestedBudget"
    [initialCurrency]="'TND'">
  </app-currency-converter>
</div>

                 <div class="documents-section" *ngIf="s.documents && s.documents.length > 0">
                  <h4 class="documents-title">📎 Documents ({{ s.documents.length }})</h4>
                  <div class="documents-grid">
                    <ng-container *ngFor="let doc of s.documents">
                      <!-- Images -->
                      <div class="document-item image-item" *ngIf="doc.fileType?.startsWith('image/')">
                        <img 
                          [src]="getImageUrl(doc)" 
                          class="document-thumbnail" 
                          alt="{{ doc.fileName }}"
                          (click)="openImage(doc)"
                          style="cursor: pointer"
                          [attr.data-document-id]="doc.id"
                        >
                        <span class="document-name">{{ doc.fileName }}</span>
                        <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        <span class="primary-badge-small" *ngIf="doc.isPrimary">⭐</span>
                      </div>
                      
                      <!-- PDF -->
                      <div class="document-item pdf-item" *ngIf="doc.fileType === 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📄</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                          <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        </a>
                      </div>
                      
                      <!-- Autres fichiers -->
                      <div class="document-item other-item" *ngIf="!doc.fileType?.startsWith('image/') && doc.fileType !== 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📎</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                          <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        </a>
                      </div>
                    </ng-container>
                  </div>
                </div>

                <!-- Contact Provider -->
                <div class="card-contact" *ngIf="s.provider">
                  <button class="contact-btn" (click)="contactProvider(s.provider)">
                    <span>💬</span> Contact Provider
                  </button>
                </div>
              </div>
              <div class="card-footer">
                <span class="availability-badge">{{ s.availability }}</span>
                <span class="price">{{ s.price | number }} TND</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ✅ MODAL POUR AFFICHER LES IMAGES EN GRAND - AJOUTÉ ICI -->
    <div class="image-modal" *ngIf="selectedImage" (click)="closeImage()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <span class="close" (click)="closeImage()">&times;</span>
        <img [src]="selectedImage.url" alt="{{ selectedImage.name }}">
        <div class="image-footer">
          <p class="image-name">{{ selectedImage.name }}</p>
          <button class="btn-download" (click)="downloadFile(selectedImage.doc)">
            <span class="btn-icon">📥</span> Télécharger
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .currency-converter-wrap {
  margin: 0.75rem 0;
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
}
    .page-layout { display: flex; min-height: 100vh; background: linear-gradient(135deg, #f8fafc, #f1f5f9); font-family: 'Inter', sans-serif; }
    app-navbar { width: 280px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; z-index: 100; }
    .page-main { flex: 1; padding: 2rem; overflow-y: auto; }
    .page-content { max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .back-link { display: inline-block; color: #7c3aed; font-size: 0.9rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; }
    .back-link:hover { color: #2563eb; }
    .header-actions { display: flex; align-items: center; gap: 1rem; }
    .favorites-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #fee; color: #ff6b6b; text-decoration: none; border-radius: 30px; font-size: 0.9rem; transition: all 0.3s ease; }
    .favorites-link:hover { background: #ff6b6b; color: white; transform: translateY(-2px); }
    h1 { font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 60px; height: 4px; background: linear-gradient(90deg, #7c3aed, #a855f7); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; margin: 0; }
    .alert { padding: 1rem; border-radius: 10px; margin-bottom: 1rem; }
    .alert-success { background: #d4edda; color: #155724; }
    .alert-error { background: #f8d7da; color: #721c24; }
    .search-wrapper { margin-bottom: 1.5rem; }
    .search-box { display: flex; align-items: center; gap: 0.75rem; background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.75rem 1.1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: border-color 0.2s, box-shadow 0.2s; }
    .search-box:focus-within { border-color: #7c3aed; box-shadow: 0 4px 16px rgba(124,58,237,0.12); }
    .search-icon { color: #94a3b8; flex-shrink: 0; }
    .search-input { flex: 1; border: none; outline: none; font-size: 0.95rem; color: #0f172a; background: transparent; }
    .search-input::placeholder { color: #94a3b8; }
    .clear-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 0.9rem; padding: 0 0.25rem; transition: color 0.2s; }
    .clear-btn:hover { color: #dc2626; }
    .results-count { display: block; margin-top: 0.5rem; font-size: 0.85rem; color: #64748b; padding-left: 0.25rem; }
    .loading-state, .empty-state { text-align: center; padding: 4rem; background: white; border-radius: 16px; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #0f172a; margin-bottom: 0.5rem; }
    .empty-state p { color: #64748b; margin-bottom: 1.5rem; }
    .clear-search-btn { padding: 0.6rem 1.4rem; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
    .service-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(124,58,237,0.12); }
    .card-top { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: linear-gradient(135deg, #7c3aed, #a855f7); }
    .card-type { color: white; font-size: 0.8rem; font-weight: 600; }
    .card-domain { color: rgba(255,255,255,0.85); font-size: 0.75rem; }
    .card-body { padding: 1.25rem; flex: 1; }
    .card-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; }
    .card-body h3 { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0; }
    .favorite-btn { background: transparent; border: 2px solid #ff6b6b; cursor: pointer; padding: 0.4rem; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; position: relative; }
    .favorite-btn.is-favorite { background: #ff6b6b; }
    .favorite-btn:hover:not(:disabled) { transform: scale(1.1); background: #fff1f1; }
    .favorite-btn.is-favorite:hover { background: #ff5252; }
    .heart { font-size: 1.2rem; }
    .favorite-btn.is-favorite .heart { color: white; }
    .favorite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading-spinner { width: 18px; height: 18px; border: 2px solid #ff6b6b; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; position: absolute; }
    .favorite-btn.is-favorite .loading-spinner { border-color: white; border-top-color: transparent; }
    .card-desc { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 1rem; }
    
    /* ✅ STYLES POUR LES DOCUMENTS - AJOUTÉS ICI */
    .documents-section { margin: 1rem 0; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
    .documents-title { font-size: 0.85rem; font-weight: 600; color: #0f172a; margin: 0 0 0.5rem; }
    .documents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; }
    .document-item { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .document-thumbnail { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
    .document-name { font-size: 0.7rem; color: #1e293b; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 0.2rem; }
    .document-size { font-size: 0.6rem; color: #64748b; }
    .document-link { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #334155; }
    .document-icon { font-size: 1.5rem; margin-bottom: 0.2rem; }
    .primary-badge-small { font-size: 0.7rem; margin-top: 0.1rem; }
    
    /* ✅ STYLES POUR LA MODAL IMAGE - AJOUTÉS ICI */
    .image-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .image-modal .modal-content { position: relative; max-width: 90vw; max-height: 90vh; background: white; border-radius: 8px; padding: 1rem; }
    .image-modal .close { position: absolute; top: 0; right: 10px; font-size: 2rem; color: #666; cursor: pointer; }
    .image-modal .close:hover { color: #000; }
    .image-modal img { max-width: 100%; max-height: 70vh; object-fit: contain; }
    .image-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
    .image-name { font-size: 0.9rem; color: #333; }
    .btn-download { padding: 0.4rem 1rem; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; }
    .btn-download:hover { background: #6d28d9; }
    
    .card-meta { display: flex; gap: 0.4rem; font-size: 0.83rem; margin-bottom: 0.3rem; color: #334155; }
    .meta-label { color: #94a3b8; font-weight: 500; flex-shrink: 0; min-width: 60px; }
    .card-contact { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
    .contact-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .contact-btn:hover { background: #7c3aed; color: white; border-color: #7c3aed; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.2); }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; border-top: 1px solid #f1f5f9; background: #fafafa; }
    .availability-badge { font-size: 0.75rem; font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 0.2rem 0.6rem; border-radius: 50px; }
    .price { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .services-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .header-actions { width: 100%; justify-content: flex-end; }
    }
  `]
})
export class EconomicPartnerServicesComponent implements OnInit {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // ✅ NOUVELLES PROPRIÉTÉS POUR LES IMAGES
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteCollaborationService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8089/api/collaboration-services/approved',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => { 
        this.services = data; 
        this.filtered = data; 
        this.checkFavoritesStatus();
        this.loading = false; 
      },
      error: () => { this.loading = false; }
    });
  }

  checkFavoritesStatus(): void {
    this.services.forEach(service => {
      this.favoriteService.checkPartnerFavorite(service.id).subscribe({
        next: (res) => {
          service.isFavorite = res.isFavorite;
        },
        error: () => {
          service.isFavorite = false;
        }
      });
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filtered = this.services; return; }
    this.filtered = this.services.filter(s => [
      s.name, s.description, s.collaborationType, s.activityDomain,
      s.expectedBenefits, s.collaborationDuration, s.contactPerson, s.address,
      s.availability, s.region?.name,
      s.provider?.firstName, s.provider?.lastName,
      s.price?.toString(), ...(s.requiredSkills || [])
    ].some(val => val && val.toString().toLowerCase().includes(q)));
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filtered = this.services;
  }

  toggleFavorite(service: any): void {
    if (service.favoriteLoading) return;
    
    service.favoriteLoading = true;
    
    if (service.isFavorite) {
      this.favoriteService.removePartnerFavorite(service.id).subscribe({
        next: () => {
          service.isFavorite = false;
          service.favoriteLoading = false;
          this.success = 'Service retiré des favoris';
          setTimeout(() => this.success = null, 3000);
        },
        error: (err) => {
          console.error('❌ Erreur retrait favori:', err);
          service.favoriteLoading = false;
        }
      });
    } else {
      this.favoriteService.addPartnerFavorite(service.id).subscribe({
        next: () => {
          service.isFavorite = true;
          service.favoriteLoading = false;
          this.success = 'Service ajouté aux favoris';
          setTimeout(() => this.success = null, 3000);
        },
        error: (err) => {
          console.error('❌ Erreur ajout favori:', err);
          service.favoriteLoading = false;
        }
      });
    }
  }

  contactProvider(provider: any): void {
    if (!provider?.email) return;
    const name = provider.firstName && provider.lastName
      ? `${provider.firstName} ${provider.lastName}` : 'Local Partner';
    this.router.navigate(['/messagerie'], {
      queryParams: { contact: provider.email, name }
    });
  }

  // ========================================
  // ✅ NOUVELLES MÉTHODES POUR LES DOCUMENTS
  // ========================================

  /**
   * Charger une image avec authentification
   */
  loadImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageLoading.has(docId)) {
      return;
    }
    
    this.imageLoading.add(docId);
    
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.imageBlobUrls.set(docId, url);
        this.imageLoading.delete(docId);
        console.log(`✅ Image ${doc.fileName} chargée avec succès`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image ${doc.fileName}:`, err);
        this.imageLoading.delete(docId);
      }
    });
  }

  /**
   * Obtenir l'URL d'une image (avec gestion du chargement)
   */
  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      return this.imageBlobUrls.get(docId)!;
    } else {
      this.loadImage(doc);
      return 'assets/images/loading-image.png';
    }
  }

  /**
   * Ouvrir une image en grand
   */
  openImage(doc: any): void {
    const docId = doc.id.toString();
    
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = {
        url: this.imageBlobUrls.get(docId)!,
        name: doc.fileName,
        doc: doc
      };
    } else {
      const token = localStorage.getItem('auth_token') || '';
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
        headers: headers,
        responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          this.imageBlobUrls.set(docId, url);
          this.selectedImage = {
            url: url,
            name: doc.fileName,
            doc: doc
          };
        },
        error: (err) => console.error('Erreur chargement image', err)
      });
    }
  }

  /**
   * Fermer l'image agrandie
   */
  closeImage(): void {
    this.selectedImage = null;
  }

  /**
   * Télécharger un fichier
   */
  downloadFile(doc: any): void {
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement', err)
    });
  }

  /**
   * Formater la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Nettoyer les URLs blob à la destruction du composant
   */
  ngOnDestroy(): void {
    this.imageBlobUrls.forEach(url => {
      window.URL.revokeObjectURL(url);
    });
    this.imageBlobUrls.clear();
  }
}