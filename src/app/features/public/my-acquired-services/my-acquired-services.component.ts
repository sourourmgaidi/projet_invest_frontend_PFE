// my-acquired-services.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-my-acquired-services',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FormsModule],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <div class="page-header">
            <div>
              <a [routerLink]="config.backLink" class="back-link">{{ config.backText }}</a>
              <h1>{{ config.title }}</h1>
              <p class="subtitle">{{ config.subtitle }}</p>
            </div>
          </div>

          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading your requests...</p>
          </div>

          <div class="empty-state" *ngIf="!loading && acquisitions.length === 0">
            <div class="empty-icon">{{ config.emptyIcon }}</div>
            <h3>{{ config.emptyTitle }}</h3>
            <p>{{ config.emptyMessage }}</p>
            <a [routerLink]="config.browseLink" class="browse-btn">Browse Services →</a>
          </div>

          <!-- DEMANDES EN ATTENTE D'APPROBATION -->
          <div class="section" *ngIf="pendingAcquisitions.length > 0">
            <h2 class="section-title">⏳ Pending Partner Approval</h2>
            <div class="services-grid">
              <div class="acq-card pending" *ngFor="let a of pendingAcquisitions">
                <div class="acq-header">
                  <span class="type-badge investment">📈 INVESTMENT</span>
                  <span class="status-pill pending-pill">⏳ PENDING</span>
                </div>
                <h3 class="acq-name">{{ a.serviceName }}</h3>

                <div class="service-details" *ngIf="a.serviceDetails">
                  <div class="detail-row">
                    <span class="detail-label">💰 Amount:</span>
                    <span class="detail-value amount">{{ a.amount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.totalAmount">
                    <span class="detail-label">💰 Total:</span>
                    <span class="detail-value">{{ a.serviceDetails.totalAmount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.minimumAmount">
                    <span class="detail-label">💵 Min invest:</span>
                    <span class="detail-value">{{ a.serviceDetails.minimumAmount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.region">
                    <span class="detail-label">📍 Region:</span>
                    <span class="detail-value">{{ a.serviceDetails.region.name }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.zone">
                    <span class="detail-label">🗺️ Zone:</span>
                    <span class="detail-value">{{ a.serviceDetails.zone }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.economicSector">
                    <span class="detail-label">🏭 Sector:</span>
                    <span class="detail-value">{{ a.serviceDetails.economicSector.name }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.projectDuration">
                    <span class="detail-label">⏱️ Duration:</span>
                    <span class="detail-value">{{ a.serviceDetails.projectDuration }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.deadlineDate">
                    <span class="detail-label">📅 Deadline:</span>
                    <span class="detail-value">{{ a.serviceDetails.deadlineDate | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.availability">
                    <span class="detail-label">📅 Availability:</span>
                    <span class="detail-value">{{ a.serviceDetails.availability }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.contactPerson">
                    <span class="detail-label">👤 Contact:</span>
                    <span class="detail-value">{{ a.serviceDetails.contactPerson }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.provider">
                    <span class="detail-label">🏢 Provider:</span>
                    <span class="detail-value">
                      {{ a.serviceDetails.provider.firstName }} {{ a.serviceDetails.provider.lastName }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.description">
                    <span class="detail-label">📝 Description:</span>
                    <span class="detail-value description">{{ a.serviceDetails.description | slice:0:120 }}...</span>
                  </div>
                  
                  <!-- Documents Section -->
                  <div class="documents-section" *ngIf="a.serviceDetails.documents?.length > 0">
                    <h4 class="doc-section-title">📎 Documents</h4>
                    <div class="documents-grid">
                      <div class="document-item" *ngFor="let doc of a.serviceDetails.documents">
                        <span class="doc-icon" [class]="isImage(doc.fileName) ? 'image-icon' : 'file-icon'">
                          {{ isImage(doc.fileName) ? '🖼️' : '📄' }}
                        </span>
                        <span class="doc-name">{{ doc.fileName }}</span>
                        <button class="view-doc-btn" (click)="viewDocument(doc)">View</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="loading-details" *ngIf="!a.serviceDetails && a.detailsLoading">
                  <div class="spinner-small"></div>
                  <span>Loading details...</span>
                </div>

                <p class="pending-msg">⏳ Waiting for the local partner to review your request.</p>
                <button class="cancel-btn" (click)="openCancelModal(a)">🚫 Cancel Request</button>
              </div>
            </div>
          </div>

          <!-- SERVICES RÉSERVÉS (en attente de validation paiement) -->
          <div class="section" *ngIf="reservedAcquisitions.length > 0">
            <h2 class="section-title">⏳ Awaiting Payment Validation</h2>
            <div class="services-grid">
              <div class="acq-card reserved" *ngFor="let a of reservedAcquisitions">
                <div class="acq-header">
                  <span class="type-badge investment">📈 INVESTMENT</span>
                  <span class="status-pill awaiting-pill">⏳ AWAITING VALIDATION</span>
                </div>
                <h3 class="acq-name">{{ a.serviceName }}</h3>

                <div class="service-details" *ngIf="a.serviceDetails">
                  <div class="detail-row">
                    <span class="detail-label">💰 Amount to pay:</span>
                    <span class="detail-value amount">{{ a.amount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.totalAmount">
                    <span class="detail-label">💰 Total Amount:</span>
                    <span class="detail-value">{{ a.serviceDetails.totalAmount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.minimumAmount">
                    <span class="detail-label">💵 Min invest:</span>
                    <span class="detail-value">{{ a.serviceDetails.minimumAmount | number }} TND</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.region">
                    <span class="detail-label">📍 Region:</span>
                    <span class="detail-value">{{ a.serviceDetails.region.name }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.zone">
                    <span class="detail-label">🗺️ Zone:</span>
                    <span class="detail-value">{{ a.serviceDetails.zone }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.economicSector">
                    <span class="detail-label">🏭 Sector:</span>
                    <span class="detail-value">{{ a.serviceDetails.economicSector.name }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.projectDuration">
                    <span class="detail-label">⏱️ Duration:</span>
                    <span class="detail-value">{{ a.serviceDetails.projectDuration }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.deadlineDate">
                    <span class="detail-label">📅 Deadline:</span>
                    <span class="detail-value">{{ a.serviceDetails.deadlineDate | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.availability">
                    <span class="detail-label">📅 Availability:</span>
                    <span class="detail-value">{{ a.serviceDetails.availability }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.contactPerson">
                    <span class="detail-label">👤 Contact:</span>
                    <span class="detail-value">{{ a.serviceDetails.contactPerson }}</span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.provider">
                    <span class="detail-label">🏢 Provider:</span>
                    <span class="detail-value">
                      {{ a.serviceDetails.provider.firstName }} {{ a.serviceDetails.provider.lastName }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="a.serviceDetails.description">
                    <span class="detail-label">📝 Description:</span>
                    <span class="detail-value description">{{ a.serviceDetails.description | slice:0:120 }}...</span>
                  </div>
                  
                  <!-- Documents Section -->
                  <div class="documents-section" *ngIf="a.serviceDetails.documents?.length > 0">
                    <h4 class="doc-section-title">📎 Documents</h4>
                    <div class="documents-grid">
                      <div class="document-item" *ngFor="let doc of a.serviceDetails.documents">
                        <span class="doc-icon" [class]="isImage(doc.fileName) ? 'image-icon' : 'file-icon'">
                          {{ isImage(doc.fileName) ? '🖼️' : '📄' }}
                        </span>
                        <span class="doc-name">{{ doc.fileName }}</span>
                        <button class="view-doc-btn" (click)="viewDocument(doc)">View</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="loading-details" *ngIf="!a.serviceDetails && a.detailsLoading">
                  <div class="spinner-small"></div>
                  <span>Loading details...</span>
                </div>

                <div class="expiry-info" *ngIf="a.reservationExpiresAt">
                  <span class="expiry-label">⏰ Expires:</span>
                  <span class="expiry-value" [class.urgent]="isExpiringSoon(a.reservationExpiresAt)">
                    {{ a.reservationExpiresAt | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                  <span class="expiry-countdown" *ngIf="isExpiringSoon(a.reservationExpiresAt)">
                    ⚠️ Less than 2 hours left!
                  </span>
                </div>

                <div class="payment-notice-box">
                  <span class="notice-icon">💳</span>
                  <span>Please pay <strong>{{ a.amount | number }} TND</strong> offline to your local partner.</span>
                </div>
                
                <button class="cancel-outline-btn" (click)="openCancelModal(a)">🚫 Cancel Reservation</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════ Cancel Modal ══════════════ -->
    <div class="modal-overlay" *ngIf="showCancelModal" (click)="closeCancelModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-icon">🚫</span>
          <h3>Cancel Request</h3>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            You are about to cancel your request for
            <strong>{{ selectedAcquisition?.serviceName }}</strong>.
            The service will become available for others.
          </p>
          <label class="reason-label">Reason for cancellation <span class="required">*</span></label>
          <textarea
            [(ngModel)]="cancelReason"
            placeholder="Please explain why you are cancelling..."
            class="reason-input"
            rows="4"
            maxlength="500">
          </textarea>
          <span class="char-count">{{ cancelReason.length }}/500</span>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeCancelModal()">Keep Request</button>
          <button class="btn-danger"
                  (click)="confirmCancel()"
                  [disabled]="cancelReason.trim().length < 5 || cancelLoading">
            <span *ngIf="!cancelLoading">🚫 Confirm Cancellation</span>
            <span *ngIf="cancelLoading">Processing...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Document View Modal -->
    <div class="modal-overlay" *ngIf="viewingDocument" (click)="closeDocumentModal()">
      <div class="modal-card document-modal" (click)="$event.stopPropagation()">
        <div class="document-modal-header">
          <h3>{{ viewingDocument.fileName }}</h3>
          <button class="close-modal-btn" (click)="closeDocumentModal()">✕</button>
        </div>
        <div class="document-preview" *ngIf="isImage(viewingDocument.fileName)">
          <img [src]="documentUrl" alt="{{ viewingDocument.fileName }}" class="preview-image">
        </div>
        <div class="document-preview" *ngIf="!isImage(viewingDocument.fileName)">
          <div class="file-icon">📄</div>
          <p>Preview not available for this file type.</p>
        </div>
        <div class="document-actions">
          <button class="download-btn" (click)="downloadDocument(viewingDocument)">
            📥 Download
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-layout { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
    app-navbar { width: 280px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; z-index: 100; }
    .page-main { flex: 1; padding: 2rem; overflow-y: auto; }
    .page-content { max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 2rem; }
    .back-link { display: inline-block; color: #2563eb; font-size: 0.9rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; }
    .back-link:hover { color: #7c3aed; }
    h1 { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 50px; height: 4px; background: linear-gradient(90deg, #2563eb, #7c3aed); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; margin: 0; }
    .loading-state, .empty-state { text-align: center; padding: 4rem; background: white; border-radius: 16px; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .browse-btn { display: inline-block; padding: 0.7rem 1.5rem; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 10px; text-decoration: none; font-weight: 600; }
    .section { margin-bottom: 2.5rem; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: #374151; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; }
    .acq-card { background: white; border-radius: 14px; padding: 1.25rem; border: 1px solid #e2e8f0; transition: box-shadow 0.2s; }
    .acq-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .acq-card.reserved { border-left: 4px solid #f59e0b; }
    .acq-card.pending { border-left: 4px solid #3b82f6; }
    .acq-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .type-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 50px; }
    .type-badge.investment { background: #eff6ff; color: #1d4ed8; }
    .status-pill { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.7rem; border-radius: 50px; }
    .pending-pill { background: #dbeafe; color: #1e40af; }
    .awaiting-pill { background: #fef9c3; color: #92400e; }
    .acq-name { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0 0 0.75rem; }
    .service-details { background: #f8fafc; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid #e2e8f0; }
    .detail-row { display: flex; gap: 0.5rem; font-size: 0.8rem; margin-bottom: 0.4rem; align-items: flex-start; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-label { color: #64748b; font-weight: 600; min-width: 105px; flex-shrink: 0; }
    .detail-value { color: #1e293b; flex: 1; }
    .detail-value.amount { color: #059669; font-weight: 700; font-size: 0.9rem; }
    .detail-value.description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; color: #475569; }
    .loading-details { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.75rem; font-size: 0.75rem; color: #64748b; }
    .spinner-small { width: 14px; height: 14px; border: 2px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .expiry-info { background: #fffbeb; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.8rem; }
    .expiry-label { color: #92400e; font-weight: 500; }
    .expiry-value { color: #78350f; margin-left: 0.3rem; }
    .expiry-value.urgent { color: #dc2626; font-weight: 700; }
    .expiry-countdown { display: block; color: #dc2626; font-weight: 600; margin-top: 0.2rem; font-size: 0.75rem; }
    .payment-notice-box { display: flex; align-items: center; gap: 0.5rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.75rem; font-size: 0.82rem; color: #78350f; }
    .notice-icon { font-size: 1rem; flex-shrink: 0; }
    .cancel-btn { width: 100%; padding: 0.6rem; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .cancel-btn:hover { background: #dc2626; color: white; }
    .cancel-outline-btn { width: 100%; padding: 0.6rem; background: transparent; border: 1px solid #fca5a5; color: #dc2626; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .cancel-outline-btn:hover { background: #dc2626; color: white; }
    .pending-msg { font-size: 0.8rem; color: #64748b; margin: 0.5rem 0; text-align: center; background: #f0f9ff; border-radius: 6px; padding: 0.4rem; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .modal-box { background: white; border-radius: 20px; padding: 1.5rem; width: 90%; max-width: 480px; }
    .modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .modal-icon { font-size: 1.6rem; }
    .modal-header h3 { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-desc { color: #475569; font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.75rem; }
    .reason-label { display: block; font-size: 0.78rem; font-weight: 600; color: #374151; margin-bottom: 0.3rem; }
    .required { color: #dc2626; }
    .reason-input { width: 100%; padding: 0.6rem; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 0.85rem; resize: vertical; font-family: inherit; box-sizing: border-box; }
    .reason-input:focus { outline: none; border-color: #2563eb; }
    .char-count { display: block; text-align: right; font-size: 0.68rem; color: #94a3b8; margin-top: 0.2rem; }
    .modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-secondary { padding: 0.6rem 1.2rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-danger { padding: 0.6rem 1.2rem; background: #dc2626; border: none; border-radius: 10px; color: white; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Document styles */
    .documents-section { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; }
    .doc-section-title { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
    .documents-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .document-item { display: flex; align-items: center; gap: 0.4rem; background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.75rem; }
    .doc-icon { font-size: 0.9rem; }
    .doc-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
    .view-doc-btn { background: #2563eb; color: white; border: none; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.65rem; cursor: pointer; transition: background 0.2s; margin-left: 0.3rem; }
    .view-doc-btn:hover { background: #1d4ed8; }

    /* Document Modal */
    .modal-card { background: white; border-radius: 16px; padding: 1.5rem; width: 90%; max-width: 600px; }
    .document-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .document-modal-header h3 { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .close-modal-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b; }
    .close-modal-btn:hover { color: #dc2626; }
    .document-preview { text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px; margin: 1rem 0; min-height: 200px; display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .preview-image { max-width: 100%; max-height: 300px; border-radius: 8px; }
    .file-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .document-actions { display: flex; justify-content: center; margin-top: 1rem; }
    .download-btn { padding: 0.5rem 1rem; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 0.8rem; cursor: pointer; }
    .download-btn:hover { background: #047857; }

    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .services-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyAcquiredServicesComponent implements OnInit {

  acquisitions: ServiceAcquisition[] = [];
  loading = false;

  showCancelModal = false;
  selectedAcquisition: ServiceAcquisition | null = null;
  cancelReason = '';
  cancelLoading = false;

  // Document modal
  viewingDocument: any = null;
  documentUrl: string = '';

  private currentUserId: number | null = null;
  private currentUserRole: string = '';

  private acquisitionService = inject(AcquisitionService);
  private http = inject(HttpClient);
  private router = inject(Router);

  // Configuration selon le rôle
  private roleConfig = {
    INVESTOR: {
      backLink: '/investisseur/services',
      backText: '← Back to Services',
      title: 'My Investment Requests',
      subtitle: 'Your pending requests and services awaiting payment validation',
      browseLink: '/investisseur/services',
      emptyMessage: 'Browse investment services and request the ones that interest you.',
      emptyIcon: '📭',
      emptyTitle: 'No active requests'
    },
    INTERNATIONAL_COMPANY: {
      backLink: '/societe-international/services',
      backText: '← Back to Investment Services',
      title: 'My Company Investment Requests',
      subtitle: 'Your company\'s pending requests and services awaiting payment validation',
      browseLink: '/societe-international/services',
      emptyMessage: 'Browse investment opportunities and request the ones that interest your company.',
      emptyIcon: '🏢',
      emptyTitle: 'No active company requests'
    }
  };

  get config() {
    return this.roleConfig[this.currentUserRole as keyof typeof this.roleConfig] 
      || this.roleConfig.INVESTOR;
  }

  // ✅ CORRIGÉ: Utiliser paymentStatus au lieu de status
  get pendingAcquisitions(): ServiceAcquisition[] {
    return this.acquisitions.filter(a =>
      a.paymentStatus === 'PENDING_PARTNER_APPROVAL' && a.serviceType === 'INVESTMENT'
    );
  }

  // ✅ CORRIGÉ: Utiliser AWAITING_VALIDATION au lieu de AWAITING_PAYMENT
  get reservedAcquisitions(): ServiceAcquisition[] {
    return this.acquisitions.filter(a =>
      a.paymentStatus === 'AWAITING_VALIDATION' && a.serviceType === 'INVESTMENT'
    );
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      return JSON.parse(atob(padded));
    } catch (e) { return null; }
  }

  private extractRole(payload: any): string {
    const roles: string[] = payload?.realm_access?.roles || [];
    if (roles.includes('INVESTOR')) return 'INVESTOR';
    if (roles.includes('INTERNATIONAL_COMPANY')) return 'INTERNATIONAL_COMPANY';
    return 'INVESTOR';
  }

  private loadUserIdFromToken(): Promise<void> {
    return new Promise((resolve) => {
      const token = localStorage.getItem('auth_token');
      if (!token) { resolve(); return; }
      const jwtPayload = this.decodeJwt(token);
      this.currentUserRole = this.extractRole(jwtPayload);
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      this.http.get<any>('http://localhost:8089/api/auth/me', { headers }).subscribe({
        next: (profile) => { 
          this.currentUserId = profile.id ?? profile.userId ?? null; 
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  ngOnInit(): void { this.init(); }

  async init(): Promise<void> {
    await this.loadUserIdFromToken();
    this.loadMyAcquisitions();
  }

  // ✅ CORRIGÉ: Utiliser getMyAllAcquisitions()
  loadMyAcquisitions(): void {
    this.loading = true;
    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (data: ServiceAcquisition[]) => {
        this.acquisitions = data.filter(a =>
          a.serviceType === 'INVESTMENT' &&
          (a.paymentStatus === 'PENDING_PARTNER_APPROVAL' || a.paymentStatus === 'AWAITING_VALIDATION')
        );
        this.acquisitions.forEach(acq => this.loadServiceDetails(acq));
        this.loading = false;
      },
      error: (err: any) => { 
        console.error('Error loading acquisitions:', err);
        this.loading = false; 
      }
    });
  }

  loadServiceDetails(acquisition: ServiceAcquisition): void {
    acquisition.detailsLoading = true;
    this.http.get<any>(
      `http://localhost:8089/api/investment-services/${acquisition.serviceId}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (service) => { 
        acquisition.serviceDetails = service; 
        acquisition.detailsLoading = false; 
      },
      error: (err: any) => { 
        console.error(`Error loading service ${acquisition.serviceId}:`, err);
        acquisition.serviceDetails = null; 
        acquisition.detailsLoading = false; 
      }
    });
  }

  // ✅ CORRIGÉ: Supprimer paymentUrl - paiement hors ligne
  payNow(acquisition: ServiceAcquisition): void {
    alert(
      `Please pay ${acquisition.amount ? acquisition.amount.toLocaleString() : '?'} TND ` +
      `offline to your local partner.\n\nOnce paid, contact your partner to confirm reception.`
    );
  }

  isExpiringSoon(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    const diffHours = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 2 && diffHours > 0;
  }

  openCancelModal(acquisition: ServiceAcquisition): void {
    this.selectedAcquisition = acquisition;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.selectedAcquisition = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.selectedAcquisition || this.cancelReason.trim().length < 5) return;
    this.cancelLoading = true;
    this.acquisitionService.cancelRequest(
      this.selectedAcquisition.id,
      this.cancelReason.trim()
    ).subscribe({
      next: () => {
        this.acquisitions = this.acquisitions.filter(a => a.id !== this.selectedAcquisition!.id);
        this.cancelLoading = false;
        this.closeCancelModal();
        alert('✅ Request cancelled successfully.');
      },
      error: (err: any) => {
        this.cancelLoading = false;
        alert('❌ ' + (err.error?.error || 'Error cancelling request'));
      }
    });
  }

  // ─── Document Methods ─────────────────────────
  viewDocument(doc: any): void {
    this.viewingDocument = doc;
    const url = `http://localhost:8089${doc.downloadUrl}`;
    
    if (doc.fileType && doc.fileType.startsWith('image/')) {
      this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          this.documentUrl = URL.createObjectURL(blob);
        },
        error: (err: any) => {
          console.error('Error loading image:', err);
          this.documentUrl = '';
        }
      });
    } else {
      this.documentUrl = url;
    }
  }

  closeDocumentModal(): void {
    if (this.documentUrl && this.documentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.documentUrl);
    }
    this.viewingDocument = null;
    this.documentUrl = '';
  }

  downloadDocument(doc: any): void {
    const url = `http://localhost:8089${doc.downloadUrl}`;
    this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = doc.fileName;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (err: any) => {
        console.error('Download error:', err);
        alert('Error downloading file');
      }
    });
  }

  isImage(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }
}