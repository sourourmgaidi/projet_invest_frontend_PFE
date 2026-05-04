// tourist-requests.component.ts - Version avec le thème "My Collaborations"
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionModalComponent } from '../../../shared/models/subscription-modal.component';

@Component({
  selector: 'app-tourist-requests',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent, SubscriptionModalComponent],
  template: `
    <app-navbar></app-navbar>
    <div class="page-layout">
      <div class="page-main">
        <div class="page-content">

          <!-- Header -->
          <div class="page-header">
            <div>
              <a routerLink="/touriste/dashboard" class="back-link">← Back to Dashboard</a>
              <h1>My Requests</h1>
              <p class="subtitle">Track all your service requests and payments</p>
            </div>
            <div class="header-actions">
              <button class="new-btn" (click)="goToServices()">🗺️ Browse Services</button>
              <app-notification-bell></app-notification-bell>
            </div>
          </div>

          <!-- Alerts -->
          <div class="alert alert-success" *ngIf="successMessage">✅ {{ successMessage }}</div>
          <div class="alert alert-error" *ngIf="errorMessage">❌ {{ errorMessage }}</div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading your requests...</p>
          </div>

          <ng-container *ngIf="!loading">

            <!-- TABS (style Collaboration) -->
            <div class="tabs-wrapper" *ngIf="allRequests.length > 0">
              <button class="tab-btn" [class.active]="activeTab === 'pending'"
                      (click)="setTab('pending')">
                ⏳ Pending Requests
                <span class="tab-badge" *ngIf="pendingCount > 0">{{ pendingCount }}</span>
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'reserved'"
                      (click)="setTab('reserved')">
                💰 To Pay
                <span class="tab-badge reserved" *ngIf="reservedCount > 0">{{ reservedCount }}</span>
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'completed'"
                      (click)="setTab('completed')">
                ✅ Completed
                <span class="tab-badge taken" *ngIf="completedCount > 0">{{ completedCount }}</span>
              </button>
            </div>

            <!-- TAB 1: PENDING REQUESTS (PENDING_PARTNER_APPROVAL + AWAITING_VALIDATION) -->
            <div *ngIf="activeTab === 'pending'">
              <div class="empty-state" *ngIf="pendingRequests.length === 0">
                <div class="empty-icon">⏳</div>
                <h3>No pending requests</h3>
                <p>You have no service requests awaiting approval.</p>
                <button class="browse-btn" (click)="goToServices()">Browse Services</button>
              </div>

              <div class="cards-grid" *ngIf="pendingRequests.length > 0">
                <div class="acq-card" *ngFor="let req of pendingRequests">
                  <!-- Bannière différente selon statut -->
                  <div class="card-banner" [ngClass]="req.paymentStatus === 'PENDING_PARTNER_APPROVAL' ? 'pending-banner' : 'awaiting-banner'">
                    <span class="banner-icon">{{ req.paymentStatus === 'PENDING_PARTNER_APPROVAL' ? '⏳' : '✅' }}</span>
                    <span class="banner-text">{{ req.paymentStatus === 'PENDING_PARTNER_APPROVAL' ? 'Awaiting Partner Approval' : 'Awaiting Payment Confirmation' }}</span>
                  </div>
                  <div class="card-body">
                    <h3 class="service-name">{{ req.serviceName || 'Service #' + req.serviceId }}</h3>
                    <div class="info-row">
                      <span class="info-label">💰 Amount</span>
                      <span class="info-value amount">{{ req.amount | number }} TND</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">📅 Requested</span>
                      <span class="info-value">{{ formatDate(req.acquiredAt) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">🔖 Order ID</span>
                      <span class="info-value order-id">{{ req.orderId }}</span>
                    </div>
                    <p class="status-message" *ngIf="req.paymentStatus === 'PENDING_PARTNER_APPROVAL'">
                      Your request has been sent to the local partner. Waiting for their response...
                    </p>
                    <p class="status-message awaiting-message" *ngIf="req.paymentStatus === 'AWAITING_VALIDATION'">
                      🕐 Your payment is being verified by the local partner.
                    </p>
                    <button class="cancel-btn"
                            (click)="cancelRequest(req)"
                            [disabled]="cancellingIds.has(req.id)">
                      <span *ngIf="!cancellingIds.has(req.id)">✖ Cancel Request</span>
                      <span *ngIf="cancellingIds.has(req.id)">⏳ Cancelling...</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: RESERVED (TO PAY) -->
            <div *ngIf="activeTab === 'reserved'">
              <div class="empty-state" *ngIf="reservedRequests.length === 0">
                <div class="empty-icon">💰</div>
                <h3>No pending payments</h3>
                <p>You have no services awaiting offline payment.</p>
              </div>

              <div class="cards-grid" *ngIf="reservedRequests.length > 0">
                <div class="acq-card" *ngFor="let req of reservedRequests">
                  <div class="card-banner reserved-banner">
                    <span class="banner-icon">🎉</span>
                    <span class="banner-text">Approved — Payment Pending</span>
                  </div>
                  <div class="card-body">
                    <h3 class="service-name">{{ req.serviceName || 'Service #' + req.serviceId }}</h3>
                    <div class="info-row">
                      <span class="info-label">💰 Amount to Pay</span>
                      <span class="info-value amount highlight">{{ req.amount | number }} TND</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">📅 Approved On</span>
                      <span class="info-value">{{ formatDate(req.approvedAt) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">🔖 Order ID</span>
                      <span class="info-value order-id">{{ req.orderId }}</span>
                    </div>
                    <div class="pay-info-box">
                      <p>🏦 Please contact the local partner to arrange your offline payment.</p>
                      <p>Once payment is received, the partner will validate and finalize your acquisition.</p>
                    </div>
                    <button class="cancel-btn"
                            (click)="cancelRequest(req)"
                            [disabled]="cancellingIds.has(req.id)">
                      <span *ngIf="!cancellingIds.has(req.id)">✖ Cancel Reservation</span>
                      <span *ngIf="cancellingIds.has(req.id)">⏳ Cancelling...</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: COMPLETED -->
            <div *ngIf="activeTab === 'completed'">
              <div class="empty-state" *ngIf="completedRequests.length === 0">
                <div class="empty-icon">✅</div>
                <h3>No acquired services yet</h3>
                <p>Complete the payment process to see your acquired services here.</p>
                <button class="browse-btn" (click)="goToServices()">Browse Services</button>
              </div>

              <div class="cards-grid" *ngIf="completedRequests.length > 0">
                <div class="acq-card" *ngFor="let req of completedRequests">
                  <div class="card-banner taken-banner">
                    <span class="banner-icon">✅</span>
                    <span class="banner-text">Service Acquired</span>
                  </div>
                  <div class="card-body">
                    <h3 class="service-name">{{ req.serviceName || 'Service #' + req.serviceId }}</h3>
                    <div class="info-row">
                      <span class="info-label">💰 Amount Paid</span>
                      <span class="info-value amount">{{ req.amount | number }} TND</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">📅 Acquired On</span>
                      <span class="info-value">{{ formatDate(req.acquiredAt || req.paidAt) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">🔖 Order ID</span>
                      <span class="info-value order-id">{{ req.orderId }}</span>
                    </div>
                    <div class="taken-badge">
                      🎊 This service is now officially yours!
                    </div>
                    <button class="contact-partner-btn" (click)="contactProvider(req)">
                      💬 Contact Provider
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </ng-container>
        </div>
      </div>
    </div>

    <!-- SUBSCRIPTION MODAL -->
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

    .page-layout {
      min-height: 100vh;
      background: #f2f2f2;
      font-family: 'Inter', sans-serif;
      padding-top: 90px;
    }
    .page-main { padding: 2rem; }
    .page-content { max-width: 1200px; margin: 0 auto; }

    /* HEADER */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }
    .back-link {
      display: inline-block;
      color: #2f4f7f;
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
      margin-bottom: 0.5rem;
    }
    .back-link:hover { color: #ffd700; }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #2f4f7f;
      margin-bottom: 0.25rem;
    }
    h1::after {
      content: '';
      display: block;
      width: 60px;
      height: 4px;
      background: linear-gradient(90deg, #2f4f7f, #ffd700);
      margin-top: 0.4rem;
      border-radius: 2px;
    }
    .subtitle { color: #64748b; font-size: 0.9rem; }
    .header-actions { display: flex; align-items: center; gap: 1rem; }
    .new-btn {
      padding: 0.55rem 1.2rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      border: none;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .new-btn:hover { opacity: 0.85; transform: translateY(-1px); }

    /* ALERTS */
    .alert {
      padding: 0.9rem 1.2rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    }
    .alert-success { background: #d1fae5; border: 1px solid #34d399; color: #065f46; }
    .alert-error   { background: #fee2e2; border: 1px solid #f87171; color: #991b1b; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* LOADING */
    .loading-state {
      text-align: center;
      padding: 4rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(47,79,127,0.08);
    }
    .spinner {
      width: 44px; height: 44px;
      border: 3px solid #e2e8f0;
      border-top-color: #2f4f7f;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* TABS */
    .tabs-wrapper {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: white;
      padding: 0.4rem;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(47,79,127,0.08);
      width: fit-content;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.3rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: #f1f5f9; color: #2f4f7f; }
    .tab-btn.active {
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      box-shadow: 0 4px 12px rgba(47,79,127,0.3);
    }
    .tab-badge {
      background: #ffd700;
      color: #2f4f7f;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      min-width: 18px;
      text-align: center;
    }
    .tab-badge.reserved { background: #fcd34d; }
    .tab-badge.taken    { background: #86efac; color: #166534; }

    /* EMPTY STATE */
    .empty-state {
      text-align: center;
      padding: 4rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(47,79,127,0.08);
    }
    .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #2f4f7f; font-size: 1.2rem; margin-bottom: 0.5rem; }
    .empty-state p  { color: #64748b; margin-bottom: 1rem; }
    .browse-btn {
      padding: 0.6rem 1.4rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      border: none;
      border-radius: 999px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .browse-btn:hover { opacity: 0.85; }

    /* GRID */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }

    /* CARD */
    .acq-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e8ecf0;
      box-shadow: 0 2px 12px rgba(47,79,127,0.06);
      transition: all 0.25s;
    }
    .acq-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(47,79,127,0.15);
    }

    /* Card banners */
    .card-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.25rem;
    }
    .pending-banner  { background: linear-gradient(135deg, #2f4f7f, #1e3a5f); }
    .awaiting-banner { background: linear-gradient(135deg, #d97706, #b45309); }
    .reserved-banner { background: linear-gradient(135deg, #16a34a, #15803d); }
    .taken-banner    { background: linear-gradient(135deg, #059669, #047857); }
    .banner-icon { font-size: 1.1rem; }
    .banner-text {
      color: white;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* Card body */
    .card-body { padding: 1.25rem; }
    .service-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: #2f4f7f;
      margin-bottom: 1rem;
    }

    /* Info rows */
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.83rem;
    }
    .info-row:last-of-type { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #334155; font-weight: 600; }
    .info-value.amount { color: #2f4f7f; font-size: 0.95rem; }
    .info-value.amount.highlight { color: #d97706; font-size: 1rem; }
    .info-value.order-id { font-size: 0.72rem; color: #94a3b8; font-family: monospace; }

    /* Status message */
    .status-message {
      margin: 0.75rem 0;
      font-size: 0.8rem;
      color: #475569;
      padding: 0.6rem 0.8rem;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #2f4f7f;
      line-height: 1.5;
    }
    .status-message.awaiting-message {
      border-left-color: #d97706;
      background: #fffbeb;
      color: #78350f;
    }

    /* Pay info box */
    .pay-info-box {
      margin: 0.75rem 0;
      padding: 0.75rem;
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border: 1px solid #fcd34d;
      border-radius: 10px;
      font-size: 0.8rem;
      color: #78350f;
      line-height: 1.6;
    }
    .pay-info-box p { margin-bottom: 0.3rem; }
    .pay-info-box p:last-child { margin-bottom: 0; }

    /* Taken badge */
    .taken-badge {
      margin-top: 0.75rem;
      padding: 0.6rem 0.8rem;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #86efac;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #166534;
      text-align: center;
    }

    /* Contact button */
    .contact-partner-btn {
      width: 100%;
      margin-top: 0.75rem;
      padding: 0.6rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.83rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .contact-partner-btn:hover { opacity: 0.85; transform: translateY(-1px); }

    /* Cancel button */
    .cancel-btn {
      width: 100%;
      margin-top: 0.75rem;
      padding: 0.6rem;
      background: white;
      border: 2px solid #dc2626;
      color: #dc2626;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.83rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cancel-btn:hover:not(:disabled) { background: #dc2626; color: white; }
    .cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .cards-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; gap: 1rem; }
      .tabs-wrapper { width: 100%; flex-wrap: wrap; }
    }
  `]
})
export class TouristRequestsComponent implements OnInit {

  allRequests: ServiceAcquisition[] = [];
  pendingRequests: ServiceAcquisition[] = [];
  reservedRequests: ServiceAcquisition[] = [];
  completedRequests: ServiceAcquisition[] = [];
  
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  
  activeTab: 'pending' | 'reserved' | 'completed' = 'pending';
  
  cancellingIds = new Set<number>();

  // Counters
  pendingCount = 0;
  reservedCount = 0;
  completedCount = 0;

  showSubscriptionModal = false;
  private pendingProvider: { email: string; name: string } | null = null;

  private http = inject(HttpClient);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService);
  private subscriptionService = inject(SubscriptionService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    
    this.acquisitionService.getTouristMyAll().subscribe({
      next: (acquisitions) => {
        this.allRequests = acquisitions;
        this.filterByStatus();
        this.updateCounts();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement demandes:', err);
        this.errorMessage = 'Error loading your requests';
        setTimeout(() => this.errorMessage = null, 5000);
        this.loading = false;
      }
    });
  }

  filterByStatus(): void {
    this.pendingRequests = this.allRequests.filter(r => 
      r.paymentStatus === 'PENDING_PARTNER_APPROVAL' || 
      r.paymentStatus === 'AWAITING_VALIDATION'
    );
    this.reservedRequests = this.allRequests.filter(r => r.paymentStatus === 'RESERVED');
    this.completedRequests = this.allRequests.filter(r => r.paymentStatus === 'COMPLETED');
  }

  updateCounts(): void {
    this.pendingCount = this.pendingRequests.length;
    this.reservedCount = this.reservedRequests.length;
    this.completedCount = this.completedRequests.length;
  }

  setTab(tab: 'pending' | 'reserved' | 'completed'): void {
    this.activeTab = tab;
  }

  goToServices(): void {
    this.router.navigate(['/touriste/services']);
  }

  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  cancelRequest(req: ServiceAcquisition): void {
    if (!req.id) return;
    
    const reason = prompt('Reason for cancellation:', 'Cancelled by user');
    if (!reason) return;
    
    this.cancellingIds.add(req.id);
    this.acquisitionService.cancelRequest(req.id, reason).subscribe({
      next: () => {
        this.cancellingIds.delete(req.id);
        this.successMessage = 'Request cancelled successfully';
        setTimeout(() => this.successMessage = null, 3000);
        this.loadRequests();
      },
      error: (err) => {
        this.cancellingIds.delete(req.id);
        this.errorMessage = err.error?.error || err.message;
        setTimeout(() => this.errorMessage = null, 5000);
      }
    });
  }

  contactProvider(req: ServiceAcquisition): void {
    this.http.get<any>(`http://localhost:8089/api/tourist-services/${req.serviceId}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (service) => {
        if (service.provider?.email) {
          this.pendingProvider = {
            email: service.provider.email,
            name: `${service.provider.firstName || ''} ${service.provider.lastName || ''}`.trim() || 'Local Partner'
          };
          
          this.subscriptionService.checkSubscription().subscribe({
            next: (status) => {
              if (status.hasActiveSubscription) {
                this.openChat(service.provider);
              } else {
                this.showSubscriptionModal = true;
              }
            },
            error: () => this.openChat(service.provider)
          });
        } else {
          this.errorMessage = 'Partner contact not found';
          setTimeout(() => this.errorMessage = null, 3000);
        }
      },
      error: () => {
        this.errorMessage = 'Unable to find partner information';
        setTimeout(() => this.errorMessage = null, 3000);
      }
    });
  }

  private openChat(provider: any): void {
    const name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'Local Partner';
    this.router.navigate(['/messagerie'], {
      queryParams: { contact: provider.email, name }
    });
  }

  onSubscribed(): void {
    this.showSubscriptionModal = false;
    if (this.pendingProvider) {
      this.openChat({
        email: this.pendingProvider.email,
        firstName: this.pendingProvider.name.split(' ')[0],
        lastName: this.pendingProvider.name.split(' ')[1] || ''
      });
      this.pendingProvider = null;
    }
  }
}