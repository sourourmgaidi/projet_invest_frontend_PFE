import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { FavoriteCollaborationService } from '../../../core/services/favorite-collaboration.service';
import { CurrencyConverterComponent } from '../../public/currency-converter/currency-converter.component';
import { FilterPanelComponent } from '../../../shared/filter-panel/filter-panel.component';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionModalComponent } from '../../../shared/models/subscription-modal.component';

@Component({
  selector: 'app-economic-partner-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NotificationBellComponent,
    CurrencyConverterComponent,
    FilterPanelComponent,
    SubscriptionModalComponent  // ✅ AJOUTÉ
  ],
  template: `
    <div class="page-layout">
      
      <div class="page-main">
        <div class="page-content">

          <div class="page-header">
        <div>
          <a routerLink="/partenaire-economique/dashboard" class="back-link">← Back to Dashboard</a>
          <h1>Collaboration Opportunities</h1>
          <p class="subtitle">All approved collaboration services available for you</p>
        </div>
        <div class="header-actions">
          <a routerLink="/partenaire-economique/favorites-collaboration" class="favorites-link">
            <span>❤️</span> My Favorites
          </a>
          <app-notification-bell></app-notification-bell>
        </div>
      </div>

          <app-filter-panel
            [config]="filterConfig"
            [regions]="availableRegions"
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
                placeholder="Search by name, description, type, region, contact, domain..."
                class="search-input"
              />
              <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">✕</button>
            </div>
            <span class="results-count" *ngIf="searchQuery">
              {{ filtered.length }} result{{ filtered.length !== 1 ? 's' : '' }} found
            </span>
          </div>

          <!-- Alerts -->
          <div class="alert alert-success" *ngIf="success">✅ {{ success }}</div>
          <div class="alert alert-error" *ngIf="error">❌ {{ error }}</div>

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

              <!-- Top Banner -->
              <div class="card-top">
                <span class="card-type">🤝 Collaboration</span>
                <span class="card-domain" *ngIf="s.activityDomain">{{ formatEnum(s.activityDomain) }}</span>
              </div>

              <!-- Body -->
              <div class="card-body">

                <!-- Title + Favorite -->
                <div class="card-header-row">
                  <h3>{{ s.name }}</h3>
                  <button
                    class="favorite-btn"
                    [class.is-favorite]="s.isFavorite"
                    (click)="toggleFavorite(s)"
                    [disabled]="s.favoriteLoading"
                    [title]="s.isFavorite ? 'Remove from favorites' : 'Add to favorites'">
                    <span>{{ s.isFavorite ? '❤️' : '🤍' }}</span>
                    <span *ngIf="s.favoriteLoading">...</span>
                  </button>
                </div>

                <!-- Description -->
                <p class="card-desc">
                  {{ (s.description || 'No description available.') | slice:0:150 }}
                  {{ (s.description?.length || 0) > 150 ? '...' : '' }}
                </p>

                <!-- Meta -->
                <div class="card-meta" *ngIf="s.region">
                  <span class="meta-label">📍 Region</span>
                  <span>{{ s.region.name }}</span>
                </div>
                <div class="card-meta" *ngIf="s.collaborationType">
                  <span class="meta-label">🔗 Type</span>
                  <span>{{ formatEnum(s.collaborationType) }}</span>
                </div>
                <div class="card-meta" *ngIf="s.collaborationDuration">
                  <span class="meta-label">⏱ Duration</span>
                  <span>{{ s.collaborationDuration }}</span>
                </div>
                <div class="card-meta" *ngIf="s.expectedBenefits">
                  <span class="meta-label">✨ Benefits</span>
                  <span>{{ s.expectedBenefits | slice:0:80 }}{{ (s.expectedBenefits?.length || 0) > 80 ? '...' : '' }}</span>
                </div>
                <div class="card-meta" *ngIf="s.requiredSkills">
                  <span class="meta-label">🛠 Skills</span>
                  <span>{{ s.requiredSkills | slice:0:60 }}...</span>
                </div>
                <div class="card-meta" *ngIf="s.contactPerson">
                  <span class="meta-label">👤 Contact</span>
                  <span>{{ s.contactPerson }}</span>
                </div>
                <div class="card-meta" *ngIf="s.provider">
                  <span class="meta-label">🏢 Provider</span>
                  <span>{{ s.provider.firstName }} {{ s.provider.lastName }}</span>
                </div>
                <div class="card-meta" *ngIf="s.address">
                  <span class="meta-label">🏠 Address</span>
                  <span>{{ s.address }}</span>
                </div>
                <div class="card-meta" *ngIf="s.requestedBudget">
                  <span class="meta-label">💰 Budget</span>
                  <span style="font-weight:700; color:#2f4f7f;">{{ s.requestedBudget | number }} TND</span>
                </div>

                <!-- Currency Converter -->
                <div class="currency-converter-wrap" *ngIf="s.requestedBudget">
                  <app-currency-converter [initialAmount]="s.requestedBudget" [initialCurrency]="'TND'">
                  </app-currency-converter>
                </div>

                <!-- Documents -->
                <div class="documents-section" *ngIf="s.documents && s.documents.length > 0">
                  <h4 class="documents-title">📎 Documents ({{ s.documents.length }})</h4>
                  <div class="documents-grid">
                    <ng-container *ngFor="let doc of s.documents">
                      <div class="document-item image-item" *ngIf="doc.fileType?.startsWith('image/')">
                        <img [src]="getImageUrl(doc)" class="document-thumbnail"
                             alt="{{ doc.fileName }}" (click)="openImage(doc)" loading="lazy">
                        <span class="document-name">{{ doc.fileName }}</span>
                        <span class="document-size" *ngIf="doc.fileSize">{{ formatFileSize(doc.fileSize) }}</span>
                      </div>
                      <div class="document-item" *ngIf="doc.fileType === 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📄</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                        </a>
                      </div>
                      <div class="document-item"
                           *ngIf="!doc.fileType?.startsWith('image/') && doc.fileType !== 'application/pdf'">
                        <a href="javascript:void(0)" (click)="downloadFile(doc)" class="document-link">
                          <span class="document-icon">📎</span>
                          <span class="document-name">{{ doc.fileName }}</span>
                        </a>
                      </div>
                    </ng-container>
                  </div>
                </div>

                <!-- Contact Provider -->
                <div class="card-contact" *ngIf="s.provider">
                  <button class="contact-btn"
                          (click)="contactProvider(s.provider)"
                          [disabled]="checkingSubscription">
                    <span *ngIf="!checkingSubscription">💬 Contact Provider</span>
                    <span *ngIf="checkingSubscription">⏳ Checking...</span>
                  </button>
                </div>

                <!-- ACQUISITION STATUS -->
                <div class="card-status-section">

                  <div class="my-pending-card" *ngIf="s.isPendingApproval">
                    <div class="pending-header">
                      <span class="pending-icon">⏳</span>
                      <span class="pending-title">Request Pending Approval</span>
                    </div>
                    <p class="pending-message">
                      Your request has been sent to the local partner. Waiting for their response...
                    </p>
                    <button class="cancel-request-btn"
                            (click)="cancelRequest(s)"
                            [disabled]="cancellingRequests.get(s.id)">
                      <span *ngIf="!cancellingRequests.get(s.id)">✖ Cancel Request</span>
                      <span *ngIf="cancellingRequests.get(s.id)">⏳ Cancelling...</span>
                    </button>
                  </div>

                  <div class="my-reserved-card" *ngIf="s.isMyReservation">
                    <div class="reserved-mine-header">
                      <span class="reserved-mine-icon">🎉</span>
                      <span class="reserved-mine-title">Your Reservation is Confirmed!</span>
                    </div>
                    <p class="reserved-mine-message">
                      The local partner approved your request. Please proceed with the offline payment to finalize.
                    </p>
                    <div class="reserved-mine-amount" *ngIf="s.amount">
                      💰 Amount to pay: <strong>{{ s.amount | number }} TND</strong>
                    </div>
                    <button class="cancel-reservation-btn"
                            (click)="cancelReservation(s)"
                            [disabled]="cancellingRequests.get(s.id)">
                      <span *ngIf="!cancellingRequests.get(s.id)">✖ Cancel Reservation</span>
                      <span *ngIf="cancellingRequests.get(s.id)">⏳ Cancelling...</span>
                    </button>
                  </div>

                  <div class="my-reservation-card" *ngIf="s.awaitingMyPayment">
                    <div class="reservation-header">
                      <span class="res-icon">✅</span>
                      <span class="res-title">
                        {{ s.status === 'AWAITING_VALIDATION'
                            ? 'Awaiting Payment Confirmation'
                            : 'Approved — Please Pay Offline' }}
                      </span>
                    </div>
                    <div class="offline-pay-info" *ngIf="s.status === 'AWAITING_VALIDATION'">
                      <p>🕐 Your payment is being verified by the local partner.</p>
                    </div>
                  </div>

                  <div class="my-taken-card" *ngIf="s.isMyAcquisition">
                    <span class="taken-icon">✅</span>
                    <div class="taken-info">
                      <span class="taken-text">You own this service</span>
                      <span class="taken-date" *ngIf="s.acquiredAt">
                        Acquired on {{ s.acquiredAt | date:'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </div>

                  <div class="pending-acquisition-card"
                       *ngIf="s.status === 'PENDING_ACQUISITION'
                              && !s.isPendingApproval
                              && !s.awaitingMyPayment
                              && !s.isMyAcquisition
                              && !s.isMyReservation">
                    <div class="pending-acq-header">
                      <span class="pending-acq-icon">⏳</span>
                      <span class="pending-acq-title">Request In Progress</span>
                    </div>
                    <p class="pending-acq-message">Another user has submitted a request for this service.</p>
                  </div>

                  <div class="reserved-by-other-card"
                       *ngIf="s.status === 'RESERVED'
                              && !s.isMyReservation
                              && !s.awaitingMyPayment
                              && !s.isPendingApproval
                              && !s.isMyAcquisition">
                    <div class="reserved-header">
                      <span class="reserved-icon">🔒</span>
                      <span class="reserved-title">Service Currently Reserved</span>
                    </div>
                    <p class="reserved-message">
                      This service is reserved by another user and awaiting payment confirmation.
                    </p>
                  </div>

                  <button class="take-btn"
                    *ngIf="s.status === 'APPROVED'
                           && !s.isPendingApproval
                           && !s.awaitingMyPayment
                           && !s.isMyAcquisition
                           && !s.isMyReservation"
                    (click)="takeService(s)"
                    [disabled]="s.takeLoading">
                    <span *ngIf="!s.takeLoading">🤝 Request This Service</span>
                    <span *ngIf="s.takeLoading">⏳ Sending Request...</span>
                  </button>

                </div>
              </div>

              <!-- Footer -->
              <div class="card-footer">
                <span class="availability-badge">{{ s.availability }}</span>
                <span class="price">{{ s.requestedBudget | number }} TND</span>
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
        <img [src]="selectedImage.url" [alt]="selectedImage.name">
        <div class="image-footer">
          <p class="image-name">{{ selectedImage.name }}</p>
          <button class="btn-download" (click)="downloadFile(selectedImage.doc)">
            <span>📥</span> Download
          </button>
        </div>
      </div>
    </div>

    <!-- ✅ SUBSCRIPTION MODAL — même pattern que CollaborationServicesComponent -->
    <app-subscription-modal
      *ngIf="showSubscriptionModal"
      (subscribed)="onSubscriptionSuccess()"
      (closed)="onSubscriptionClosed()">
    </app-subscription-modal>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page-layout {
      min-height: 100vh;
      background: #f2f2f2;
      font-family: 'Inter', sans-serif;
     
    }

    .page-main { padding: 2rem; }
    .page-content { max-width: 1300px; margin: 0 auto; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }
    .back-link { display: inline-block; color: #2f4f7f; font-size: 0.85rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; transition: color 0.2s; }
    .back-link:hover { color: #ffd700; }
    h1 { font-size: 2rem; font-weight: 700; color: #2f4f7f; margin-bottom: 0.25rem; }
    h1::after { content: ''; display: block; width: 60px; height: 4px; background: linear-gradient(90deg, #2f4f7f, #ffd700); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; font-size: 0.9rem; }
    .header-actions { display: flex; align-items: center; gap: 1rem; }
    .favorites-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.2rem; background: white; border: 2px solid #ffd700; border-radius: 999px; text-decoration: none; color: #2f4f7f; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
    .favorites-link:hover { background: #ffd700; color: #2f4f7f; }

    .alert { padding: 0.9rem 1.2rem; border-radius: 12px; margin-bottom: 1.5rem; font-weight: 500; animation: slideIn 0.3s ease; }
    .alert-success { background: #d1fae5; border: 1px solid #34d399; color: #065f46; }
    .alert-error   { background: #fee2e2; border: 1px solid #f87171; color: #991b1b; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .search-wrapper { margin-bottom: 2rem; }
    .search-box { display: flex; align-items: center; gap: 0.75rem; background: white; border: 2px solid #e2e8f0; border-radius: 999px; padding: 0.75rem 1.25rem; transition: all 0.2s; box-shadow: 0 2px 8px rgba(47,79,127,0.06); }
    .search-box:focus-within { border-color: #2f4f7f; box-shadow: 0 4px 16px rgba(47,79,127,0.15); }
    .search-icon { color: #2f4f7f; flex-shrink: 0; }
    .search-input { flex: 1; border: none; outline: none; font-size: 0.95rem; background: transparent; }
    .clear-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; }
    .clear-btn:hover { color: #dc2626; }
    .results-count { display: block; margin-top: 0.5rem; font-size: 0.82rem; color: #64748b; padding-left: 1rem; }

    .loading-state, .empty-state { text-align: center; padding: 4rem; background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(47,79,127,0.08); }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #2f4f7f; font-size: 1.2rem; margin-bottom: 0.5rem; }
    .empty-state p { color: #64748b; }
    .spinner { width: 44px; height: 44px; border: 3px solid #e2e8f0; border-top-color: #2f4f7f; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .clear-search-btn { margin-top: 1rem; padding: 0.5rem 1.2rem; background: #2f4f7f; color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 600; }

    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }

    .service-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e8ecf0; display: flex; flex-direction: column; transition: all 0.25s; box-shadow: 0 2px 12px rgba(47,79,127,0.06); }
    .service-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(47,79,127,0.15); border-color: #ffd700; }

    .card-top { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.25rem; background: linear-gradient(135deg, #2f4f7f, #1e3a5f); position: relative; overflow: hidden; }
    .card-top::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #ffd700, transparent); }
    .card-type { color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; }
    .card-domain { color: #ffd700; font-size: 0.72rem; font-weight: 600; background: rgba(255,215,0,0.15); padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid rgba(255,215,0,0.3); }

    .card-body { padding: 1.25rem; flex: 1; }
    .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .card-header-row h3 { font-size: 1.05rem; font-weight: 700; color: #2f4f7f; flex: 1; margin-right: 0.5rem; }
    .favorite-btn { background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem; transition: transform 0.2s; flex-shrink: 0; }
    .favorite-btn:hover { transform: scale(1.2); }
    .favorite-btn:disabled { opacity: 0.5; }

    .card-desc { font-size: 0.83rem; color: #64748b; line-height: 1.6; margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 10px; border-left: 3px solid #ffd700; }
    .card-meta { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.82rem; padding: 0.35rem 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .meta-label { color: #2f4f7f; font-weight: 600; min-width: 100px; flex-shrink: 0; }

    .currency-converter-wrap { margin: 0.75rem 0; padding: 0.75rem; background: linear-gradient(135deg, #f8fafc, #eff6ff); border-radius: 10px; border: 1px dashed #2f4f7f; }

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

    .card-contact { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #e2e8f0; }
    .contact-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem; background: #f8fafc; border: 2px solid #2f4f7f; border-radius: 10px; cursor: pointer; color: #2f4f7f; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
    .contact-btn:hover:not(:disabled) { background: #2f4f7f; color: white; }
    .contact-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .card-status-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 2px solid #f1f5f9; }

    .take-btn { width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #2f4f7f, #1e3a5f); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.25s; letter-spacing: 0.03em; }
    .take-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47,79,127,0.35); background: linear-gradient(135deg, #3a5f8f, #2f4f7f); }
    .take-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .my-pending-card { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1px solid #93c5fd; border-left: 4px solid #2f4f7f; border-radius: 12px; padding: 1rem; }
    .pending-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .pending-icon { font-size: 1.1rem; }
    .pending-title { font-weight: 700; color: #2f4f7f; font-size: 0.88rem; }
    .pending-message { font-size: 0.78rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.5; }
    .cancel-request-btn { width: 100%; padding: 0.55rem; background: white; border: 2px solid #dc2626; color: #dc2626; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; }
    .cancel-request-btn:hover:not(:disabled) { background: #dc2626; color: white; }
    .cancel-request-btn:disabled { opacity: 0.5; }

    .my-reserved-card { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-left: 4px solid #16a34a; border-radius: 12px; padding: 1rem; }
    .reserved-mine-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .reserved-mine-icon { font-size: 1.1rem; }
    .reserved-mine-title { font-weight: 700; color: #166534; font-size: 0.88rem; }
    .reserved-mine-message { font-size: 0.78rem; color: #475569; margin-bottom: 0.5rem; line-height: 1.5; }
    .reserved-mine-amount { font-size: 0.82rem; color: #166534; margin-bottom: 0.75rem; padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.7); border-radius: 8px; }
    .cancel-reservation-btn { width: 100%; padding: 0.55rem; background: white; border: 2px solid #dc2626; color: #dc2626; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; }
    .cancel-reservation-btn:hover:not(:disabled) { background: #dc2626; color: white; }
    .cancel-reservation-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .my-reservation-card { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fcd34d; border-left: 4px solid #ffd700; border-radius: 12px; padding: 1rem; }
    .reservation-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .res-icon { font-size: 1.1rem; }
    .res-title { font-weight: 700; color: #92400e; font-size: 0.85rem; }
    .offline-pay-info { background: rgba(255,255,255,0.7); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #78350f; margin-top: 0.5rem; }

    .my-taken-card { display: flex; align-items: center; gap: 0.75rem; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-left: 4px solid #16a34a; border-radius: 12px; padding: 0.9rem 1rem; }
    .taken-icon { font-size: 1.4rem; }
    .taken-info { display: flex; flex-direction: column; }
    .taken-text { font-weight: 700; color: #166534; font-size: 0.88rem; }
    .taken-date { font-size: 0.75rem; color: #4ade80; margin-top: 0.15rem; }

    .pending-acquisition-card { background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #fde047; border-left: 4px solid #eab308; border-radius: 12px; padding: 0.9rem; }
    .pending-acq-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .pending-acq-icon { font-size: 1rem; }
    .pending-acq-title { font-weight: 700; color: #713f12; font-size: 0.85rem; }
    .pending-acq-message { font-size: 0.77rem; color: #713f12; }

    .reserved-by-other-card { background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fca5a5; border-left: 4px solid #dc2626; border-radius: 12px; padding: 0.9rem; }
    .reserved-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .reserved-icon { font-size: 1rem; }
    .reserved-title { font-weight: 700; color: #991b1b; font-size: 0.85rem; }
    .reserved-message { font-size: 0.77rem; color: #991b1b; }

    .card-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; border-top: 1px solid #f1f5f9; background: linear-gradient(135deg, #f8fafc, #f1f5f9); }
    .availability-badge { font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 999px; background: rgba(47,79,127,0.1); color: #2f4f7f; border: 1px solid rgba(47,79,127,0.2); text-transform: uppercase; letter-spacing: 0.05em; }
    .price { font-size: 0.9rem; font-weight: 700; color: #2f4f7f; }

    .image-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.92); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(6px); }
    .modal-content { position: relative; max-width: 90%; max-height: 90%; }
    .modal-content img { max-width: 100%; max-height: 80vh; border-radius: 12px; }
    .close { position: absolute; top: -45px; right: 0; color: white; font-size: 2rem; cursor: pointer; transition: color 0.2s; }
    .close:hover { color: #ffd700; }
    .image-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
    .image-name { color: #f2f2f2; font-size: 0.85rem; }
    .btn-download { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #ffd700; color: #2f4f7f; border: none; border-radius: 999px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
    .btn-download:hover { opacity: 0.85; }

    @media (max-width: 768px) {
      .services-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .header-actions { width: 100%; justify-content: space-between; }
    }
  `]
})
export class EconomicPartnerServicesComponent implements OnInit, OnDestroy {

  services: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // ---- ACQUISITION ----
  cancellingRequests: Map<number, boolean> = new Map();

  // ---- FILTER PANEL ----
  filterConfig = {
    showRegion: true,
    showDomain: true,
    showCollaborationType: true,
    showAvailability: true,
  };
  availableRegions: { id: number; name: string }[] = [];

  // ---- IMAGES ----
  selectedImage: { url: string; name: string; doc: any } | null = null;
  imageBlobUrls: Map<string, string> = new Map();
  imageLoading: Set<string> = new Set();

  // ✅ SUBSCRIPTION — même pattern que CollaborationServicesComponent
  showSubscriptionModal = false;
  checkingSubscription = false;
  private pendingProvider: { email: string; name: string } | null = null;

  private http = inject(HttpClient);
  private router = inject(Router);
  private favoriteService = inject(FavoriteCollaborationService);
  private acquisitionService = inject(AcquisitionService);
  private subscriptionService = inject(SubscriptionService);  // ✅ AJOUTÉ
  private cdr = inject(ChangeDetectorRef);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void { this.loadServices(); }

  ngOnDestroy(): void {
    this.imageBlobUrls.forEach(url => window.URL.revokeObjectURL(url));
    this.imageBlobUrls.clear();
  }

  // ========================================
  // CHARGEMENT DES SERVICES
  // ========================================
loadServices(): void {
  this.loading = true;
  this.http.get<any[]>(
    'http://localhost:8089/api/collaboration-services',
    { headers: this.getHeaders() }
  ).subscribe({
    next: (data) => {
      this.services = data
        .filter(s => ['APPROVED', 'PENDING_ACQUISITION', 'RESERVED'].includes(s.status))
        .map(s => ({
          ...s,
          id: Number(s.id),
          status: s.status || 'APPROVED',
          isMyAcquisition: false,
          awaitingMyPayment: false,
          isPendingApproval: false,
          isMyReservation: false,
          // ✅ Définir directement depuis le statut backend
          isRequestedByOther:
            s.status === 'PENDING_ACQUISITION' || s.status === 'RESERVED',
          acquisitionId: null,
          amount: null,
          acquiredAt: null
        }));

      const regionsMap = new Map<number, string>();
      data.forEach(s => {
        if (s.region?.id && s.region?.name) regionsMap.set(s.region.id, s.region.name);
      });
      this.availableRegions = Array.from(regionsMap.entries()).map(([id, name]) => ({ id, name }));

      this.filtered = [...this.services];
      this.checkFavoritesStatus();
      this.enrichWithAcquisitionStatus();
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur chargement:', err);
      this.error = 'Impossible de charger les services';
      this.loading = false;
    }
  });
}

enrichWithAcquisitionStatus(): void {
  this.acquisitionService.getMyAllAcquisitions().subscribe({
    next: (acquisitions: ServiceAcquisition[]) => {
      const collabAcquisitions = acquisitions.filter(
        (a: ServiceAcquisition) => a.serviceType === 'COLLABORATION'
      );

      this.services.forEach((service: any) => {
        // ✅ Reset uniquement les flags "mon acquisition" — PAS isRequestedByOther
        service.isMyAcquisition   = false;
        service.awaitingMyPayment  = false;
        service.isPendingApproval  = false;
        service.isMyReservation    = false;
        service.acquisitionId      = null;
        service.amount             = null;
        service.acquiredAt         = null;

        const acq = collabAcquisitions.find(
          (a: ServiceAcquisition) => Number(a.serviceId) === Number(service.id)
        );

        if (acq) {
          // ✅ C'est MON acquisition — effacer le flag "autre user"
          service.isRequestedByOther = false;

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

            case 'PARTNER_APPROVED':
              service.isMyReservation = true;
              service.acquisitionId   = acq.id;
              service.amount          = acq.amount;
              service.status          = 'RESERVED';
              break;

            case 'PARTNER_REJECTED':
            case 'CANCELLED':
              // ✅ Ma demande annulée/rejetée — vérifier le VRAI statut backend
              // Ne PAS écraser avec 'APPROVED' si le backend dit PENDING_ACQUISITION
              service.isRequestedByOther =
                service.status === 'PENDING_ACQUISITION' || service.status === 'RESERVED';
              // ✅ Ne forcer APPROVED que si le backend dit vraiment APPROVED
              // service.status reste tel quel (valeur backend)
              break;
          }
        }
        // ✅ Pas de else — isRequestedByOther déjà défini dans loadServices()
      });

      this.filtered = [...this.services];
      this.cdr.detectChanges();
    },
    error: (err) => console.error('❌ Acquisitions error:', err)
  });
}

  takeService(service: any): void {
    service.takeLoading = true;
    this.acquisitionService.initiate({
      serviceType: 'COLLABORATION',
      serviceId: service.id,
      amount: Number(service.requestedBudget || 0)
    }).subscribe({
      next: () => {
        service.takeLoading = false;
        this.success = '✅ Request sent successfully!';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        service.takeLoading = false;
        this.error = err.error?.error || 'Error sending request';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  cancelRequest(service: any): void {
    if (!service.acquisitionId) return;
    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);
    this.acquisitionService.cancelRequest(
      service.acquisitionId, reason || 'Cancelled by user'
    ).subscribe({
      next: () => {
        this.cancellingRequests.delete(service.id);
        this.success = '✅ Request cancelled';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        this.cancellingRequests.delete(service.id);
        this.error = err.error?.error || 'Error cancelling';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  cancelReservation(service: any): void {
    if (!service.acquisitionId) return;
    const reason = prompt('Reason for cancellation:', '');
    this.cancellingRequests.set(service.id, true);
    this.acquisitionService.cancelRequest(
      service.acquisitionId, reason || 'Reservation cancelled by user'
    ).subscribe({
      next: () => {
        this.cancellingRequests.delete(service.id);
        this.success = '✅ Reservation cancelled successfully';
        setTimeout(() => this.success = null, 3000);
        this.loadServices();
      },
      error: (err: any) => {
        this.cancellingRequests.delete(service.id);
        this.error = err.error?.error || 'Error cancelling reservation';
        setTimeout(() => this.error = null, 3000);
      }
    });
  }

  // ========================================
  // FAVORIS
  // ========================================
  checkFavoritesStatus(): void {
    this.services.forEach(service => {
      this.favoriteService.checkPartnerFavorite(service.id).subscribe({
        next: (res) => { service.isFavorite = res.isFavorite; },
        error: () => { service.isFavorite = false; }
      });
    });
  }

  toggleFavorite(service: any): void {
    if (service.favoriteLoading) return;
    service.favoriteLoading = true;
    if (service.isFavorite) {
      this.favoriteService.removePartnerFavorite(service.id).subscribe({
        next: () => { service.isFavorite = false; service.favoriteLoading = false; this.success = 'Service retiré des favoris'; setTimeout(() => this.success = null, 3000); },
        error: (err) => { this.error = err.error?.error || 'Erreur'; service.favoriteLoading = false; setTimeout(() => this.error = null, 3000); }
      });
    } else {
      this.favoriteService.addPartnerFavorite(service.id).subscribe({
        next: () => { service.isFavorite = true; service.favoriteLoading = false; this.success = 'Service ajouté aux favoris'; setTimeout(() => this.success = null, 3000); },
        error: (err) => { this.error = err.error?.error || 'Erreur'; service.favoriteLoading = false; setTimeout(() => this.error = null, 3000); }
      });
    }
  }

  // ========================================
  // RECHERCHE & FILTRES
  // ========================================
  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filtered = this.services; return; }
    this.filtered = this.services.filter(s =>
      [s.name, s.description, s.region?.name, s.contactPerson,
       s.collaborationType, s.activityDomain, s.expectedBenefits,
       `${s.provider?.firstName} ${s.provider?.lastName}`]
      .some(val => val && val.toString().toLowerCase().includes(q))
    );
  }

  clearSearch(): void { this.searchQuery = ''; this.filtered = this.services; }

  onFiltersChanged(filters: any): void {
    let result = [...this.services];
    if (filters.regionId)          result = result.filter(s => s.region?.id === filters.regionId);
    if (filters.activityDomain)    result = result.filter(s => s.activityDomain === filters.activityDomain);
    if (filters.collaborationType) result = result.filter(s => s.collaborationType === filters.collaborationType);
    if (filters.availability)      result = result.filter(s => s.availability === filters.availability);
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(s =>
        [s.name, s.description, s.collaborationType, s.activityDomain,
         s.expectedBenefits, s.contactPerson, s.region?.name,
         `${s.provider?.firstName} ${s.provider?.lastName}`]
        .some(val => val && val.toString().toLowerCase().includes(q))
      );
    }
    this.filtered = result;
  }

  // ========================================
  // ✅ CONTACT PROVIDER — même pattern que CollaborationServicesComponent
  // ========================================
  contactProvider(provider: any): void {
    if (!provider?.email) return;

    const name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner';

    // Sauvegarder le provider en attente
    this.pendingProvider = { email: provider.email, name };
    this.checkingSubscription = true;

    this.subscriptionService.checkSubscription().subscribe({
      next: (status) => {
        this.checkingSubscription = false;
        if (status.hasActiveSubscription) {
          // ✅ Abonnement actif → naviguer directement
          this.openChat(provider.email, name);
        } else {
          // 💳 Pas d'abonnement → afficher le modal Konnect
          this.showSubscriptionModal = true;
        }
      },
      error: () => {
        // En cas d'erreur API → naviguer quand même
        this.checkingSubscription = false;
        this.openChat(provider.email, name);
      }
    });
  }

  private openChat(email: string, name: string): void {
    this.router.navigate(['/messagerie'], {
      queryParams: { contact: email, name }
    });
  }

  // ✅ Appelé par le modal après paiement réussi
  onSubscriptionSuccess(): void {
    this.showSubscriptionModal = false;
    if (this.pendingProvider) {
      this.openChat(this.pendingProvider.email, this.pendingProvider.name);
      this.pendingProvider = null;
    }
  }

  // ✅ Appelé quand l'utilisateur ferme le modal sans payer
  onSubscriptionClosed(): void {
    this.showSubscriptionModal = false;
    this.pendingProvider = null;
  }

  // ========================================
  // DOCUMENTS & IMAGES
  // ========================================
  formatEnum(value: string): string {
    if (!value) return '';
    return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  loadImage(doc: any): void {
    const docId = doc.id.toString();
    if (this.imageLoading.has(docId)) return;
    this.imageLoading.add(docId);
    this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
      headers: this.getHeaders(), responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => { this.imageBlobUrls.set(docId, window.URL.createObjectURL(blob)); this.imageLoading.delete(docId); },
      error: () => { this.imageLoading.delete(docId); }
    });
  }

  getImageUrl(doc: any): string {
    const docId = doc.id.toString();
    if (this.imageBlobUrls.has(docId)) return this.imageBlobUrls.get(docId)!;
    this.loadImage(doc);
    return 'assets/images/loading-image.png';
  }

  openImage(doc: any): void {
    const docId = doc.id.toString();
    if (this.imageBlobUrls.has(docId)) {
      this.selectedImage = { url: this.imageBlobUrls.get(docId)!, name: doc.fileName, doc };
    } else {
      this.http.get(`http://localhost:8089${doc.downloadUrl}`, {
        headers: this.getHeaders(), responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => { const url = window.URL.createObjectURL(blob); this.imageBlobUrls.set(docId, url); this.selectedImage = { url, name: doc.fileName, doc }; },
        error: (err) => console.error('Erreur image', err)
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
        a.href = url; a.download = doc.fileName; a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement', err)
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}