// investor-services.component.ts
import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteButtonComponent } from '../../../shared/favoritesInvestservice/favorite-button/favorite-button.component';
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';
import { AuthService } from '../../../core/services/auth';
import { Role } from '../../../shared/models/user.model';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionModalComponent } from '../../../shared/models/subscription-modal.component';
import { FilterPanelComponent } from '../../../shared/filter-panel/filter-panel.component';

@Component({
  selector: 'app-investor-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NotificationBellComponent,
    FavoriteButtonComponent,
    CurrencyConverterComponent,
    SubscriptionModalComponent,
    FilterPanelComponent
  ],
  template: `
    <div class="page-layout">
    
      <div class="page-main">
        <div class="page-content">

          <!-- Header -->
          <div class="page-header">
            <div>
              <a [routerLink]="getBackLink()" class="back-link">← Back to Dashboard</a>
              <h1>{{ getPageTitle() }}</h1>
              <p class="subtitle">{{ getPageSubtitle() }}</p>
            </div>
            <div class="header-actions">
              <ng-container *ngIf="isInvestor">
                <a routerLink="/investisseur/favorites" class="favorites-link">
                  <span>❤️</span> My Favorites
                </a>
                <a routerLink="/investisseur/my-requests" class="requests-link">
                  <span>📋</span> My Requests
                </a>
              </ng-container>

              <ng-container *ngIf="isInternationalCompany">
                <a routerLink="/societe-international/favorites" class="favorites-link">
                  <span>⭐</span> My Favorites
                </a>
                <a routerLink="/societe-international/my-requests" class="requests-link">
                  <span>🌍</span> My Requests
                </a>
              </ng-container>

              <app-notification-bell></app-notification-bell>
            </div>
          </div>

          <div class="alert alert-success" *ngIf="successMessage">✅ {{ successMessage }}</div>
          <div class="alert alert-error"   *ngIf="errorMessage">❌ {{ errorMessage }}</div>

          <app-filter-panel
            [config]="filterConfig"
            [regions]="availableRegions"
            [budgetMax]="10000000"
            [budgetStep]="50000"
            [services]="services"
            (filtersChanged)="onFiltersChanged($event)">
          </app-filter-panel>

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

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading services...</p>
          </div>

          <!-- Empty -->
          <div class="empty-state" *ngIf="!loading && filtered.length === 0">
            <div class="empty-icon">{{ searchQuery ? '🔍' : '📈' }}</div>
            <h3>{{ searchQuery ? 'No results for "' + searchQuery + '"' : 'No investment services available yet' }}</h3>
            <p>{{ searchQuery ? 'Try different keywords' : 'Check back later for new opportunities' }}</p>
            <button class="clear-search-btn" *ngIf="searchQuery" (click)="clearSearch()">Clear search</button>
          </div>

          <!-- Services Grid -->
          <div class="services-grid" *ngIf="!loading && filtered.length > 0">
            <div class="service-card" *ngFor="let s of filtered">

              <!-- Top Banner -->
              <div class="card-top">
                <span class="card-type">📈 Investment</span>
                <span class="card-zone" *ngIf="s.zone">{{ s.zone }}</span>
              </div>

              <!-- Body -->
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

                <!-- Documents -->
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

                <!-- Contact Provider -->
                <div class="card-contact" *ngIf="s.provider">
                  <button class="contact-btn" (click)="contactProvider(s.provider)">
                    <span>💬</span> Contact Provider
                  </button>
                </div>

                <!-- ACQUISITION STATUS -->
                <div class="card-status-section">

                  <!-- ⏳ En attente approbation -->
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

                  <!-- ✅ Approuvé — paiement hors-ligne -->
                  <div class="my-reservation-card" *ngIf="s.awaitingMyPayment">
                    <div class="reservation-header">
                      <span class="res-icon">✅</span>
                      <span class="res-title">
                        {{ s.status === 'AWAITING_VALIDATION'
                            ? 'Payment sent — awaiting partner confirmation'
                            : 'Approved — please pay offline' }}
                      </span>
                    </div>
                    <div class="offline-pay-info" *ngIf="s.status === 'RESERVED'">
                      <p>💳 Please pay <strong>{{ s.amount | number }} TND</strong> offline to your local partner.</p>
                      <p class="pay-note">Once paid, contact your partner so they can confirm reception.</p>
                    </div>
                    <div class="offline-pay-info awaiting" *ngIf="s.status === 'AWAITING_VALIDATION'">
                      <p>🕐 Your payment is being verified by the local partner.</p>
                    </div>
                    <button class="cancel-pending-btn"
                            (click)="cancelRequest(s)"
                            [disabled]="cancellingRequests.get(s.id)"
                            *ngIf="s.status === 'RESERVED'">
                      ✖ Cancel reservation
                    </button>
                  </div>

                  <!-- ✅ Déjà acquis -->
                  <div class="my-taken-card" *ngIf="s.isMyAcquisition">
                    <span class="taken-icon">✅</span>
                    <div class="taken-info">
                      <span class="taken-text">You own this service</span>
                      <span class="taken-date" *ngIf="s.acquiredAt">
                        Acquired on {{ s.acquiredAt | date:'dd/MM/yyyy' }}
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

              <!-- Footer -->
              <div class="card-footer">
                <span class="availability-badge">{{ s.availability }}</span>
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
            <span>📥</span> Télécharger
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* =============================================
       LAYOUT — navbar horizontale (pas de sidebar)
    ============================================= */
    .page-layout {
      min-height: 100vh;
      background: #f2f2f2;
      font-family: 'Inter', sans-serif;
      
    }

    app-navbar {
      /* La navbar est horizontale fixée — on cache le rendu inline */
      display: none;
    }

    .page-main { padding: 2rem; }
    .page-content { max-width: 1300px; margin: 0 auto; }

    /* =============================================
       ALERTS
    ============================================= */
    .alert { padding: 0.9rem 1.2rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 500; animation: slideIn 0.3s ease; }
    .alert-success { background: #d1fae5; border: 1px solid #34d399; color: #065f46; }
    .alert-error   { background: #fee2e2; border: 1px solid #f87171; color: #991b1b; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    /* =============================================
       PAGE HEADER
    ============================================= */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }
    .back-link { display: inline-block; color: #2f4f7f; font-size: 0.85rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; transition: color 0.2s; }
    .back-link:hover { color: #ffd700; }
    h1 { font-size: 2rem; font-weight: 700; color: #2f4f7f; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 60px; height: 4px; background: linear-gradient(90deg, #2f4f7f, #ffd700); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; font-size: 0.9rem; margin: 0; }

    .header-actions { display: flex; align-items: center; gap: 1rem; }

    .favorites-link {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.2rem;
      background: white;
      border: 2px solid #ffd700;
      border-radius: 999px;
      text-decoration: none;
      color: #2f4f7f;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .favorites-link:hover { background: #ffd700; color: #2f4f7f; }

    .requests-link {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.2rem;
      background: white;
      border: 2px solid #2f4f7f;
      border-radius: 999px;
      color: #2f4f7f;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .requests-link:hover { background: #2f4f7f; color: white; }

    /* =============================================
       SEARCH
    ============================================= */
    .search-wrapper { margin-bottom: 1.5rem; }
    .search-box {
      display: flex; align-items: center; gap: 0.75rem;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 999px;
      padding: 0.75rem 1.25rem;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(47,79,127,0.06);
    }
    .search-box:focus-within { border-color: #2f4f7f; box-shadow: 0 4px 16px rgba(47,79,127,0.15); }
    .search-icon { color: #2f4f7f; flex-shrink: 0; }
    .search-input { flex: 1; border: none; outline: none; font-size: 0.95rem; background: transparent; }
    .clear-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; }
    .clear-btn:hover { color: #dc2626; }
    .results-count { display: block; margin-top: 0.5rem; font-size: 0.82rem; color: #64748b; padding-left: 1rem; }

    /* =============================================
       LOADING / EMPTY
    ============================================= */
    .loading-state, .empty-state {
      text-align: center; padding: 4rem;
      background: white; border-radius: 20px;
      box-shadow: 0 4px 20px rgba(47,79,127,0.08);
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #2f4f7f; font-size: 1.2rem; margin-bottom: 0.5rem; }
    .empty-state p { color: #64748b; }
    .spinner { width: 44px; height: 44px; border: 3px solid #e2e8f0; border-top-color: #2f4f7f; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .clear-search-btn { margin-top: 1rem; padding: 0.5rem 1.2rem; background: #2f4f7f; color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 600; }

    /* =============================================
       GRID
    ============================================= */
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }

    /* =============================================
       CARD
    ============================================= */
    .service-card {
      background: white;
      border-radius: 20px;
      border: 1px solid #e8ecf0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.25s;
      box-shadow: 0 2px 12px rgba(47,79,127,0.06);
    }
    .service-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(47,79,127,0.15); border-color: #ffd700; }

    /* TOP BANNER */
    .card-top {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.9rem 1.25rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      position: relative; overflow: hidden;
    }
    .card-top::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 3px; background: linear-gradient(90deg, #ffd700, transparent);
    }
    .card-type { color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; }
    .card-zone {
      color: #ffd700; font-size: 0.72rem; font-weight: 600;
      background: rgba(255,215,0,0.15); padding: 0.2rem 0.6rem;
      border-radius: 999px; border: 1px solid rgba(255,215,0,0.3);
    }

    /* BODY */
    .card-body { padding: 1.25rem; flex: 1; }
    .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .card-header-row h3 { font-size: 1.05rem; font-weight: 700; color: #2f4f7f; flex: 1; margin-right: 0.5rem; }

    /* DESCRIPTION */
    .card-desc {
      font-size: 0.83rem; color: #64748b; line-height: 1.6;
      margin: 0 0 1rem; padding: 0.75rem;
      background: #f8fafc; border-radius: 10px;
      border-left: 3px solid #ffd700;
    }

    /* META */
    .card-meta { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.82rem; padding: 0.35rem 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .meta-label { color: #2f4f7f; font-weight: 600; min-width: 110px; flex-shrink: 0; }

    /* FAVORITE INTL BUTTON */
    .favorite-btn-intl { background: none; border: none; font-size: 1.3rem; cursor: pointer; padding: 0.25rem; transition: transform 0.2s; }
    .favorite-btn-intl:hover { transform: scale(1.1); }
    .favorite-btn-intl.is-favorite .star { color: #ffd700; }
    .loading-spinner { width: 14px; height: 14px; border: 2px solid #e2e8f0; border-top-color: #ffd700; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }

    /* CURRENCY */
    .currency-converter-wrap {
      margin: 0.75rem 0; padding: 0.75rem;
      background: linear-gradient(135deg, #f8fafc, #eff6ff);
      border-radius: 10px; border: 1px dashed #2f4f7f;
    }

    /* DOCUMENTS */
    .documents-section { margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .documents-title { font-size: 0.82rem; font-weight: 700; color: #2f4f7f; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .documents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; }
    .document-item { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem; text-align: center; transition: all 0.2s; }
    .document-item:hover { border-color: #ffd700; box-shadow: 0 2px 8px rgba(255,215,0,0.2); }
    .image-item { cursor: pointer; }
    .image-item:hover { transform: scale(1.05); }
    .document-thumbnail { width: 100%; height: 70px; object-fit: cover; border-radius: 6px; margin-bottom: 0.25rem; }
    .document-name { display: block; font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #475569; }
    .document-size { display: block; font-size: 0.6rem; color: #94a3b8; }
    .document-link { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-decoration: none; color: #2f4f7f; }
    .document-icon { font-size: 1.5rem; }

    /* CONTACT */
    .card-contact { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
    .contact-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.6rem; background: #f8fafc; border: 2px solid #2f4f7f;
      border-radius: 10px; cursor: pointer; color: #2f4f7f; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;
    }
    .contact-btn:hover { background: #2f4f7f; color: white; }

    /* =============================================
       STATUS SECTION
    ============================================= */
    .card-status-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 2px solid #f1f5f9; }

    /* Take button */
    .take-btn {
      width: 100%; padding: 0.8rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white; border: none; border-radius: 12px;
      font-weight: 700; font-size: 0.9rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.25s; letter-spacing: 0.03em;
    }
    .take-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47,79,127,0.35); background: linear-gradient(135deg, #3a5f8f, #2f4f7f); }
    .take-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-loading { display: flex; align-items: center; gap: 0.4rem; }
    .dot-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }

    /* Pending approval */
    .my-pending-card {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border: 1px solid #93c5fd; border-left: 4px solid #2f4f7f;
      border-radius: 12px; padding: 1rem;
    }
    .pending-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .pending-icon { font-size: 1.1rem; }
    .pending-title { font-weight: 700; color: #2f4f7f; font-size: 0.88rem; }
    .pending-message { font-size: 0.78rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.5; }

    /* Awaiting payment */
    .my-reservation-card {
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border: 1px solid #fcd34d; border-left: 4px solid #ffd700;
      border-radius: 12px; padding: 1rem;
    }
    .reservation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .res-icon { font-size: 1.1rem; }
    .res-title { font-weight: 700; color: #92400e; font-size: 0.85rem; }
    .offline-pay-info {
      background: rgba(255,255,255,0.7); border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.82rem; color: #78350f; margin: 0.5rem 0;
    }
    .offline-pay-info p { margin: 0 0 0.25rem; }
    .offline-pay-info.awaiting { background: #eff6ff; color: #1d4ed8; }
    .pay-note { font-size: 0.78rem; color: #92400e; margin: 0 !important; }

    /* Taken */
    .my-taken-card {
      display: flex; align-items: center; gap: 0.75rem;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #86efac; border-left: 4px solid #16a34a;
      border-radius: 12px; padding: 0.9rem 1rem;
    }
    .taken-icon { font-size: 1.4rem; }
    .taken-info { display: flex; flex-direction: column; }
    .taken-text { font-weight: 700; color: #166534; font-size: 0.88rem; }
    .taken-date { font-size: 0.75rem; color: #4ade80; margin-top: 0.15rem; }

    /* Pending by other */
    .pending-acquisition-card {
      background: linear-gradient(135deg, #fefce8, #fef9c3);
      border: 1px solid #fde047; border-left: 4px solid #eab308;
      border-radius: 12px; padding: 0.9rem;
    }
    .pending-acq-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .pending-acq-icon { font-size: 1rem; }
    .pending-acq-title { font-weight: 700; color: #713f12; font-size: 0.85rem; }
    .pending-acq-message { font-size: 0.77rem; color: #713f12; }
    .pending-acq-note { font-size: 0.72rem; color: #92400e; }

    /* Reserved by other */
    .reserved-by-other-card {
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      border: 1px solid #fca5a5; border-left: 4px solid #dc2626;
      border-radius: 12px; padding: 0.9rem;
    }
    .reserved-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .reserved-icon { font-size: 1rem; }
    .reserved-title { font-weight: 700; color: #991b1b; font-size: 0.85rem; }
    .reserved-message { font-size: 0.77rem; color: #991b1b; }
    .reserved-note { font-size: 0.72rem; color: #7f1d1d; }

    /* Cancel buttons */
    .cancel-request-btn, .cancel-pending-btn {
      width: 100%; padding: 0.55rem; border-radius: 8px;
      font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s;
    }
    .cancel-request-btn { background: white; border: 2px solid #dc2626; color: #dc2626; }
    .cancel-request-btn:hover:not(:disabled) { background: #dc2626; color: white; }
    .cancel-request-btn:disabled { opacity: 0.5; }
    .cancel-pending-btn { background: transparent; border: 2px solid #d97706; color: #d97706; margin-top: 0.5rem; }
    .cancel-pending-btn:hover:not(:disabled) { background: #d97706; color: white; }

    /* =============================================
       CARD FOOTER
    ============================================= */
    .card-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    }
    .availability-badge {
      font-size: 0.72rem; font-weight: 700;
      padding: 0.25rem 0.75rem; border-radius: 999px;
      background: rgba(47,79,127,0.1); color: #2f4f7f;
      border: 1px solid rgba(47,79,127,0.2);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .roi { font-size: 0.75rem; font-weight: 700; color: #166534; background: #d1fae5; padding: 0.25rem 0.75rem; border-radius: 999px; }

    /* =============================================
       IMAGE MODAL
    ============================================= */
    .image-modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.92); display: flex; justify-content: center; align-items: center;
      z-index: 2000; backdrop-filter: blur(6px);
    }
    .image-modal .modal-content { position: relative; max-width: 90%; max-height: 90%; }
    .image-modal img { max-width: 100%; max-height: 80vh; border-radius: 12px; }
    .image-modal .close { position: absolute; top: -45px; right: 0; color: white; font-size: 2rem; cursor: pointer; transition: color 0.2s; }
    .image-modal .close:hover { color: #ffd700; }
    .image-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
    .image-name { color: #f2f2f2; font-size: 0.85rem; }
    .btn-download {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 1rem; background: #ffd700; color: #2f4f7f;
      border: none; border-radius: 999px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
    }
    .btn-download:hover { opacity: 0.85; }

    /* =============================================
       RESPONSIVE
    ============================================= */
    @media (max-width: 768px) {
      .services-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .header-actions { width: 100%; justify-content: space-between; }
    }
  `]
})
export class InvestorServicesComponent implements OnInit, OnDestroy {

  // ============================================================
  // LA LOGIQUE TYPESCRIPT EST IDENTIQUE — AUCUN CHANGEMENT
  // ============================================================

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

  filterConfig = {
    showRegion: true,
    showBudget: true,
    showSector: true,
    showAvailability: true,
  };
  availableRegions: { id: number; name: string }[] = [];

  showSubscriptionModal = false;
  private pendingContactProvider: any = null;

  private http = inject(HttpClient);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private subscriptionService = inject(SubscriptionService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private determineUserRole(): void {
    const userRole = this.authService.getUserRole();
    this.isInvestor = userRole === Role.INVESTOR;
    this.isInternationalCompany = userRole === Role.INTERNATIONAL_COMPANY;
  }

  async ngOnInit(): Promise<void> {
    this.determineUserRole();
    this.loadServices();
  }

  ngOnDestroy(): void {
    this.imageUrls.forEach(url => { if (url.startsWith('blob:')) window.URL.revokeObjectURL(url); });
    this.imageUrls.clear();
  }

  onFiltersChanged(filters: any): void {
    let result = [...this.services];
    if (filters.regionId) result = result.filter(s => s.region?.id === filters.regionId);
    if (filters.budget) result = result.filter(s => !s.totalAmount || s.totalAmount <= filters.budget);
    if (filters.availability) result = result.filter(s => s.availability === filters.availability);
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(s =>
        [s.title, s.name, s.description, s.zone, s.contactPerson, s.projectDuration,
         s.region?.name, s.economicSector?.name, s.provider?.firstName, s.provider?.lastName,
         s.totalAmount?.toString(), s.minimumAmount?.toString()]
        .some(val => val && val.toString().toLowerCase().includes(q))
      );
    }
    this.filtered = result;
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
    return this.isInvestor
      ? 'All approved investment services available for you'
      : 'Discover investment opportunities with local partners';
  }

  loadServices(): void {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8089/api/investment-services/available', {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.services = data.map(service => ({
          ...service,
          id: Number(service.id),
          status: service.status || 'APPROVED'
        }));
        this.filtered = [...this.services];

        const regionsMap = new Map<number, string>();
        data.forEach(s => {
          if (s.region?.id && s.region?.name) regionsMap.set(s.region.id, s.region.name);
        });
        this.availableRegions = Array.from(regionsMap.entries()).map(([id, name]) => ({ id, name }));

        this.loading = false;
        this.prepareImageLoading();
        this.enrichWithAcquisitionStatus();
        this.loadActiveReservations();
        if (this.isInternationalCompany) this.checkFavoritesStatusIntl();
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
    const request = service.isFavorite
      ? this.http.delete(url, { headers: this.getHeaders() })
      : this.http.post(url, {}, { headers: this.getHeaders() });
    request.subscribe({
      next: () => {
        service.isFavorite = !service.isFavorite;
        service.favoriteLoading = false;
        this.successMessage = service.isFavorite ? 'Service ajouté aux favoris' : 'Service retiré des favoris';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err: any) => {
        service.favoriteLoading = false;
        this.errorMessage = err.error?.error || 'Erreur';
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

  enrichWithAcquisitionStatus(): void {
    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (acquisitions: ServiceAcquisition[]) => {
        const investmentAcquisitions = acquisitions.filter(
          (a: ServiceAcquisition) => a.serviceType === 'INVESTMENT'
        );

        this.services.forEach((service: any) => {
          service.isMyAcquisition   = false;
          service.awaitingMyPayment = false;
          service.isPendingApproval = false;
          service.acquisitionId     = null;
          service.amount            = null;
          service.acquiredAt        = null;

          const acq = investmentAcquisitions.find(
            (a: ServiceAcquisition) => Number(a.serviceId) === Number(service.id)
          );

          if (acq) {
            console.log(`✅ Match - serviceId=${service.id} paymentStatus=${acq.paymentStatus}`);
            switch (acq.paymentStatus) {
              case 'COMPLETED':
                service.isMyAcquisition = true;
                service.acquiredAt      = acq.acquiredAt;
                service.status          = 'TAKEN';
                break;
              case 'AWAITING_VALIDATION':
                service.awaitingMyPayment = true;
                service.amount            = acq.amount;
                service.acquisitionId     = acq.id;
                service.status            = 'AWAITING_VALIDATION';
                break;
              case 'PENDING_PARTNER_APPROVAL':
                service.isPendingApproval = true;
                service.acquisitionId     = acq.id;
                service.status            = 'PENDING_ACQUISITION';
                break;
              case 'PARTNER_REJECTED':
                service.status = 'APPROVED';
                break;
              case 'CANCELLED':
                service.status = 'APPROVED';
                break;
            }
          } else {
            console.log(`❌ Pas de match pour serviceId=${service.id}`);
          }
        });

        this.filtered = [...this.services];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('❌ Acquisitions error:', err)
    });
  }

  loadActiveReservations(): void {
    this.http.get<any[]>('http://localhost:8089/api/investment-services/reserved', {
      headers: this.getHeaders()
    }).subscribe({
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
      next: () => {
        service.takeLoading = false;
        this.successMessage = 'Request sent!';
        setTimeout(() => this.successMessage = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        service.takeLoading = false;
        this.errorMessage = err.error?.error || err.message;
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

  payNow(service: any): void {
    alert(
      `Please pay ${service.amount ? (service.amount as number).toLocaleString() : '?'} TND ` +
      `offline to your local partner.\n\nOnce paid, contact your partner to confirm reception.`
    );
  }

  cancelRequest(service: any): void {
    if (!service.acquisitionId) {
      this.errorMessage = 'Cannot cancel';
      return;
    }
    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);
    this.acquisitionService.cancelRequest(service.acquisitionId, reason || 'Cancelled by user').subscribe({
      next: () => {
        this.cancellingRequests.delete(service.id);
        this.successMessage = 'Request cancelled';
        setTimeout(() => this.successMessage = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
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
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
        headers: this.getHeaders(), responseType: 'blob'
      }).subscribe({
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
      this.selectedImage = { url: this.imageUrls.get(docId)!, name: doc.fileName, doc };
    } else {
      this.loadImage(doc, docId).then(() => {
        this.selectedImage = { url: this.imageUrls.get(docId)!, name: doc.fileName, doc };
      });
    }
  }

  closeImage(): void { this.selectedImage = null; }

  downloadFile(doc: any): void {
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: this.getHeaders(), responseType: 'blob'
    }).subscribe({
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
    this.pendingContactProvider = provider;
    this.subscriptionService.checkSubscription().subscribe({
      next: (status) => {
        if (status.hasActiveSubscription) {
          this.openChat(provider);
        } else {
          this.showSubscriptionModal = true;
        }
      },
      error: () => { this.openChat(provider); }
    });
  }

  private openChat(provider: any): void {
    const name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner';
    const basePath = this.isInternationalCompany ? '/societe-international/messagerie' : '/messagerie';
    this.router.navigate([basePath], { queryParams: { contact: provider.email, name } });
  }

  onSubscribed(): void {
    this.showSubscriptionModal = false;
    if (this.pendingContactProvider) {
      this.openChat(this.pendingContactProvider);
      this.pendingContactProvider = null;
    }
  }
}