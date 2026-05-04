// partner-acquisition-requests.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-partner-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">
        <div class="page-content">

          <div class="page-header">
            <h1>Manage Acquisition Requests</h1>
            <p class="subtitle">Approve requests and confirm offline payments</p>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button class="tab" [class.active]="activeTab === 'pending-approval'"
              (click)="activeTab = 'pending-approval'">
              Pending Approval
              <span class="badge" *ngIf="pendingApprovalRequests.length > 0">
                {{ pendingApprovalRequests.length }}
              </span>
            </button>
            <button class="tab" [class.active]="activeTab === 'awaiting-validation'"
              (click)="activeTab = 'awaiting-validation'">
              Awaiting Validation
              <span class="badge" *ngIf="awaitingValidationRequests.length > 0">
                {{ awaitingValidationRequests.length }}
              </span>
            </button>
            <button class="tab" [class.active]="activeTab === 'completed'"
              (click)="activeTab = 'completed'">
              Completed
              <span class="badge completed-badge" *ngIf="completedRequests.length > 0">
                {{ completedRequests.length }}
              </span>
            </button>
          </div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading requests...</p>
          </div>

          <!-- ==================== PENDING APPROVAL TAB ==================== -->
          <ng-container *ngIf="!loading && activeTab === 'pending-approval'">
            <div class="empty-state" *ngIf="pendingApprovalRequests.length === 0">
              <div class="empty-icon">📋</div>
              <h3>No pending approvals</h3>
              <p>All acquisition requests have been processed.</p>
            </div>

            <div class="cards-list" *ngIf="pendingApprovalRequests.length > 0">
              <div class="service-card pending-approval" *ngFor="let r of pendingApprovalRequests">

                <div class="card-top approval-top">
                  <div class="card-top-left">
                    <span class="service-badge"
                      [class.investment]="r.serviceType === 'INVESTMENT'"
                      [class.collaboration]="r.serviceType === 'COLLABORATION'">
                      {{ r.serviceType === 'INVESTMENT' ? '📈' : '🤝' }}
                      {{ r.serviceType }}
                    </span>
                    <h3 class="card-title">{{ r.serviceName }}</h3>
                  </div>
                  <span class="amount-pill">{{ r.amount | number }} TND</span>
                </div>

                <div class="card-body">
                  <div class="section-label">Acquirer Information</div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Email:</span>
                      <span class="info-val">{{ r.acquirerEmail }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Role:</span>
                      <span class="info-val">
                        <span class="role-badge" [class.investor]="r.acquirerRole === 'INVESTOR'"
                          [class.company]="r.acquirerRole === 'INTERNATIONAL_COMPANY'">
                          {{ r.acquirerRole }}
                        </span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Status:</span>
                      <span class="info-val">
                        <span class="status-pill pending-approval-pill">⏳ PENDING_APPROVAL</span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Request Date:</span>
                      <span class="info-val">{{ r.acquiredAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>

                  <!-- Instruction -->
                  <div class="approval-notice">
                    <span class="notice-icon">📝</span>
                    <span>The user wants to acquire this service for <strong>{{ r.amount | number }} TND</strong>.
                      Review the request and approve or reject.</span>
                  </div>
                </div>

                <div class="card-footer">
                  <button class="btn btn-reject"
                    (click)="showRejectApprovalModal(r)"
                    [disabled]="r.cancelLoading">
                    ❌ Reject
                  </button>
                  <button class="btn btn-approve"
                    (click)="showApproveModal(r)"
                    [disabled]="r.cancelLoading">
                    <span *ngIf="!r.cancelLoading">✅ Approve Request</span>
                    <span *ngIf="r.cancelLoading">Processing...</span>
                  </button>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ==================== AWAITING VALIDATION TAB ==================== -->
          <ng-container *ngIf="!loading && activeTab === 'awaiting-validation'">
            <div class="empty-state" *ngIf="awaitingValidationRequests.length === 0">
              <div class="empty-icon">✅</div>
              <h3>No pending validations</h3>
              <p>All approved payments have been validated.</p>
            </div>

            <div class="cards-list" *ngIf="awaitingValidationRequests.length > 0">
              <div class="service-card" *ngFor="let r of awaitingValidationRequests">

                <div class="card-top validation-top">
                  <div class="card-top-left">
                    <span class="service-badge"
                      [class.investment]="r.serviceType === 'INVESTMENT'"
                      [class.collaboration]="r.serviceType === 'COLLABORATION'">
                      {{ r.serviceType === 'INVESTMENT' ? '📈' : '🤝' }}
                      {{ r.serviceType }}
                    </span>
                    <h3 class="card-title">{{ r.serviceName }}</h3>
                  </div>
                  <span class="amount-pill">{{ r.amount | number }} TND</span>
                </div>

                <div class="card-body">
                  <div class="section-label">Acquirer Information</div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Email:</span>
                      <span class="info-val">{{ r.acquirerEmail }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Role:</span>
                      <span class="info-val">
                        <span class="role-badge" [class.investor]="r.acquirerRole === 'INVESTOR'"
                          [class.company]="r.acquirerRole === 'INTERNATIONAL_COMPANY'">
                          {{ r.acquirerRole }}
                        </span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Status:</span>
                      <span class="info-val">
                        <span class="status-pill awaiting">⏳ AWAITING_VALIDATION</span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Approved on:</span>
                      <span class="info-val">{{ r.approvedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>

                  <!-- Instruction -->
                  <div class="payment-notice">
                    <span class="notice-icon">💳</span>
                    <span>The user has been instructed to pay <strong>{{ r.amount | number }} TND</strong>
                      offline. Confirm only after receiving the payment.</span>
                  </div>
                </div>

                <div class="card-footer">
                  <button class="btn btn-reject"
                    (click)="showRejectValidationModal(r)"
                    [disabled]="r.cancelLoading">
                    ❌ Reject Payment
                  </button>
                  <button class="btn btn-validate"
                    (click)="showValidateModal(r)"
                    [disabled]="r.cancelLoading">
                    <span *ngIf="!r.cancelLoading">✅ Confirm Payment</span>
                    <span *ngIf="r.cancelLoading">Processing...</span>
                  </button>
                </div>

              </div>
            </div>
          </ng-container>

          <!-- ==================== COMPLETED TAB ==================== -->
          <ng-container *ngIf="!loading && activeTab === 'completed'">
            <div class="empty-state" *ngIf="completedRequests.length === 0">
              <div class="empty-icon">📭</div>
              <h3>No completed requests yet</h3>
            </div>

            <div class="cards-list" *ngIf="completedRequests.length > 0">
              <div class="service-card completed-card" *ngFor="let r of completedRequests">
                <div class="card-top completed-top">
                  <div class="card-top-left">
                    <span class="service-badge"
                      [class.investment]="r.serviceType === 'INVESTMENT'"
                      [class.collaboration]="r.serviceType === 'COLLABORATION'">
                      {{ r.serviceType === 'INVESTMENT' ? '📈' : '🤝' }}
                      {{ r.serviceType }}
                    </span>
                    <h3 class="card-title">{{ r.serviceName }}</h3>
                  </div>
                  <span class="amount-pill">{{ r.amount | number }} TND</span>
                </div>
                <div class="card-body">
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Email:</span>
                      <span class="info-val">{{ r.acquirerEmail }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Status:</span>
                      <span class="info-val">
                        <span class="status-pill completed">✅ COMPLETED</span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Paid on:</span>
                      <span class="info-val">{{ r.paidAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

        </div>
      </div>
    </div>

    <!-- ==================== APPROVE MODAL ==================== -->
    <div class="modal-overlay" *ngIf="approvingRequest" (click)="closeModals()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-icon success-icon">✅</div>
        <h3>Approve Acquisition Request</h3>
        <p class="modal-service">{{ approvingRequest.serviceName }}</p>
        <p class="modal-sub">From: {{ approvingRequest.acquirerEmail }}</p>
        <div class="modal-warning">
          <span>⚠️</span>
          <span>This will mark the service as <strong>RESERVED</strong> and notify the user
            to proceed with offline payment. The service will be reserved for 48 hours.</span>
        </div>
        <div class="modal-amount">
          Amount to approve: <strong>{{ approvingRequest.amount | number }} TND</strong>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeModals()">Cancel</button>
          <button class="btn-confirm-approve" (click)="confirmApprove()">
            ✅ Approve Request
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== VALIDATE MODAL ==================== -->
    <div class="modal-overlay" *ngIf="validatingRequest" (click)="closeModals()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-icon success-icon">✅</div>
        <h3>Confirm Payment Receipt</h3>
        <p class="modal-service">{{ validatingRequest.serviceName }}</p>
        <p class="modal-sub">From: {{ validatingRequest.acquirerEmail }}</p>
        <div class="modal-warning">
          <span>⚠️</span>
          <span>This will mark the service as <strong>COMPLETED</strong> and grant access
            to the acquirer. This action is irreversible.</span>
        </div>
        <div class="modal-amount">
          Amount to confirm: <strong>{{ validatingRequest.amount | number }} TND</strong>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeModals()">Cancel</button>
          <button class="btn-confirm-validate" (click)="confirmValidate()">
            ✅ Confirm Payment
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== REJECT APPROVAL MODAL ==================== -->
    <div class="modal-overlay" *ngIf="rejectingApprovalRequest" (click)="closeModals()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-icon danger-icon">❌</div>
        <h3>Reject Acquisition Request</h3>
        <p class="modal-service">{{ rejectingApprovalRequest.serviceName }}</p>
        <p class="modal-sub">From: {{ rejectingApprovalRequest.acquirerEmail }}</p>
        <textarea
          [(ngModel)]="rejectReason"
          placeholder="Provide a reason for rejection..."
          rows="4"
          class="reject-textarea">
        </textarea>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeModals()">Cancel</button>
          <button class="btn-confirm-reject" (click)="confirmRejectApproval()"
            [disabled]="!rejectReason.trim()">
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== REJECT VALIDATION MODAL ==================== -->
    <div class="modal-overlay" *ngIf="rejectingValidationRequest" (click)="closeModals()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-icon danger-icon">❌</div>
        <h3>Reject Payment</h3>
        <p class="modal-service">{{ rejectingValidationRequest.serviceName }}</p>
        <p class="modal-sub">From: {{ rejectingValidationRequest.acquirerEmail }}</p>
        <textarea
          [(ngModel)]="rejectReason"
          placeholder="Provide a reason for rejection..."
          rows="4"
          class="reject-textarea">
        </textarea>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeModals()">Cancel</button>
          <button class="btn-confirm-reject" (click)="confirmRejectValidation()"
            [disabled]="!rejectReason.trim()">
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div class="toast" [class.show]="toastVisible" [class.success]="toastType === 'success'"
      [class.error]="toastType === 'error'">
      {{ toastMessage }}
    </div>
  `,
  styles: [`
    /* ─── Layout ─── */
    .page-layout { display: flex; min-height: 100vh; background: #f2f2f2; }
    app-navbar { width: 280px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; }
    .page-main { flex: 1; padding: 2rem; overflow-y: auto; }
    .page-content { max-width: 860px; margin: 0 auto; }

    /* ─── Header ─── */
    .page-header { margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #2f4f7f; margin: 0 0 0.25rem; }
    h1::after {
      content: ''; display: block; width: 44px; height: 4px;
      background: #ffd700; border-radius: 2px; margin-top: 0.4rem;
    }
    .subtitle { color: #64748b; margin: 0.5rem 0 0; font-size: 0.9rem; }

    /* ─── Tabs ─── */
    .tabs {
      display: flex; gap: 0; margin-bottom: 1.5rem;
      background: white; border-radius: 10px; padding: 4px;
      border: 1px solid #e2e8f0; width: fit-content;
    }
    .tab {
      padding: 0.45rem 1.1rem; border-radius: 7px; font-size: 0.83rem;
      font-weight: 600; cursor: pointer; color: #64748b;
      transition: all 0.2s; border: none; background: none;
    }
    .tab.active { background: #2f4f7f; color: #ffd700; }
    .badge {
      background: #ffd700; color: #2f4f7f; border-radius: 50px;
      font-size: 0.68rem; font-weight: 700; padding: 0.05rem 0.45rem; margin-left: 0.3rem;
    }
    .completed-badge { background: #059669; color: white; }

    /* ─── States ─── */
    .loading-state, .empty-state {
      text-align: center; padding: 4rem;
      background: white; border-radius: 14px; border: 1px solid #e2e8f0;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #2f4f7f; margin: 0 0 0.5rem; }
    .empty-state p { color: #64748b; margin: 0; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e2e8f0;
      border-top-color: #2f4f7f; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Cards ─── */
    .cards-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .service-card {
      background: white; border-radius: 14px;
      border: 1px solid #e2e8f0; overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .service-card:hover { box-shadow: 0 6px 24px rgba(47,79,127,0.12); }
    .completed-card { opacity: 0.85; }

    /* Card top banners */
    .card-top {
      padding: 1rem 1.25rem;
      display: flex; justify-content: space-between; align-items: center;
    }
    .approval-top { background: linear-gradient(135deg, #2563eb, #3b82f6); }
    .validation-top { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .completed-top { background: linear-gradient(135deg, #059669, #10b981); }
    .card-top-left { display: flex; flex-direction: column; gap: 0.25rem; }
    .card-title { color: white; font-size: 1rem; font-weight: 600; margin: 0; }

    /* Badges */
    .service-badge {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem;
      border-radius: 50px; width: fit-content;
    }
    .service-badge.investment {
      background: rgba(255,215,0,0.2); color: #ffd700;
      border: 1px solid rgba(255,215,0,0.35);
    }
    .service-badge.collaboration {
      background: rgba(255,255,255,0.15); color: white;
      border: 1px solid rgba(255,255,255,0.3);
    }
    .amount-pill {
      background: #ffd700; color: #1e3355;
      padding: 0.3rem 0.9rem; border-radius: 20px;
      font-weight: 700; font-size: 0.88rem;
    }

    /* Card body */
    .card-body { padding: 1rem 1.25rem; }
    .section-label {
      font-size: 0.7rem; font-weight: 700; color: #2f4f7f;
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 0.5rem;
    }
    .info-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem; background: #f8fafc;
      padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem;
    }
    .info-row { display: flex; gap: 0.4rem; font-size: 0.82rem; }
    .info-label { color: #64748b; font-weight: 500; min-width: 90px; }
    .info-val { color: #1e293b; }

    .role-badge {
      padding: 0.1rem 0.45rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 600; display: inline-block;
    }
    .role-badge.investor { background: #e0f2fe; color: #0369a1; }
    .role-badge.company { background: #f3e8ff; color: #7c3aed; }

    .status-pill {
      padding: 0.15rem 0.55rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 600; display: inline-block;
    }
    .pending-approval-pill { background: #dbeafe; color: #1e40af; }
    .status-pill.awaiting { background: #fffbeb; color: #92400e; }
    .status-pill.completed { background: #f0fdf4; color: #166534; }

    /* Notices */
    .approval-notice {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 8px; padding: 0.65rem 0.85rem;
      font-size: 0.82rem; color: #1e40af;
    }
    .payment-notice {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fffbeb; border: 1px solid #ffd700;
      border-radius: 8px; padding: 0.65rem 0.85rem;
      font-size: 0.82rem; color: #78350f;
    }
    .notice-icon { font-size: 1rem; flex-shrink: 0; margin-top: 0.05rem; }

    /* Card footer */
    .card-footer {
      padding: 0.85rem 1.25rem; background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex; gap: 0.75rem; justify-content: flex-end;
    }
    .btn {
      padding: 0.5rem 1.1rem; border-radius: 8px; font-weight: 600;
      font-size: 0.83rem; border: none; cursor: pointer;
      transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }
    .btn-approve { background: #2563eb; color: white; }
    .btn-approve:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
    .btn-validate { background: #d97706; color: white; }
    .btn-validate:hover:not(:disabled) { background: #b45309; transform: translateY(-1px); }
    .btn-reject { background: white; color: #dc2626; border: 1px solid #fca5a5; }
    .btn-reject:hover:not(:disabled) { background: #fef2f2; }

    /* ─── Modals ─── */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex;
      align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
    }
    .modal-card {
      background: white; border-radius: 16px; padding: 1.75rem;
      max-width: 440px; width: 100%; text-align: center;
    }
    .modal-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .modal-card h3 { color: #2f4f7f; font-size: 1.2rem; margin: 0 0 0.3rem; }
    .modal-service { font-weight: 600; color: #1e293b; margin: 0 0 0.2rem; font-size: 0.95rem; }
    .modal-sub { color: #64748b; font-size: 0.83rem; margin: 0 0 1rem; }
    .modal-warning {
      display: flex; align-items: flex-start; gap: 0.5rem; text-align: left;
      background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
      padding: 0.65rem 0.85rem; margin-bottom: 0.75rem;
      font-size: 0.82rem; color: #78350f;
    }
    .modal-amount {
      background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
      padding: 0.55rem 0.85rem; margin-bottom: 1.25rem;
      font-size: 0.88rem; color: #0369a1;
    }
    .modal-amount strong { font-size: 1.05rem; }
    .reject-textarea {
      width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0;
      border-radius: 8px; font-size: 0.85rem; resize: vertical;
      outline: none; font-family: inherit; box-sizing: border-box;
      margin-bottom: 1.25rem; text-align: left;
    }
    .reject-textarea:focus { border-color: #2f4f7f; }
    .modal-actions { display: flex; gap: 0.75rem; }
    .btn-cancel {
      flex: 1; padding: 0.6rem; background: #f1f5f9; color: #374151;
      border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
      font-size: 0.85rem;
    }
    .btn-cancel:hover { background: #e2e8f0; }
    .btn-confirm-approve {
      flex: 2; padding: 0.6rem; background: #2563eb; color: white;
      border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
      font-size: 0.85rem; transition: background 0.2s;
    }
    .btn-confirm-approve:hover { background: #1d4ed8; }
    .btn-confirm-validate {
      flex: 2; padding: 0.6rem; background: #d97706; color: white;
      border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
      font-size: 0.85rem; transition: background 0.2s;
    }
    .btn-confirm-validate:hover { background: #b45309; }
    .btn-confirm-reject {
      flex: 2; padding: 0.6rem; background: #dc2626; color: white;
      border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
      font-size: 0.85rem; transition: background 0.2s;
    }
    .btn-confirm-reject:hover:not(:disabled) { background: #b91c1c; }
    .btn-confirm-reject:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ─── Toast ─── */
    .toast {
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      padding: 0.75rem 1.25rem; border-radius: 10px;
      font-size: 0.88rem; font-weight: 600; color: white;
      transform: translateY(80px); opacity: 0;
      transition: all 0.3s ease; z-index: 2000; pointer-events: none;
    }
    .toast.show { transform: translateY(0); opacity: 1; }
    .toast.success { background: #059669; }
    .toast.error { background: #dc2626; }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .info-grid { grid-template-columns: 1fr; }
      .page-main { padding: 1rem; }
    }
  `]
})
export class PartnerAcquisitionRequestsComponent implements OnInit {

  // Trois listes distinctes
  pendingApprovalRequests: ServiceAcquisition[] = [];
  awaitingValidationRequests: ServiceAcquisition[] = [];
  completedRequests: ServiceAcquisition[] = [];
  
  loading = false;
  activeTab: 'pending-approval' | 'awaiting-validation' | 'completed' = 'pending-approval';

  // Modals pour approval
  approvingRequest: ServiceAcquisition | null = null;
  rejectingApprovalRequest: ServiceAcquisition | null = null;
  
  // Modals pour validation
  validatingRequest: ServiceAcquisition | null = null;
  rejectingValidationRequest: ServiceAcquisition | null = null;
  
  rejectReason = '';

  toastVisible = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  private acquisitionService = inject(AcquisitionService);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    // 1. Charger les demandes en attente d'approbation (PENDING_PARTNER_APPROVAL)
    this.acquisitionService.getPartnerPendingRequests().subscribe({
      next: (data: ServiceAcquisition[]) => {
        this.pendingApprovalRequests = data.filter(
          (r: ServiceAcquisition) => r.paymentStatus === 'PENDING_PARTNER_APPROVAL'
        );
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading pending approvals:', err);
        this.loading = false;
      }
    });

    // 2. Charger les demandes en attente de validation (AWAITING_VALIDATION)
    this.acquisitionService.getPartnerAwaitingValidation().subscribe({
      next: (data: ServiceAcquisition[]) => {
        this.awaitingValidationRequests = data.filter(
          (r: ServiceAcquisition) => r.paymentStatus === 'AWAITING_VALIDATION'
        );
      },
      error: (err: any) => console.error('Error loading awaiting validation:', err)
    });

    // 3. Charger les demandes complétées (COMPLETED)
    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (data: ServiceAcquisition[]) => {
        this.completedRequests = data.filter(
          (r: ServiceAcquisition) => r.paymentStatus === 'COMPLETED'
        );
      },
      error: (err: any) => console.error('Error loading completed:', err)
    });
  }

  // ==================== APPROVAL MODALS ====================
  showApproveModal(request: ServiceAcquisition): void {
    this.approvingRequest = request;
  }

  showRejectApprovalModal(request: ServiceAcquisition): void {
    this.rejectingApprovalRequest = request;
    this.rejectReason = '';
  }

  confirmApprove(): void {
    if (!this.approvingRequest) return;
    const req = this.approvingRequest;
    this.closeModals();

    req.cancelLoading = true;
    this.acquisitionService.approveRequest(req.id).subscribe({
      next: () => {
        req.cancelLoading = false;
        this.pendingApprovalRequests = this.pendingApprovalRequests.filter(r => r.id !== req.id);
        this.showToast('✅ Request approved — user notified for payment.', 'success');
        this.loadData(); // Rafraîchir toutes les listes
      },
      error: (err: any) => {
        req.cancelLoading = false;
        this.showToast('❌ ' + (err.error?.error || 'Error approving request'), 'error');
      }
    });
  }

  confirmRejectApproval(): void {
    if (!this.rejectingApprovalRequest || !this.rejectReason.trim()) return;
    const req = this.rejectingApprovalRequest;
    const reason = this.rejectReason;
    this.closeModals();

    req.cancelLoading = true;
    this.acquisitionService.rejectRequest(req.id, reason).subscribe({
      next: () => {
        req.cancelLoading = false;
        this.pendingApprovalRequests = this.pendingApprovalRequests.filter(r => r.id !== req.id);
        this.showToast('Request rejected.', 'success');
      },
      error: (err: any) => {
        req.cancelLoading = false;
        this.showToast('❌ ' + (err.error?.error || 'Error rejecting request'), 'error');
      }
    });
  }

  // ==================== VALIDATION MODALS ====================
  showValidateModal(request: ServiceAcquisition): void {
    this.validatingRequest = request;
  }

  showRejectValidationModal(request: ServiceAcquisition): void {
    this.rejectingValidationRequest = request;
    this.rejectReason = '';
  }

  confirmValidate(): void {
    if (!this.validatingRequest) return;
    const req = this.validatingRequest;
    this.closeModals();

    req.cancelLoading = true;
    this.acquisitionService.validatePayment(req.id).subscribe({
      next: () => {
        req.cancelLoading = false;
        this.awaitingValidationRequests = this.awaitingValidationRequests.filter(r => r.id !== req.id);
        this.showToast('✅ Payment confirmed — service is now COMPLETED.', 'success');
        this.loadData(); // Rafraîchir toutes les listes
      },
      error: (err: any) => {
        req.cancelLoading = false;
        this.showToast('❌ ' + (err.error?.error || 'Error confirming payment'), 'error');
      }
    });
  }

  confirmRejectValidation(): void {
    if (!this.rejectingValidationRequest || !this.rejectReason.trim()) return;
    const req = this.rejectingValidationRequest;
    const reason = this.rejectReason;
    this.closeModals();

    req.cancelLoading = true;
    this.acquisitionService.rejectRequest(req.id, reason).subscribe({
      next: () => {
        req.cancelLoading = false;
        this.awaitingValidationRequests = this.awaitingValidationRequests.filter(r => r.id !== req.id);
        this.showToast('Payment rejected.', 'success');
      },
      error: (err: any) => {
        req.cancelLoading = false;
        this.showToast('❌ ' + (err.error?.error || 'Error rejecting payment'), 'error');
      }
    });
  }

  closeModals(): void {
    this.approvingRequest = null;
    this.rejectingApprovalRequest = null;
    this.validatingRequest = null;
    this.rejectingValidationRequest = null;
    this.rejectReason = '';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 3500);
  }
}