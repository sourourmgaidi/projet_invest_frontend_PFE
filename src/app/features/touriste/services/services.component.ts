import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteTouristService } from '../../../core/services/favorite-tourist.service';
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';

@Component({
  selector: 'app-tourist-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, NotificationBellComponent , CurrencyConverterComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <!-- Header -->
          <div class="page-header">
            <div>
              <a routerLink="/touriste/dashboard" class="back-link">← Back to Dashboard</a>
              <h1>Tourist Services</h1>
              <p class="subtitle">Discover the best tourist experiences in Tunisia</p>
            </div>
            <app-notification-bell></app-notification-bell>
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
                placeholder="Search by name, description, category, region, contact..."
                class="search-input"
              />
              <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">✕</button>
            </div>
            <span class="results-count" *ngIf="searchQuery">
              {{ filtered.length }} result{{ filtered.length !== 1 ? 's' : '' }} found
            </span>
          </div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading services...</p>
          </div>

          <!-- Empty -->
          <div class="empty-state" *ngIf="!loading && filtered.length === 0">
            <div class="empty-icon">{{ searchQuery ? '🔍' : '🗺️' }}</div>
            <h3>{{ searchQuery ? 'No results for "' + searchQuery + '"' : 'No tourist services available yet' }}</h3>
            <p>{{ searchQuery ? 'Try different keywords' : 'Check back later for new experiences' }}</p>
            <button class="clear-search-btn" *ngIf="searchQuery" (click)="clearSearch()">Clear search</button>
          </div>

          <!-- Services Grid -->
          <div class="services-grid" *ngIf="!loading && filtered.length > 0">
            <div class="service-card" *ngFor="let s of filtered">
              <div class="card-top">
                <span class="card-type">🗺️ Tourism</span>
                <span class="card-category" *ngIf="s.category">{{ s.category }}</span>
              </div>
              <div class="card-body">
                <h3>{{ s.name }}</h3>
                <p class="card-desc">{{ (s.description || '') | slice:0:120 }}{{ (s.description?.length || 0) > 120 ? '...' : '' }}</p>

                <div class="card-meta" *ngIf="s.region">
                  <span class="meta-label">📍 Region:</span>
                  <span>{{ s.region.name }}</span>
                </div>
                <div class="card-meta" *ngIf="s.targetAudience">
                  <span class="meta-label">👥 Audience:</span>
                  <span>{{ s.targetAudience }}</span>
                </div>
                <div class="card-meta" *ngIf="s.durationHours">
                  <span class="meta-label">⏱ Duration:</span>
                  <span>{{ s.durationHours }}h</span>
                </div>
                <div class="card-meta" *ngIf="s.maxCapacity">
                  <span class="meta-label">👤 Max Capacity:</span>
                  <span>{{ s.maxCapacity }} persons</span>
                </div>
                <div class="card-meta" *ngIf="s.contactPerson">
                  <span class="meta-label">📞 Contact:</span>
                  <span>{{ s.contactPerson }}</span>
                </div>
                <div class="card-meta" *ngIf="s.provider">
                  <span class="meta-label">🏢 Provider:</span>
                  <span>{{ s.provider.firstName }} {{ s.provider.lastName }}</span>
                </div>
                <div class="card-meta" *ngIf="s.price">
  <span class="meta-label">👤 Person Price:</span>
  <span class="price">{{ s.price | number }} TND</span>
</div>
                <div class="card-meta" *ngIf="s.groupPrice">
                  <span class="meta-label">👨‍👩‍👧 Group Price:</span>
                  <span>{{ s.groupPrice | number }} TND</span>
                </div>
   
                <div class="card-meta" *ngIf="s.availableLanguages?.length">
                  <span class="meta-label">🌐 Languages:</span>
                  <span>{{ s.availableLanguages.join(', ') }}</span>
                </div>
                             <div class="currency-converter-wrap" *ngIf="s.price">
  <app-currency-converter
    [initialAmount]="s.price"
    [initialCurrency]="'TND'">
  </app-currency-converter>
</div>

                <!-- ✅ SECTION DOCUMENTS - AJOUTÉE ICI -->
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
                          loading="lazy"
                        >
                        <span class="document-name">{{ doc.fileName }}</span>
                        <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        <span class="primary-badge-small" *ngIf="doc.isPrimary">⭐</span>
                      </div>
                      
                      <!-- PDF -->
                      <div class="document-item" *ngIf="doc.fileType === 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📄</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                          <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        </a>
                      </div>
                      
                      <!-- Autres fichiers -->
                      <div class="document-item" *ngIf="!doc.fileType?.startsWith('image/') && doc.fileType !== 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📎</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                          <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                        </a>
                      </div>
                    </ng-container>
                  </div>
                </div>

                <!-- ✅ Bouton Contact Provider -->
                <div class="card-contact" *ngIf="s.provider">
                  <button class="contact-btn" (click)="contactProvider(s.provider)">
                    <span>💬</span> Contact Provider
                  </button>
                </div>
              </div>
              
              <!-- ✅ Card Footer avec bouton favori et prix -->
              <div class="card-footer">
                <div class="footer-left">
                  <span class="availability-badge">{{ s.availability }}</span>
                </div>
                <div class="footer-right">
                  
                  <button class="favorite-btn" 
                          [class.favorite]="isFavorite(s.id)"
                          (click)="toggleFavorite(s, $event)"
                          [disabled]="loadingFavorites"
                          title="{{ isFavorite(s.id) ? 'Retirer des favoris' : 'Ajouter aux favoris' }}">
                    <span class="favorite-icon">{{ isFavorite(s.id) ? '❤️' : '🤍' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ✅ IMAGE MODAL - AJOUTÉE ICI -->
    <div class="image-modal" *ngIf="selectedImage" (click)="closeImage()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <span class="close" (click)="closeImage()">&times;</span>
        <img [src]="selectedImage.url" [alt]="selectedImage.name">
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
    .back-link { display: inline-block; color: #059669; font-size: 0.9rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; }
    .back-link:hover { color: #047857; }
    h1 { font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 60px; height: 4px; background: linear-gradient(90deg, #059669, #10b981); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; margin: 0; }
    .search-wrapper { margin-bottom: 1.5rem; }
    .search-box { display: flex; align-items: center; gap: 0.75rem; background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.75rem 1.1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: border-color 0.2s, box-shadow 0.2s; }
    .search-box:focus-within { border-color: #059669; box-shadow: 0 4px 16px rgba(5,150,105,0.12); }
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
    .clear-search-btn { padding: 0.6rem 1.4rem; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; }
    .service-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(5,150,105,0.12); }
    .card-top { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: linear-gradient(135deg, #059669, #10b981); }
    .card-type { color: white; font-size: 0.8rem; font-weight: 600; }
    .card-category { color: rgba(255,255,255,0.85); font-size: 0.75rem; }
    .card-body { padding: 1.25rem; flex: 1; }
    .card-body h3 { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0 0 0.6rem; }
    .card-desc { font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 1rem; }
    .card-meta { display: flex; gap: 0.4rem; font-size: 0.83rem; margin-bottom: 0.3rem; color: #334155; }
    .meta-label { color: #94a3b8; font-weight: 500; flex-shrink: 0; min-width: 65px; }
    .card-contact { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
    .contact-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .contact-btn:hover { background: #059669; color: white; border-color: #059669; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.2); }
    .card-footer { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 0.85rem 1.25rem; 
      border-top: 1px solid #f1f5f9; 
      background: #fafafa;
    }
    .footer-left { display: flex; align-items: center; }
    .footer-right { 
      display: flex; 
      align-items: center; 
      gap: 0.75rem;
    }
    .availability-badge { 
      font-size: 0.75rem; 
      font-weight: 600; 
      color: #059669; 
      background: #ecfdf5; 
      padding: 0.2rem 0.6rem; 
      border-radius: 50px; 
    }
    .price { 
      font-size: 0.95rem; 
      font-weight: 700; 
      color: #0f172a; 
    }
    .favorite-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.5rem;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .favorite-btn:hover {
      transform: scale(1.1);
      background: #fef2f2;
    }
    .favorite-btn.favorite {
      color: #ef4444;
    }
    .favorite-btn.favorite:hover {
      background: #fee2e2;
    }
    .favorite-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .favorite-icon {
      display: inline-block;
      transition: transform 0.2s;
    }
    .favorite-btn:hover .favorite-icon {
      transform: scale(1.2);
    }

    /* ✅ DOCUMENTS SECTION - AJOUTÉ */
    .documents-section {
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .documents-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.75rem;
    }

    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.5rem;
    }

    .document-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.5rem;
      text-align: center;
      transition: all 0.2s;
      position: relative;
    }

    .image-item {
      cursor: pointer;
    }

    .image-item:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .document-thumbnail {
      width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 0.25rem;
      background: #f1f5f9;
    }

    .document-name {
      display: block;
      font-size: 0.7rem;
      color: #4a5568;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .document-size {
      font-size: 0.65rem;
      color: #718096;
    }

    .primary-badge-small {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 0.7rem;
      background: rgba(245, 158, 11, 0.2);
      padding: 2px 4px;
      border-radius: 4px;
    }

    .document-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: #2d3748;
    }

    .document-link:hover {
      color: #059669;
    }

    .document-icon {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }

    /* ✅ IMAGE MODAL - AJOUTÉ */
    .image-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .image-modal .modal-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      background: white;
      border-radius: 8px;
      padding: 1rem;
    }

    .image-modal img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 4px;
    }

    .image-modal .close {
      position: absolute;
      top: 0;
      right: 10px;
      color: #666;
      font-size: 2rem;
      cursor: pointer;
      transition: color 0.2s;
      z-index: 10;
    }

    .image-modal .close:hover {
      color: #000;
    }

    .image-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e2e8f0;
    }

    .image-name {
      font-size: 0.9rem;
      color: #333;
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-download {
      background: #4299e1;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s;
    }

    .btn-download:hover {
      background: #3182ce;
    }

    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .services-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .documents-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
      .image-footer { flex-direction: column; gap: 1rem; align-items: flex-start; }
    }
  `]
})
export class TouristServicesComponent implements OnInit {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LES FAVORIS
  favoriteStatus: Map<number, boolean> = new Map();
  loadingFavorites = false;
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LES IMAGES
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();
  
  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteTouristService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    
    this.http.get<any[]>('http://localhost:8089/api/tourist-services/approved',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        console.log('✅ Services reçus:', data);
        this.services = data;
        this.filtered = this.services;
        this.loading = false;
        
        // ✅ Charger les statuts des favoris après les services
        this.loadFavoriteStatus();
      },
      error: (err) => {
        console.error('❌ Erreur chargement services:', err);
        this.loading = false;
        this.services = [];
        this.filtered = [];
      }
    });
  }

  // ✅ Charger les statuts des favoris
  loadFavoriteStatus(): void {
    this.loadingFavorites = true;
    
    this.favoriteService.getFavorites().subscribe({
      next: (favorites) => {
        this.favoriteStatus.clear();
        favorites.forEach((service: any) => {
          this.favoriteStatus.set(service.id, true);
        });
        console.log('✅ Statuts des favoris chargés:', this.favoriteStatus.size);
        this.loadingFavorites = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement statuts favoris:', error);
        this.loadingFavorites = false;
      }
    });
  }

  // ✅ Vérifier si un service est en favori
  isFavorite(serviceId: number): boolean {
    return this.favoriteStatus.get(serviceId) || false;
  }

  // ✅ Basculer l'état favori
  toggleFavorite(service: any, event: Event): void {
    event.stopPropagation();
    
    const serviceId = service.id;
    const isFav = this.isFavorite(serviceId);
    
    if (isFav) {
      this.favoriteService.removeFavorite(serviceId).subscribe({
        next: (response) => {
          if (response.success) {
            this.favoriteStatus.set(serviceId, false);
            console.log(`💔 Service ${serviceId} retiré des favoris`);
            this.showNotification('Service retiré des favoris', 'info');
          }
        },
        error: (error) => {
          console.error('❌ Erreur retrait favori:', error);
          this.showNotification('Erreur lors du retrait des favoris', 'error');
        }
      });
    } else {
      this.favoriteService.addFavorite(serviceId).subscribe({
        next: (response) => {
          if (response.success) {
            this.favoriteStatus.set(serviceId, true);
            console.log(`❤️ Service ${serviceId} ajouté aux favoris`);
            this.showNotification('Service ajouté aux favoris', 'success');
          }
        },
        error: (error) => {
          console.error('❌ Erreur ajout favori:', error);
          this.showNotification('Erreur lors de l\'ajout aux favoris', 'error');
        }
      });
    }
  }

  // ✅ Afficher une notification
  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 9999;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { 
      this.filtered = this.services; 
      return; 
    }
    this.filtered = this.services.filter(s => [
      s.name, s.description, s.category, s.targetAudience,
      s.contactPerson, s.availability, s.region?.name,
      s.provider?.firstName, s.provider?.lastName,
      s.durationHours?.toString(), s.price?.toString(),
      ...(s.availableLanguages || []), ...(s.includedServices || [])
    ].some(val => val && val.toString().toLowerCase().includes(q)));
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filtered = this.services;
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
  // ✅ MÉTHODES POUR LES DOCUMENTS
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
    
    const headers = this.getHeaders();
    
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.imageBlobUrls.set(docId, url);
        this.imageLoading.delete(docId);
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
      const headers = this.getHeaders();
      
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
    const headers = this.getHeaders();
    
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