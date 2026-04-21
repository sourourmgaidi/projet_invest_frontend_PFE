// investor-services.component.ts
import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteButtonComponent } from '../../../shared/favoritesInvestservice/favorite-button/favorite-button.component';
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';
import { AcquisitionService } from '../../../core/services/acquisition.service';
import { AuthService } from '../../../core/services/auth';
import { Role } from '../../../shared/models/user.model';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionModalComponent } from '../../../shared/models/subscription-modal.component';

@Component({
  selector: 'app-investor-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NavbarComponent,
    NotificationBellComponent,
    FavoriteButtonComponent,
    CurrencyConverterComponent,
    SubscriptionModalComponent
  ],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <!-- Header avec liens différents selon le rôle -->
          <div class="page-header">
            <div>
              <a [routerLink]="getBackLink()" class="back-link">← Back to Dashboard</a>
              <h1>{{ getPageTitle() }}</h1>
              <p class="subtitle">{{ getPageSubtitle() }}</p>
            </div>
            <div class="header-actions">
              <ng-container *ngIf="isInvestor">
                <a routerLink="/investisseur/favorites" class="favorites-link investor-fav">
                  <span>❤️</span> My Favorites
                </a>
                <a routerLink="/investisseur/my-requests" class="requests-link">
                  <span>📋</span> My Requests
                </a>
              </ng-container>
              
              <ng-container *ngIf="isInternationalCompany">
                <a routerLink="/societe-international/favorites" class="favorites-link intl-fav">
                  <span>⭐</span> My Favorites
                </a>
                <a routerLink="/societe-international/my-requests" class="requests-link intl-requests">
                  <span>🌍</span> My Requests
                </a>
              </ng-container>
              
              <app-notification-bell></app-notification-bell>
            </div>
          </div>

          <div class="alert alert-success" *ngIf="successMessage">
            ✅ {{ successMessage }}
          </div>
          <div class="alert alert-error" *ngIf="errorMessage">
            ❌ {{ errorMessage }}
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
                placeholder="Search by title, description, zone, region, contact, duration..."
                class="search-input"
              />
              <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">✕</button>
            </div>
            <span class="results-count" *ngIf="searchQuery">
              {{ filtered.length }} result{{ filtered.length !== 1 ? 's' : '' }} found
            </span>
          </div>

          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading services...</p>
          </div>

          <div class="empty-state" *ngIf="!loading && filtered.length === 0">
            <div class="empty-icon">{{ searchQuery ? '🔍' : '📈' }}</div>
            <h3>{{ searchQuery ? 'No results for "' + searchQuery + '"' : 'No investment services available yet' }}</h3>
            <p>{{ searchQuery ? 'Try different keywords' : 'Check back later for new opportunities' }}</p>
            <button class="clear-search-btn" *ngIf="searchQuery" (click)="clearSearch()">Clear search</button>
          </div>

          <!-- Services Grid -->
          <div class="services-grid" *ngIf="!loading && filtered.length > 0">
            <div class="service-card" *ngFor="let s of filtered">
              <div class="card-top" [ngClass]="{'investment-top': isInternationalCompany}">
                <span class="card-type">📈 Investment</span>
                <span class="card-zone" *ngIf="s.zone">{{ s.zone }}</span>
              </div>
              <div class="card-body">
                <div class="card-header-row">
                  <h3>{{ s.title || s.name }}</h3>
                  
                  <app-favorite-button 
                    *ngIf="isInvestor"
                    [serviceId]="s.id">
                  </app-favorite-button>
                  
                  <button 
                    *ngIf="isInternationalCompany"
                    class="favorite-btn-intl"
                    [class.is-favorite]="s.isFavorite"
                    (click)="toggleFavoriteIntl(s)"
                    [disabled]="s.favoriteLoading"
                    [title]="s.isFavorite ? 'Remove from favorites' : 'Add to favorites'">
                    <span class="star">{{ s.isFavorite ? '⭐' : '☆' }}</span>
                    <span class="loading-spinner" *ngIf="s.favoriteLoading"></span>
                  </button>
                </div>

                <p class="card-desc">{{ (s.description || '') | slice:0:120 }}{{ (s.description?.length || 0) > 120 ? '...' : '' }}</p>

                <div class="card-meta" *ngIf="s.region">
                  <span class="meta-label">📍 Region:</span>
                  <span>{{ s.region.name }}</span>
                </div>
                <div class="card-meta" *ngIf="s.totalAmount">
                  <span class="meta-label">💰 Total Amount:</span>
                  <span>{{ s.totalAmount | number }} TND</span>
                </div>
                <div class="card-meta" *ngIf="s.minimumAmount">
                  <span class="meta-label">📊 Min Investment:</span>
                  <span>{{ s.minimumAmount | number }} TND</span>
                </div>
                <div class="card-meta" *ngIf="s.deadlineDate">
                  <span class="meta-label">📅 Deadline:</span>
                  <span>{{ s.deadlineDate | date }}</span>
                </div>
                <div class="card-meta" *ngIf="s.projectDuration">
                  <span class="meta-label">⏱ Duration:</span>
                  <span>{{ s.projectDuration }}</span>
                </div>
                <div class="card-meta" *ngIf="s.contactPerson">
                  <span class="meta-label">👤 Contact:</span>
                  <span>{{ s.contactPerson }}</span>
                </div>
                <div class="card-meta" *ngIf="s.economicSector">
                  <span class="meta-label">🏭 Sector:</span>
                  <span>{{ s.economicSector.name }}</span>
                </div>
                <div class="card-meta" *ngIf="isInternationalCompany && s.provider">
                  <span class="meta-label">🏢 Provider:</span>
                  <span>{{ s.provider.firstName }} {{ s.provider.lastName }}</span>
                </div>

                <div class="currency-converter-wrap" *ngIf="s.totalAmount">
                  <app-currency-converter
                    [initialAmount]="s.totalAmount"
                    [initialCurrency]="'TND'">
                  </app-currency-converter>
                </div>

                <!-- Documents Section -->
                <div class="documents-section" *ngIf="s.documents && s.documents.length > 0">
                  <h4 class="documents-title">📎 Documents</h4>
                  <div class="documents-grid">
                    <div class="document-item image-item" *ngFor="let doc of s.images">
                      <img 
                        [src]="getImageUrl(doc)" 
                        class="document-thumbnail"
                        alt="{{ doc.fileName }}" 
                        (click)="openImage(doc)" 
                        loading="lazy">
                      <span class="document-name">{{ doc.fileName }}</span>
                      <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                    </div>
                    <div class="document-item" *ngFor="let doc of s.otherDocuments">
                      <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                        <span class="document-icon">📄</span>
                        <span class="document-name">{{ doc.fileName }}</span>
                        <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div class="card-contact" *ngIf="s.provider">
                  <button class="contact-btn" (click)="contactProvider(s.provider)">
                    <span>💬</span> Contact Provider
                  </button>
                </div>

                <!-- SECTION ACQUISITION STATUS (pour les deux rôles) -->
                <div class="card-status-section">
                  <!-- ⏳ En attente d'approbation -->
                  <div class="my-pending-card" *ngIf="s.isPendingApproval">
                    <div class="pending-header">
                      <span class="pending-icon">⏳</span>
                      <span class="pending-title">Request pending approval</span>
                    </div>
                    <p class="pending-message">Your request has been sent to the local partner. Waiting for their response...</p>
                    <button class="cancel-request-btn" 
                            (click)="cancelRequest(s)" 
                            [disabled]="cancellingRequests.get(s.id)">
                      <span *ngIf="!cancellingRequests.get(s.id)">✖ Cancel request</span>
                      <span *ngIf="cancellingRequests.get(s.id)" class="btn-loading">
                        <span class="dot-spinner"></span> Cancelling...
                      </span>
                    </button>
                  </div>

                  <!-- 💳 En attente de paiement -->
                  <div class="my-reservation-card" *ngIf="s.awaitingMyPayment">
                    <div class="reservation-header">
                      <span class="res-icon">⏳</span>
                      <span class="res-title">Approved — Payment pending</span>
                    </div>
                    <div class="reservation-timer" *ngIf="s.reservationExpiresAt">
                      <span class="timer-icon">⏰</span>
                      <span class="timer-text">{{ getRemainingTime(s.reservationExpiresAt) }}</span>
                    </div>
                    <button class="pay-btn" (click)="payNow(s)">
                      💳 Pay now — {{ s.amount | number }} TND
                    </button>
                    <button class="cancel-pending-btn" 
                            (click)="cancelRequest(s)" 
                            [disabled]="cancellingRequests.get(s.id)">
                      ✖ Cancel reservation
                    </button>
                  </div>

                  <!-- ✅ Déjà payé -->
                  <div class="my-taken-card" *ngIf="s.isMyAcquisition">
                    <span class="taken-icon">✅</span>
                    <div class="taken-info">
                      <span class="taken-text">You own this service</span>
                      <span class="taken-date" *ngIf="s.paidAt">
                        Paid on {{ s.paidAt | date:'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </div>

                  <!-- 🟡 Demande en cours par quelqu'un d'autre -->
                  <div class="pending-acquisition-card" 
                       *ngIf="s.status === 'PENDING_ACQUISITION' && !s.isPendingApproval && !s.awaitingMyPayment && !s.isMyAcquisition">
                    <div class="pending-acq-header">
                      <span class="pending-acq-icon">⏳</span>
                      <span class="pending-acq-title">Request in progress</span>
                    </div>
                    <p class="pending-acq-message">Another user has requested this service. Waiting for partner approval.</p>
                    <small class="pending-acq-note">The service will be available if the request is not approved.</small>
                  </div>

                  <!-- 🔴 Réservé par quelqu'un d'autre -->
                  <div class="reserved-by-other-card" 
                       *ngIf="s.status === 'RESERVED' && !s.awaitingMyPayment && !s.isPendingApproval && !s.isMyAcquisition">
                    <div class="reserved-header">
                      <span class="reserved-icon">🔒</span>
                      <span class="reserved-title">This service is currently reserved</span>
                    </div>
                    <p class="reserved-message">Another user has requested this service and it's pending payment.</p>
                    <small class="reserved-note">Please check back later or explore other opportunities.</small>
                  </div>

                  <!-- 🟢 APPROVED et disponible -->
                  <button class="take-btn"
                    *ngIf="s.status === 'APPROVED' && !s.isPendingApproval && !s.awaitingMyPayment && !s.isMyAcquisition"
                    (click)="takeService(s)"
                    [disabled]="s.takeLoading">
                    <span *ngIf="!s.takeLoading">🤝 Request this service</span>
                    <span *ngIf="s.takeLoading" class="btn-loading">
                      <span class="dot-spinner"></span> Sending...
                    </span>
                  </button>
                </div>

              </div>
              <div class="card-footer">
                <span class="availability-badge" [ngClass]="{'investment-badge': isInternationalCompany}">{{ s.availability }}</span>
                <span class="roi" *ngIf="isInternationalCompany && s.expectedROI">ROI: {{ s.expectedROI }}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- IMAGE MODAL -->
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
    @if (showSubscriptionModal) {
  <app-subscription-modal
    (closed)="showSubscriptionModal = false"
    (subscribed)="onSubscribed()">
  </app-subscription-modal>
}

  `,
  styles: [`
    /* ============================================ */
    /* LAYOUT PRINCIPAL */
    /* ============================================ */
    .page-layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    app-navbar {
      width: 280px;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      z-index: 100;
    }

    .page-main {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    .page-content {
      max-width: 1300px;
      margin: 0 auto;
    }

    .alert {
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      animation: slideIn 0.3s ease;
    }

    .alert-success {
      background: #d1fae5;
      border: 1px solid #34d399;
      color: #065f46;
    }

    .alert-error {
      background: #fee2e2;
      border: 1px solid #f87171;
      color: #991b1b;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .back-link {
      display: inline-block;
      color: #2563eb;
      font-size: 0.9rem;
      font-weight: 500;
      text-decoration: none;
      margin-bottom: 0.5rem;
    }

    .back-link:hover { color: #7c3aed; }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }

    h1::after {
      content: '';
      display: block;
      width: 60px;
      height: 4px;
      background: linear-gradient(90deg, #2563eb, #7c3aed);
      margin-top: 0.4rem;
      border-radius: 2px;
    }

    .subtitle { color: #64748b; margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 1rem; }

    .favorites-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .favorites-link.investor-fav { color: #dc3545; }
    .favorites-link.investor-fav:hover {
      background: #dc3545;
      color: white;
      border-color: #dc3545;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
    }

    .favorites-link.intl-fav { color: #f59e0b; }
    .favorites-link.intl-fav:hover {
      background: #f59e0b;
      color: white;
      border-color: #f59e0b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    }

    .requests-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .requests-link:hover {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }

    .requests-link.intl-requests:hover {
      background: #8b5cf6;
      border-color: #8b5cf6;
    }

    .search-wrapper { margin-bottom: 1.5rem; }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.75rem 1.1rem;
      transition: all 0.2s;
    }
    .search-box:focus-within {
      border-color: #2563eb;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.12);
    }
    .search-icon { color: #94a3b8; flex-shrink: 0; }
    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.95rem;
      background: transparent;
    }
    .clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }
    .clear-btn:hover { color: #dc2626; }
    .results-count {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 4rem;
      background: white;
      border-radius: 16px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
    }

    .service-card {
      background: white;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
    }
    .service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
    }
    .card-top.investment-top { background: linear-gradient(135deg, #7c3aed, #8b5cf6); }
    .card-type { color: white; font-size: 0.8rem; font-weight: 600; }
    .card-zone { color: rgba(255,255,255,0.85); font-size: 0.75rem; }

    .card-body { padding: 1.25rem; flex: 1; }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .card-header-row h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      flex: 1;
    }
    .card-desc {
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 1rem;
    }
    .card-meta {
      display: flex;
      gap: 0.4rem;
      font-size: 0.83rem;
      margin-bottom: 0.3rem;
      color: #334155;
    }
    .meta-label {
      color: #94a3b8;
      font-weight: 500;
      flex-shrink: 0;
      min-width: 105px;
    }

    .favorite-btn-intl {
      background: none;
      border: none;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: transform 0.2s;
    }
    .favorite-btn-intl:hover { transform: scale(1.1); }
    .favorite-btn-intl.is-favorite .star { color: #f59e0b; }
    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #e2e8f0;
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    .currency-converter-wrap {
      margin: 0.75rem 0;
      padding-top: 0.5rem;
      border-top: 1px dashed #e2e8f0;
    }

    .documents-section {
      margin-top: 1rem;
      padding: 0.75rem;
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
    }
    .image-item { cursor: pointer; }
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
    }
    .document-name {
      display: block;
      font-size: 0.7rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-contact {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px dashed #e2e8f0;
    }
    .contact-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .contact-btn:hover {
      background: #2563eb;
      color: white;
    }

    .card-status-section {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }

    .take-btn {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .take-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
    }
    .take-btn:disabled { opacity: 0.65; cursor: not-allowed; }

    .my-pending-card, .my-reservation-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 0.9rem;
    }
    .my-taken-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 10px;
      padding: 0.75rem 1rem;
    }
    .pending-acquisition-card, .reserved-by-other-card {
      padding: 0.9rem;
      border-radius: 10px;
      text-align: center;
    }
    .pending-acquisition-card {
      background: #fefce8;
      border: 1px solid #fde047;
    }
    .reserved-by-other-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .cancel-request-btn, .pay-btn, .cancel-pending-btn {
      width: 100%;
      padding: 0.6rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cancel-request-btn {
      background: #ef4444;
      color: white;
      border: none;
    }
    .pay-btn {
      background: #d97706;
      color: white;
      border: none;
    }
    .cancel-pending-btn {
      background: transparent;
      border: 1px solid #d97706;
      color: #d97706;
      margin-top: 0.5rem;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .availability-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #2563eb;
      background: #eff6ff;
      padding: 0.2rem 0.6rem;
      border-radius: 50px;
    }
    .availability-badge.investment-badge {
      background: #ede9fe;
      color: #7c3aed;
    }
    .roi {
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
      background: #d1fae5;
      padding: 0.2rem 0.6rem;
      border-radius: 50px;
    }

    .image-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .image-modal .modal-content { position: relative; max-width: 90%; max-height: 90%; }
    .image-modal img { max-width: 100%; max-height: 80vh; border-radius: 8px; }
    .image-modal .close {
      position: absolute;
      top: -40px;
      right: 0;
      color: white;
      font-size: 2rem;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .services-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .header-actions { width: 100%; justify-content: space-between; }
    }
  `]
})
export class InvestorServicesComponent implements OnInit, OnDestroy {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;

  isInvestor = false;
  isInternationalCompany = false;
  
  successMessage: string | null = null;
  errorMessage: string | null = null;

  private jwtPayload: any = null;
  private currentUserId: number | null = null;
  private currentUserEmail: string | null = null;

  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageUrls: Map<string, string> = new Map();
  maxConcurrentLoads = 5;
  imageQueue: { doc: any; docId: string }[] = [];
  isLoadingImages = false;
  
  cancellingRequests: Map<number, boolean> = new Map();
  allActiveReservations: Set<number> = new Set();
  showSubscriptionModal = false;
private subscriptionService = inject(SubscriptionService);
private pendingContactProvider: any = null;
  
  private http = inject(HttpClient);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private determineUserRole(): void {
    const userRole = this.authService.getUserRole();
    this.isInvestor = userRole === Role.INVESTOR;
    this.isInternationalCompany = userRole === Role.INTERNATIONAL_COMPANY;
    console.log('🎯 User role:', { isInvestor: this.isInvestor, isInternationalCompany: this.isInternationalCompany });
  }

  async ngOnInit(): Promise<void> {
    this.determineUserRole();
    this.loadServices();
  }

  ngOnDestroy(): void {
    this.imageUrls.forEach(url => { if (url.startsWith('blob:')) window.URL.revokeObjectURL(url); });
    this.imageUrls.clear();
  }

  getBackLink(): string {
    if (this.isInvestor) return '/investisseur/dashboard';
    if (this.isInternationalCompany) return '/societe-international/dashboard';
    return '/';
  }

  getPageTitle(): string {
    return this.isInvestor ? 'Investment Opportunities' : 'Investment Services';
  }

  getPageSubtitle(): string {
    return this.isInvestor ? 'All approved investment services available for you' : 'Discover investment opportunities with local partners';
  }

loadServices(): void {
  this.loading = true;
  
  // ✅ Les deux rôles utilisent le même endpoint
  const endpoint = 'http://localhost:8089/api/investment-services/available';
  
  this.http.get<any[]>(endpoint, { headers: this.getHeaders() }).subscribe({
    next: (data) => {
      this.services = data.map(service => ({
        ...service,
        id: Number(service.id),
        status: service.status || 'APPROVED'
      }));
      this.filtered = [...this.services];
      this.loading = false;
      this.prepareImageLoading();
      this.enrichWithAcquisitionStatus();
      this.loadActiveReservations();
      
      if (this.isInternationalCompany) {
        this.checkFavoritesStatusIntl();
      }
    },
    error: (err) => {
      console.error('❌ Error:', err);
      this.loading = false;
    }
  });
}

  checkFavoritesStatusIntl(): void {
    this.services.forEach(service => {
      this.http.get<{ isFavorite: boolean }>(
        `http://localhost:8089/api/international-companies/favorites/check/${service.id}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (res) => { service.isFavorite = res.isFavorite; service.favoriteLoading = false; },
        error: () => { service.isFavorite = false; service.favoriteLoading = false; }
      });
    });
  }

  toggleFavoriteIntl(service: any): void {
    if (service.favoriteLoading) return;
    service.favoriteLoading = true;
    
    const url = `http://localhost:8089/api/international-companies/favorites/${service.id}`;
    const request = service.isFavorite ? this.http.delete(url, { headers: this.getHeaders() }) : this.http.post(url, {}, { headers: this.getHeaders() });
    
    request.subscribe({
      next: () => {
        service.isFavorite = !service.isFavorite;
        service.favoriteLoading = false;
        this.successMessage = service.isFavorite ? 'Service ajouté aux favoris' : 'Service retiré des favoris';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        service.favoriteLoading = false;
        this.errorMessage = err.error?.error || 'Erreur';
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

enrichWithAcquisitionStatus(): void {
  this.acquisitionService.getMyServices().subscribe({
    next: (acquisitions) => {
      console.log('📋 Acquisitions reçues:', acquisitions);
      console.log('📋 Premier acq serviceId:', acquisitions[0]?.serviceId, typeof acquisitions[0]?.serviceId);
      console.log('📋 Premier service id:', this.services[0]?.id, typeof this.services[0]?.id);

      const investmentAcquisitions = acquisitions.filter(
        a => a.serviceType === 'INVESTMENT'
      );

      this.services.forEach(service => {
        service.isMyAcquisition = false;
        service.awaitingMyPayment = false;
        service.isPendingApproval = false;
        service.acquisitionId = null;
        service.amount = null;
        service.paymentUrl = null;
        service.reservationExpiresAt = null;
        service.paidAt = null;

        // ✅ Comparaison forcée en Number
        const acq = investmentAcquisitions.find(
          a => Number(a.serviceId) === Number(service.id)
        );

        if (acq) {
          console.log(`✅ Match trouvé - serviceId=${service.id} status=${acq.paymentStatus}`);
          switch(acq.paymentStatus) {
            case 'COMPLETED':
              service.isMyAcquisition = true;
              service.paidAt = acq.paidAt;
              service.status = 'TAKEN';
              break;
            case 'AWAITING_PAYMENT':
              service.awaitingMyPayment = true;
              service.amount = acq.amount;
              service.paymentUrl = acq.paymentUrl;
              service.acquisitionId = acq.id;
              service.reservationExpiresAt = acq.reservationExpiresAt;
              service.status = 'RESERVED';
              break;
            case 'PENDING_PARTNER_APPROVAL':
              service.isPendingApproval = true;
              service.acquisitionId = acq.id;
              service.status = 'PENDING_ACQUISITION';
              break;
          }
        } else {
          // ✅ Log pour voir pourquoi ça match pas
          console.log(`❌ Pas de match pour serviceId=${service.id}`, 
            investmentAcquisitions.map(a => `${a.serviceId}(${typeof a.serviceId})`));
        }
      });

      this.filtered = [...this.services];
      this.cdr.detectChanges();
    },
    error: (err) => console.error('❌ Acquisitions error:', err)
  });
}

  loadActiveReservations(): void {
    this.http.get<any[]>('http://localhost:8089/api/investment-services/reserved', { headers: this.getHeaders() })
      .subscribe({
        next: (reserved) => {
          this.allActiveReservations.clear();
          reserved.forEach(s => { if (s.status === 'RESERVED') this.allActiveReservations.add(s.id); });
        },
        error: () => {}
      });
  }

  takeService(service: any): void {
    service.takeLoading = true;
    
    this.acquisitionService.initiate({
      serviceType: 'INVESTMENT',
      serviceId: service.id,
      amount: Number(service.totalAmount || 0)
    }).subscribe({
      next: (res) => {
        service.takeLoading = false;
        this.successMessage = 'Request sent!';
        setTimeout(() => this.successMessage = null, 3000);
        this.loadServices();
      },
      error: (err) => {
        service.takeLoading = false;
        this.errorMessage = err.error?.error || err.message;
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

  payNow(service: any): void {
    if (service.paymentUrl) {
      window.open(service.paymentUrl, '_blank');
    } else {
      this.errorMessage = 'Payment link not available.';
      setTimeout(() => this.errorMessage = null, 3000);
    }
  }

  cancelRequest(service: any): void {
    if (!service.acquisitionId) {
      this.errorMessage = 'Cannot cancel';
      return;
    }

    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);

    this.acquisitionService.cancelRequest(service.acquisitionId, reason || 'Cancelled by user').subscribe({
      next: (res) => {
        this.cancellingRequests.delete(service.id);
        this.successMessage = 'Request cancelled';
        setTimeout(() => this.successMessage = null, 3000);
        this.loadServices();
      },
      error: (err) => {
        this.cancellingRequests.delete(service.id);
        this.errorMessage = err.error?.error || err.message;
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

  getRemainingTime(expiresAt: string): string {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
  }

  prepareImageLoading(): void {
    this.services.forEach(service => {
      service.images?.forEach((doc: any) => {
        const docId = doc.id.toString();
        if (!this.imageUrls.has(docId)) this.imageQueue.push({ doc, docId });
      });
    });
    this.processImageQueue();
  }

  processImageQueue(): void {
    if (this.isLoadingImages || this.imageQueue.length === 0) return;
    this.isLoadingImages = true;
    const batch = this.imageQueue.splice(0, this.maxConcurrentLoads);
    Promise.all(batch.map(item => this.loadImage(item.doc, item.docId)))
      .finally(() => {
        this.isLoadingImages = false;
        if (this.imageQueue.length > 0) this.processImageQueue();
      });
  }

  loadImage(doc: any, docId: string): Promise<void> {
    return new Promise((resolve) => {
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, { headers: this.getHeaders(), responseType: 'blob' })
        .subscribe({
          next: (blob: Blob) => { this.imageUrls.set(docId, window.URL.createObjectURL(blob)); resolve(); },
          error: () => { this.imageUrls.set(docId, this.getPlaceholderImageUrl()); resolve(); }
        });
    });
  }

  getImageUrl(doc: any): string {
    return this.imageUrls.get(doc.id.toString()) || this.getPlaceholderImageUrl();
  }

  getPlaceholderImageUrl(): string {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f3f4f6\'/%3E%3Ctext x=\'50\' y=\'55\' font-size=\'30\' text-anchor=\'middle\' fill=\'%239ca3af\'%3E📷%3C/text%3E%3C/svg%3E';
  }

  openImage(doc: any): void {
    const docId = doc.id.toString();
    if (this.imageUrls.has(docId)) {
      this.selectedImage = { url: this.imageUrls.get(docId)!, name: doc.fileName, doc: doc };
    } else {
      this.loadImage(doc, docId).then(() => {
        this.selectedImage = { url: this.imageUrls.get(docId)!, name: doc.fileName, doc: doc };
      });
    }
  }

  closeImage(): void { this.selectedImage = null; }

  downloadFile(doc: any): void {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, { headers: this.getHeaders(), responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Download error', err)
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filtered = this.services; return; }
    this.filtered = this.services.filter(s => 
      [s.title, s.name, s.description, s.zone, s.contactPerson, s.projectDuration,
       s.region?.name, s.economicSector?.name, s.provider?.firstName, s.provider?.lastName,
       s.totalAmount?.toString(), s.minimumAmount?.toString()]
      .some(val => val && val.toString().toLowerCase().includes(q))
    );
  }

  clearSearch(): void { this.searchQuery = ''; this.filtered = this.services; }

 contactProvider(provider: any): void {
  if (!provider?.email) return;

  // Stocker le provider pendant la vérification
  this.pendingContactProvider = provider;

  this.subscriptionService.checkSubscription().subscribe({
    next: (status) => {
      if (status.hasActiveSubscription) {
        // ✅ Abonnement actif → ouvrir le chat directement
        this.openChat(provider);
      } else {
        // ❌ Pas d'abonnement → afficher la modal
        this.showSubscriptionModal = true;
      }
    },
    error: () => {
      // En cas d'erreur réseau, ouvrir quand même le chat
      this.openChat(provider);
    }
  });
}
/** Navigation vers le chat */
private openChat(provider: any): void {
  const name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner';
  const basePath = this.isInternationalCompany
    ? '/societe-international/messagerie'
    : '/messagerie';
  this.router.navigate([basePath], {
    queryParams: { contact: provider.email, name }
  });
}

/** Appelé si l'utilisateur souscrit depuis la modal */
onSubscribed(): void {
  this.showSubscriptionModal = false;
  if (this.pendingContactProvider) {
    this.openChat(this.pendingContactProvider);
    this.pendingContactProvider = null;
  }
}
}