import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { AcquisitionService } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-partner-acquisition-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <div class="page-header">
            <h1>Acquisition Requests</h1>
            <p class="subtitle">Manage requests from investors and partners</p>
          </div>

          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading requests...</p>
          </div>

          <div class="empty-state" *ngIf="!loading && requests.length === 0">
            <div class="empty-icon">📭</div>
            <h3>No pending requests</h3>
            <p>You have no acquisition requests at the moment.</p>
          </div>

          <div class="requests-list" *ngIf="!loading && requests.length > 0">
            <div class="request-card" *ngFor="let r of requests">

              <!-- En-tête avec type et montant -->
              <div class="request-header">
                <div class="service-info">
                  <span class="service-type-badge"
                    [class.investment]="r.serviceType === 'INVESTMENT'"
                    [class.collaboration]="r.serviceType === 'COLLABORATION'">
                    {{ r.serviceType === 'INVESTMENT' ? '📈' : '🤝' }}
                    {{ r.serviceType }}
                  </span>
                  <h3 class="service-name">{{ r.serviceName }}</h3>
                </div>
                <span class="amount-badge">{{ r.amount | number }} TND</span>
              </div>

              <!-- Informations du demandeur -->
              <div class="section-title">👤 Requester Information</div>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">{{ r.acquirerEmail }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Role:</span>
                  <span class="info-value role-badge">{{ r.acquirerRole }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ID:</span>
                  <span class="info-value">{{ r.acquirerId }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Request Date:</span>
                  <span class="info-value">{{ r.acquiredAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>

              <!-- Informations détaillées du service (chargées dynamiquement) -->
              <div class="section-title" *ngIf="r.serviceDetails">📋 Service Details</div>
              <div class="info-grid" *ngIf="r.serviceDetails">
                <div class="info-row">
                  <span class="info-label">Title:</span>
                  <span class="info-value">{{ r.serviceDetails.title || r.serviceDetails.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Description:</span>
                  <span class="info-value description-text">{{ r.serviceDetails.description | slice:0:200 }}{{ (r.serviceDetails.description?.length || 0) > 200 ? '...' : '' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Region:</span>
                  <span class="info-value">{{ r.serviceDetails.region?.name || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Zone:</span>
                  <span class="info-value">{{ r.serviceDetails.zone || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Economic Sector:</span>
                  <span class="info-value">{{ r.serviceDetails.economicSector?.name || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Amount:</span>
                  <span class="info-value">{{ r.serviceDetails.totalAmount | number }} TND</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Minimum Amount:</span>
                  <span class="info-value">{{ r.serviceDetails.minimumAmount | number }} TND</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Deadline:</span>
                  <span class="info-value">{{ r.serviceDetails.deadlineDate | date:'dd/MM/yyyy' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Project Duration:</span>
                  <span class="info-value">{{ r.serviceDetails.projectDuration || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Availability:</span>
                  <span class="info-value">{{ r.serviceDetails.availability || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact Person:</span>
                  <span class="info-value">{{ r.serviceDetails.contactPerson || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Service Status:</span>
                  <span class="info-value">
                    <span class="status-badge" [class.pending]="r.serviceDetails.status === 'PENDING_ACQUISITION'">
                      {{ r.serviceDetails.status === 'PENDING_ACQUISITION' ? '⏳ Pending Approval' : r.serviceDetails.status }}
                    </span>
                  </span>
                </div>
              </div>

              <!-- Documents section -->
              <div class="section-title" *ngIf="r.serviceDetails?.documents?.length > 0">📎 Documents</div>
              <div class="documents-list" *ngIf="r.serviceDetails?.documents?.length > 0">
                <div class="document-item" *ngFor="let doc of r.serviceDetails.documents">
                  <span class="doc-icon">📄</span>
                  <span class="doc-name">{{ doc.fileName }}</span>
                  <button class="view-doc-btn" (click)="viewDocument(doc)">View</button>
                </div>
              </div>

              <!-- Actions -->
              <div class="request-actions">
                <button
                  class="approve-btn"
                  (click)="approve(r)"
                  [disabled]="r.loading">
                  <span *ngIf="!r.loading">✅ Approve</span>
                  <span *ngIf="r.loading">Processing...</span>

                </button>

                <button
                  class="reject-btn"
                  (click)="showRejectModal(r)"
                  [disabled]="r.loading">
                  ❌ Reject
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div class="modal-overlay" *ngIf="rejectingRequest" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3>Reject Request</h3>
        <p>Service: <strong>{{ rejectingRequest.serviceName }}</strong></p>
        <p>Requester: {{ rejectingRequest.acquirerEmail }}</p>
        <textarea
          [(ngModel)]="rejectReason"
          placeholder="Please provide a reason for rejection..."
          rows="4"
          class="reject-textarea">
        </textarea>
        <div class="modal-actions">
          <button class="cancel-btn" (click)="closeModal()">Cancel</button>
          <button class="confirm-reject-btn"
            (click)="confirmReject()"
            [disabled]="!rejectReason.trim()">
            Confirm Rejection
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
    .page-layout { display: flex; min-height: 100vh; background: #f8fafc; }
    app-navbar { width: 280px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; }
    .page-main { flex: 1; padding: 2rem; overflow-y: auto; }
    .page-content { max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 50px; height: 4px;
      background: linear-gradient(90deg, #7c3aed, #2563eb); margin-top: 0.4rem;
      border-radius: 2px; }
    .subtitle { color: #64748b; margin: 0; }
    .loading-state, .empty-state { text-align: center; padding: 4rem;
      background: white; border-radius: 16px; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0;
      border-top-color: #7c3aed; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .requests-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .request-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0;
      padding: 1.5rem; transition: box-shadow 0.2s; }
    .request-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .request-header { display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 1.5rem; }
    .service-info { display: flex; flex-direction: column; gap: 0.3rem; }
    .service-type-badge { display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem;
      border-radius: 50px; width: fit-content; }
    .service-type-badge.investment { background: #eff6ff; color: #1d4ed8; }
    .service-type-badge.collaboration { background: #f3e8ff; color: #7c3aed; }
    .service-name { font-size: 1.1rem; font-weight: 600; color: #0f172a; margin: 0; }
    .amount-badge { background: #f0fdf4; color: #15803d; border: 1px solid #86efac;
      padding: 0.3rem 0.8rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; }
    .section-title { font-size: 0.9rem; font-weight: 600; color: #1e293b;
      margin: 1rem 0 0.75rem 0; padding-bottom: 0.3rem; border-bottom: 2px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem;
      background: #f8fafc; padding: 0.8rem; border-radius: 8px; margin-bottom: 0.5rem; }
    .info-row { display: flex; gap: 0.5rem; font-size: 0.85rem; }
    .info-label { color: #64748b; font-weight: 500; min-width: 110px; }
    .info-value { color: #1e293b; word-break: break-word; }
    .description-text { line-height: 1.4; }
    .role-badge { background: #e0f2fe; color: #0369a1;
      padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.78rem;
      display: inline-block; }
    .status-badge { padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.78rem;
      background: #fef3c7; color: #92400e; }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .documents-list { display: flex; flex-wrap: wrap; gap: 0.5rem;
      background: #f8fafc; padding: 0.8rem; border-radius: 8px; margin-bottom: 0.5rem; }
    .document-item { display: flex; align-items: center; gap: 0.5rem;
      background: white; padding: 0.3rem 0.6rem; border-radius: 6px;
      border: 1px solid #e2e8f0; font-size: 0.8rem; }
    .doc-icon { font-size: 1rem; }
    .doc-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; color: #334155; }
    .view-doc-btn { background: #2563eb; color: white; border: none;
      padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem;
      cursor: pointer; transition: background 0.2s; }
    .view-doc-btn:hover { background: #1d4ed8; }
    .request-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .approve-btn { flex: 1; padding: 0.65rem; background: #059669;
      color: white; border: none; border-radius: 8px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; }
    .approve-btn:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }
    .approve-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .reject-btn { flex: 1; padding: 0.65rem; background: white;
      color: #dc2626; border: 1px solid #fca5a5; border-radius: 8px;
      font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .reject-btn:hover:not(:disabled) { background: #fef2f2; transform: translateY(-1px); }
    .reject-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    /* Modal styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: white; border-radius: 16px; padding: 1.5rem;
      max-width: 500px; width: 100%; }
    .document-modal { max-width: 700px; }
    .document-modal-header { display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 1rem; }
    .close-modal-btn { background: none; border: none; font-size: 1.5rem;
      cursor: pointer; color: #64748b; }
    .close-modal-btn:hover { color: #dc2626; }
    .modal-card h3 { font-size: 1.2rem; font-weight: 700; color: #0f172a;
      margin: 0; }
    .modal-card p { color: #64748b; font-size: 0.88rem; margin: 0 0 0.3rem; }
    .modal-card p strong { color: #0f172a; }
    .reject-textarea { width: 100%; margin-top: 0.75rem; padding: 0.75rem;
      border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem;
      resize: vertical; outline: none; font-family: inherit;
      box-sizing: border-box; }
    .reject-textarea:focus { border-color: #7c3aed; }
    .modal-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .cancel-btn { flex: 1; padding: 0.65rem; background: #f1f5f9;
      color: #374151; border: none; border-radius: 8px; font-weight: 600;
      cursor: pointer; }
    .cancel-btn:hover { background: #e2e8f0; }
    .confirm-reject-btn { flex: 1; padding: 0.65rem; background: #dc2626;
      color: white; border: none; border-radius: 8px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; }
    .confirm-reject-btn:hover:not(:disabled) { background: #b91c1c; }
    .confirm-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Document preview */
    .document-preview { text-align: center; padding: 1rem;
      background: #f8fafc; border-radius: 8px; margin: 1rem 0;
      min-height: 200px; display: flex; align-items: center;
      justify-content: center; flex-direction: column; }
    .preview-image { max-width: 100%; max-height: 400px; border-radius: 8px; }
    .file-icon { font-size: 4rem; margin-bottom: 0.5rem; }
    .document-actions { display: flex; justify-content: center; margin-top: 1rem; }
    .download-btn { padding: 0.6rem 1.2rem; background: #059669;
      color: white; border: none; border-radius: 8px; font-weight: 600;
      cursor: pointer; transition: background 0.2s; }
    .download-btn:hover { background: #047857; }
    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .info-grid { grid-template-columns: 1fr; }
      .request-header { flex-direction: column; gap: 0.5rem; }
    }
  `]
})
export class PartnerAcquisitionRequestsComponent implements OnInit {

  requests: any[] = [];
  loading = false;
  rejectingRequest: any = null;
  rejectReason = '';
  viewingDocument: any = null;
  documentUrl: string = '';

  private acquisitionService = inject(AcquisitionService);
  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadRequests();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadRequests(): void {
    this.loading = true;
    this.acquisitionService.getPartnerPendingRequests().subscribe({
      next: (data) => {
        this.requests = data;
        // Charger les détails de chaque service
        this.requests.forEach(request => {
          this.loadServiceDetails(request);
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadServiceDetails(request: any): void {
    const serviceType = request.serviceType.toLowerCase();
    const endpoint = `http://localhost:8089/api/${serviceType}-services/${request.serviceId}`;
    
    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (service) => {
        request.serviceDetails = service;
        // Séparer les images des autres documents
        if (service.documents && service.documents.length > 0) {
          request.serviceDetails.images = service.documents.filter((d: any) => 
            d.fileType && d.fileType.startsWith('image/'));
          request.serviceDetails.otherDocuments = service.documents.filter((d: any) => 
            !d.fileType || !d.fileType.startsWith('image/'));
        }
      },
      error: (err) => {
        console.error(`❌ Error loading service ${request.serviceId}:`, err);
        request.serviceDetails = null;
      }
    });
  }

  approve(request: any): void {
    request.loading = true;
    this.acquisitionService.approveRequest(request.id).subscribe({
      next: (res) => {
        request.loading = false;
        this.requests = this.requests.filter(r => r.id !== request.id);
        const link = res?.result?.link;
        if (link) {
          alert('✅ Request approved! The user will receive a payment link.');
        } else {
          alert('✅ Request approved successfully!');
        }
      },
      error: (err) => {
        request.loading = false;
        alert('❌ ' + (err.error?.error || 'Error approving request'));
      }
    });
  }

  showRejectModal(request: any): void {
    this.rejectingRequest = request;
    this.rejectReason = '';
  }

  closeModal(): void {
    this.rejectingRequest = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) return;

    this.rejectingRequest.loading = true;
    this.acquisitionService.rejectRequest(this.rejectingRequest.id, this.rejectReason)
      .subscribe({
        next: () => {
          this.requests = this.requests.filter(
            r => r.id !== this.rejectingRequest.id);
          this.closeModal();
          alert('✅ Request rejected.');
        },
        error: (err) => {
          this.rejectingRequest.loading = false;
          alert('❌ ' + (err.error?.error || 'Error rejecting request'));
        }
      });
  }

  viewDocument(doc: any): void {
    this.viewingDocument = doc;
    const url = `http://localhost:8089${doc.downloadUrl}`;
    
    if (doc.fileType && doc.fileType.startsWith('image/')) {
      this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          this.documentUrl = URL.createObjectURL(blob);
        },
        error: (err) => {
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
      error: (err) => {
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