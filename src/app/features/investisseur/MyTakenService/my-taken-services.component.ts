import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { AcquisitionService, ServiceAcquisition } from '../../../core/services/acquisition.service';

@Component({
  selector: 'app-my-taken-services',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FormsModule],
  template: `
    <app-navbar></app-navbar>

    <div class="page-layout">
      <div class="page-main">
        <div class="page-content">

          <!-- Header -->
          <div class="page-header">
            <div>
              <a [routerLink]="config.backLink" class="back-link">{{ config.backText }}</a>
              <h1>{{ config.title }}</h1>
              <p class="subtitle">{{ config.subtitle }}</p>
            </div>
            <div class="header-actions">
              <button class="new-btn" (click)="goToServices()">📈 Browse Services</button>
            </div>
          </div>

          <!-- Alerts -->
          <div class="alert alert-success" *ngIf="success">✅ {{ success }}</div>
          <div class="alert alert-error"   *ngIf="error">❌ {{ error }}</div>

          <!-- Loading -->
          <div class="loading-state" *ngIf="loading">
            <div class="spinner"></div>
            <p>Loading your investment services...</p>
          </div>

          <ng-container *ngIf="!loading">

            <!-- TABS -->
            <div class="tabs-wrapper">
              <button class="tab-btn" [class.active]="activeTab === 'requests'"
                      (click)="setTab('requests')">
                ⏳ Pending Requests
                <span class="tab-badge" *ngIf="pendingRequests.length > 0">{{ pendingRequests.length }}</span>
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'reserved'"
                      (click)="setTab('reserved')">
                🎉 Reserved
                <span class="tab-badge reserved" *ngIf="reservedServices.length > 0">{{ reservedServices.length }}</span>
              </button>
              <button class="tab-btn" [class.active]="activeTab === 'taken'"
                      (click)="setTab('taken')">
                ✅ Acquired Services
                <span class="tab-badge taken" *ngIf="acquisitions.length > 0">{{ acquisitions.length }}</span>
              </button>
            </div>

            <!-- ═══ TAB 1 : PENDING REQUESTS ═══ -->
            <div *ngIf="activeTab === 'requests'">
              <div class="empty-state" *ngIf="pendingRequests.length === 0">
                <div class="empty-icon">⏳</div>
                <h3>No pending requests</h3>
                <p>You have no investment requests awaiting approval.</p>
                <button class="browse-btn" (click)="goToServices()">Browse Services</button>
              </div>

              <div class="cards-grid" *ngIf="pendingRequests.length > 0">
                <div class="acq-card pending" *ngFor="let acq of pendingRequests">
                  <div class="card-banner pending-banner">
                    <span class="banner-icon">⏳</span>
                    <span class="banner-text">Awaiting Partner Approval</span>
                  </div>
                  <div class="card-body">
                    <div class="service-type-badge"><span>📈</span> INVESTMENT</div>
                    <h3 class="service-name">{{ acq.serviceName }}</h3>
                    <div class="info-row">
                      <span class="info-label">💰 Amount</span>
                      <span class="info-value amount">{{ acq.amount | number:'1.0-2' }} TND</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">📅 Requested</span>
                      <span class="info-value">{{ acq.acquiredAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">🔖 Order ID</span>
                      <span class="info-value order-id">{{ acq.orderId }}</span>
                    </div>
                    <p class="status-message">
                      Your request has been sent to the local partner and is waiting for their review.
                    </p>
                    <button class="cancel-btn"
                            (click)="cancelRequest(acq)"
                            [disabled]="cancellingMap.get(acq.id)">
                      <span *ngIf="!cancellingMap.get(acq.id)">✖ Cancel Request</span>
                      <span *ngIf="cancellingMap.get(acq.id)">⏳ Cancelling...</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ═══ TAB 2 : RESERVED ═══ -->
            <div *ngIf="activeTab === 'reserved'">
              <div class="empty-state" *ngIf="reservedServices.length === 0">
                <div class="empty-icon">🎉</div>
                <h3>No reserved services</h3>
                <p>No investment services are currently reserved for you.</p>
              </div>

              <div class="cards-grid" *ngIf="reservedServices.length > 0">
                <div class="acq-card reserved" *ngFor="let acq of reservedServices">
                  <div class="card-banner reserved-banner">
                    <span class="banner-icon">🎉</span>
                    <span class="banner-text">Approved — Payment Pending</span>
                  </div>
                  <div class="card-body">
                    <div class="service-type-badge"><span>📈</span> INVESTMENT</div>
                    <h3 class="service-name">{{ acq.serviceName }}</h3>
                    <div class="info-row">
                      <span class="info-label">💰 Amount to Pay</span>
                      <span class="info-value amount highlight">{{ acq.amount | number:'1.0-2' }} TND</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">📅 Approved On</span>
                      <span class="info-value">{{ acq.approvedAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">🔖 Order ID</span>
                      <span class="info-value order-id">{{ acq.orderId }}</span>
                    </div>
                    <div class="pay-info-box">
                      <p>🏦 Please contact the local partner to arrange your offline payment.</p>
                      <p>Once payment is received, the partner will validate and finalize your acquisition.</p>
                    </div>
                    <button class="cancel-btn"
                            (click)="cancelReservation(acq)"
                            [disabled]="cancellingMap.get(acq.id)">
                      <span *ngIf="!cancellingMap.get(acq.id)">✖ Cancel Reservation</span>
                      <span *ngIf="cancellingMap.get(acq.id)">⏳ Cancelling...</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ═══ TAB 3 : ACQUIRED ═══ -->
            <div *ngIf="activeTab === 'taken'">
              <div class="empty-state" *ngIf="acquisitions.length === 0">
                <div class="empty-icon">{{ config.emptyIcon }}</div>
                <h3>{{ config.emptyTitle }}</h3>
                <p>{{ config.emptyMessage }}</p>
                <button class="browse-btn" (click)="goToServices()">{{ config.browseText }}</button>
              </div>

              <div class="acquisitions-grid" *ngIf="acquisitions.length > 0">
                <div class="acquisition-card" *ngFor="let a of acquisitions">

                  <!-- Status Banner -->
                  <div class="status-banner banner-completed">
                    <span class="status-icon">✅</span>
                    <span class="status-label">{{ config.statusLabel }}</span>
                    <span class="status-date" *ngIf="a.paidAt">
                      {{ a.paidAt | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>

                  <!-- Card Body -->
                  <div class="card-body">
                    <div class="service-header">
                      <div class="service-type-badge"><span>📈</span> INVESTMENT</div>
                      <h3 class="service-name">{{ a.serviceName }}</h3>
                    </div>

                    <!-- Service Details -->
                    <div class="service-details-section" *ngIf="a.serviceDetails">
                      <div class="details-grid">
                        <div class="detail-item full-width" *ngIf="a.serviceDetails.description">
                          <span class="detail-label">📝 Description</span>
                          <span class="detail-value description">
                            {{ a.serviceDetails.description | slice:0:200 }}{{ (a.serviceDetails.description?.length || 0) > 200 ? '...' : '' }}
                          </span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.title">
                          <span class="detail-label">📌 Title</span>
                          <span class="detail-value">{{ a.serviceDetails.title }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.region">
                          <span class="detail-label">📍 Region</span>
                          <span class="detail-value">{{ a.serviceDetails.region.name }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.zone">
                          <span class="detail-label">🗺️ Zone</span>
                          <span class="detail-value">{{ a.serviceDetails.zone }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.economicSector">
                          <span class="detail-label">🏭 Sector</span>
                          <span class="detail-value">{{ a.serviceDetails.economicSector.name }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.totalAmount">
                          <span class="detail-label">💰 Total Amount</span>
                          <span class="detail-value amount">{{ a.serviceDetails.totalAmount | number }} TND</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.minimumAmount">
                          <span class="detail-label">📊 Min Investment</span>
                          <span class="detail-value">{{ a.serviceDetails.minimumAmount | number }} TND</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.projectDuration">
                          <span class="detail-label">⏱️ Duration</span>
                          <span class="detail-value">{{ a.serviceDetails.projectDuration }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.deadlineDate">
                          <span class="detail-label">📅 Deadline</span>
                          <span class="detail-value">{{ a.serviceDetails.deadlineDate | date:'dd/MM/yyyy' }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.availability">
                          <span class="detail-label">📅 Availability</span>
                          <span class="detail-value">{{ a.serviceDetails.availability }}</span>
                        </div>
                        <div class="detail-item" *ngIf="a.serviceDetails.contactPerson">
                          <span class="detail-label">👤 Contact Person</span>
                          <span class="detail-value">{{ a.serviceDetails.contactPerson }}</span>
                        </div>
                      </div>

                      <!-- Provider -->
                      <div class="provider-section" *ngIf="a.serviceDetails.provider">
                        <div class="provider-card">
                          <div class="provider-avatar">
                            {{ (a.serviceDetails.provider.firstName || 'P').charAt(0).toUpperCase() }}
                          </div>
                          <div class="provider-info">
                            <span class="provider-name">
                              {{ a.serviceDetails.provider.firstName }} {{ a.serviceDetails.provider.lastName }}
                            </span>
                            <span class="provider-email">{{ a.serviceDetails.provider.email }}</span>
                          </div>
                          <button class="contact-provider-btn"
                                  (click)="contactProvider(a.serviceDetails.provider)">
                            💬 Contact
                          </button>
                        </div>
                      </div>

                      <!-- Documents -->
                      <div class="documents-section" *ngIf="a.serviceDetails.documents?.length > 0">
                        <h4 class="section-title">📎 Documents</h4>
                        <div class="documents-grid">
                          <div class="document-item" *ngFor="let doc of a.serviceDetails.documents">
                            <span class="doc-icon">{{ isImage(doc.fileName) ? '🖼️' : '📄' }}</span>
                            <span class="doc-name">{{ doc.fileName }}</span>
                            <button class="view-doc-btn" (click)="viewDocument(doc)">View</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Loading details -->
                    <div class="loading-details" *ngIf="!a.serviceDetails && !a.detailsLoading">
                      <div class="spinner-small"></div>
                      <span>Loading service details...</span>
                    </div>

                    <!-- Payment Info -->
                    <div class="payment-info">
                      <div class="info-row">
                        <span class="info-label">💰 Amount Paid:</span>
                        <span class="info-value amount">{{ a.amount | number:'1.0-2' }} TND</span>
                      </div>
                      <div class="info-row" *ngIf="a.paidAt">
                        <span class="info-label">✅ Paid on:</span>
                        <span class="info-value">{{ a.paidAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">🆔 Order ID:</span>
                        <span class="info-value mono">{{ a.orderId }}</span>
                      </div>
                    </div>

                    <!-- Access Badge -->
                    <div class="access-badge">
                      🔓 Full access granted — You can now access this service
                    </div>

                    <!-- Actions -->
                    <div class="card-actions">
                      <button class="view-details-btn" (click)="viewServiceDetails(a)">
                        👁️ View Full Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </ng-container>
        </div>
      </div>
    </div>

    <!-- ═══ DETAIL MODAL ═══ -->
    <div class="modal-overlay" *ngIf="showDetailModal" (click)="closeDetailModal()">
      <div class="detail-modal-box" (click)="$event.stopPropagation()">
        <div class="detail-header">
          <div class="detail-title-row">
            <span class="detail-type-badge">📈 INVESTMENT</span>
            <button class="close-btn" (click)="closeDetailModal()">✕</button>
          </div>
          <h2 class="detail-title">{{ selectedService?.serviceName }}</h2>
          <div class="acquired-badge">
            ✅ Acquired — Paid on {{ selectedService?.paidAt | date:'dd/MM/yyyy' }}
          </div>
        </div>

        <div class="detail-body" *ngIf="serviceDetail">
          <div class="detail-section">
            <h4 class="section-title">💰 Financial Details</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Total Amount</span>
                <span class="info-value highlight">{{ serviceDetail.totalAmount | number:'1.0-2' }} TND</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.minimumAmount">
                <span class="info-label">Min Investment</span>
                <span class="info-value">{{ serviceDetail.minimumAmount | number:'1.0-2' }} TND</span>
              </div>
              <div class="info-item">
                <span class="info-label">Amount Paid</span>
                <span class="info-value highlight">{{ selectedService?.amount | number:'1.0-2' }} TND</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">📋 Service Details</h4>
            <div class="info-grid">
              <div class="info-item" *ngIf="serviceDetail.title">
                <span class="info-label">📌 Title</span>
                <span class="info-value">{{ serviceDetail.title }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.region">
                <span class="info-label">📍 Region</span>
                <span class="info-value">{{ serviceDetail.region?.name }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.zone">
                <span class="info-label">🗺️ Zone</span>
                <span class="info-value">{{ serviceDetail.zone }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.economicSector">
                <span class="info-label">🏭 Sector</span>
                <span class="info-value">{{ serviceDetail.economicSector?.name }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.projectDuration">
                <span class="info-label">⏱️ Duration</span>
                <span class="info-value">{{ serviceDetail.projectDuration }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.deadlineDate">
                <span class="info-label">📅 Deadline</span>
                <span class="info-value">{{ serviceDetail.deadlineDate | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.availability">
                <span class="info-label">📅 Availability</span>
                <span class="info-value">{{ serviceDetail.availability }}</span>
              </div>
              <div class="info-item" *ngIf="serviceDetail.contactPerson">
                <span class="info-label">👤 Contact</span>
                <span class="info-value">{{ serviceDetail.contactPerson }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" *ngIf="serviceDetail.description">
            <h4 class="section-title">📝 Description</h4>
            <p class="description-text">{{ serviceDetail.description }}</p>
          </div>

          <div class="detail-section provider-section" *ngIf="serviceDetail.provider">
            <h4 class="section-title">🏢 Provider</h4>
            <div class="provider-card">
              <div class="provider-avatar">
                {{ (serviceDetail.provider.firstName || 'P').charAt(0).toUpperCase() }}
              </div>
              <div class="provider-info">
                <span class="provider-name">
                  {{ serviceDetail.provider.firstName }} {{ serviceDetail.provider.lastName }}
                </span>
                <span class="provider-email">{{ serviceDetail.provider.email }}</span>
              </div>
              <button class="contact-provider-btn" (click)="contactProvider(serviceDetail.provider)">
                💬 Contact
              </button>
            </div>
          </div>

          <div class="detail-section" *ngIf="serviceDetail.documents?.length > 0">
            <h4 class="section-title">📎 Documents</h4>
            <div class="documents-list">
              <div class="document-item" *ngFor="let doc of serviceDetail.documents">
                <span class="doc-icon">{{ isImage(doc.fileName) ? '🖼️' : '📄' }}</span>
                <span class="doc-name">{{ doc.fileName }}</span>
                <button class="view-doc-btn" (click)="viewDocument(doc)">View</button>
                <button class="download-doc-btn" (click)="downloadDocument(doc)">Download</button>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">🧾 Acquisition Details</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Order ID</span>
                <span class="info-value mono">{{ selectedService?.orderId }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Requested on</span>
                <span class="info-value">{{ selectedService?.acquiredAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="info-item" *ngIf="selectedService?.paidAt">
                <span class="info-label">Payment Date</span>
                <span class="info-value">{{ selectedService?.paidAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-footer">
          <button class="btn-secondary" (click)="closeDetailModal()">Close</button>
          <button class="btn-contact"
                  *ngIf="serviceDetail?.provider"
                  (click)="contactProvider(serviceDetail.provider)">
            💬 Contact Provider
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ DOCUMENT MODAL ═══ -->
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
          <div class="file-icon-large">📄</div>
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
    /* ══════════════════════════════
       LAYOUT
    ══════════════════════════════ */
    .page-layout {
      min-height: 100vh;
      background: #f2f2f2;
      font-family: 'Inter', sans-serif;
      padding-top: 90px;
    }
    .page-main { padding: 2rem; }
    .page-content { max-width: 1200px; margin: 0 auto; }

    /* ══════════════════════════════
       HEADER
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       ALERTS
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       LOADING
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       TABS
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       EMPTY STATE
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       GRIDS
    ══════════════════════════════ */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }
    .acquisitions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(550px, 1fr));
      gap: 1.5rem;
    }

    /* ══════════════════════════════
       PENDING / RESERVED CARDS
    ══════════════════════════════ */
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
    .card-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.25rem;
    }
    .pending-banner  { background: linear-gradient(135deg, #2f4f7f, #1e3a5f); }
    .reserved-banner { background: linear-gradient(135deg, #d97706, #b45309); }
    .banner-icon { font-size: 1.1rem; }
    .banner-text {
      color: white;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* ══════════════════════════════
       ACQUIRED CARD
    ══════════════════════════════ */
    .acquisition-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e8ecf0;
      box-shadow: 0 2px 12px rgba(47,79,127,0.06);
      transition: all 0.25s;
    }
    .acquisition-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(47,79,127,0.15);
      border-color: #ffd700;
    }
    .status-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.25rem;
    }
    .banner-completed { background: linear-gradient(135deg, #16a34a, #15803d); color: white; }
    .status-icon { font-size: 1.1rem; }
    .status-label { font-weight: 700; font-size: 0.82rem; flex: 1; letter-spacing: 0.04em; text-transform: uppercase; color: white; }
    .status-date { font-size: 0.75rem; opacity: 0.85; color: white; }

    /* ══════════════════════════════
       CARD BODY COMMUN
    ══════════════════════════════ */
    .card-body { padding: 1.25rem; }
    .service-header { margin-bottom: 1rem; }
    .service-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: rgba(47,79,127,0.1);
      color: #2f4f7f;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      border: 1px solid rgba(47,79,127,0.2);
    }
    .service-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: #2f4f7f;
      margin: 0 0 1rem;
    }

    /* ══════════════════════════════
       INFO ROWS
    ══════════════════════════════ */
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

    /* ══════════════════════════════
       SERVICE DETAILS SECTION
    ══════════════════════════════ */
    .service-details-section {
      background: #f8fafc;
      border-radius: 12px;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-item.full-width { grid-column: span 2; }
    .detail-label {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .detail-value { font-size: 0.85rem; color: #1e293b; font-weight: 500; }
    .detail-value.description { font-weight: normal; color: #475569; line-height: 1.4; }
    .detail-value.amount { color: #2f4f7f; font-weight: 700; }

    /* ══════════════════════════════
       PROVIDER
    ══════════════════════════════ */
    .provider-section { margin-top: 0.75rem; margin-bottom: 0.75rem; }
    .provider-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.6rem 0.8rem;
    }
    .provider-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .provider-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .provider-name { font-weight: 600; color: #0f172a; font-size: 0.85rem; }
    .provider-email { font-size: 0.72rem; color: #64748b; }
    .contact-provider-btn {
      padding: 0.35rem 0.8rem;
      background: rgba(47,79,127,0.1);
      border: 1px solid rgba(47,79,127,0.2);
      border-radius: 8px;
      color: #2f4f7f;
      font-weight: 600;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .contact-provider-btn:hover { background: #2f4f7f; color: white; }

    /* ══════════════════════════════
       DOCUMENTS
    ══════════════════════════════ */
    .documents-section { margin-top: 0.75rem; }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #2f4f7f;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.5rem;
    }
    .documents-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .documents-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .document-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      font-size: 0.75rem;
    }
    .doc-icon { font-size: 0.9rem; }
    .doc-name {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #334155;
    }
    .view-doc-btn {
      background: #2f4f7f;
      color: white;
      border: none;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      cursor: pointer;
      margin-left: 0.3rem;
    }
    .view-doc-btn:hover { opacity: 0.85; }
    .download-doc-btn {
      background: #16a34a;
      color: white;
      border: none;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      cursor: pointer;
      margin-left: 0.3rem;
    }
    .download-doc-btn:hover { background: #15803d; }

    /* ══════════════════════════════
       LOADING DETAILS
    ══════════════════════════════ */
    .loading-details {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    .spinner-small {
      width: 16px; height: 16px;
      border: 2px solid #e2e8f0;
      border-top-color: #2f4f7f;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ══════════════════════════════
       PAYMENT INFO
    ══════════════════════════════ */
    .payment-info {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border: 1px solid rgba(47,79,127,0.15);
      border-radius: 10px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .payment-info .info-row {
      display: flex;
      gap: 0.5rem;
      font-size: 0.85rem;
      margin-bottom: 0.3rem;
      border-bottom: 1px solid rgba(47,79,127,0.08);
      padding: 0.3rem 0;
    }
    .payment-info .info-row:last-child { margin-bottom: 0; border-bottom: none; }
    .payment-info .info-label { color: #2f4f7f; font-weight: 600; min-width: 110px; }
    .payment-info .info-value { color: #1e293b; font-weight: 500; }
    .payment-info .info-value.amount { color: #2f4f7f; font-weight: 700; font-size: 1rem; }
    .payment-info .info-value.mono { font-family: monospace; font-size: 0.75rem; color: #475569; }

    /* ══════════════════════════════
       ACCESS BADGE
    ══════════════════════════════ */
    .access-badge {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #86efac;
      border-radius: 10px;
      padding: 0.6rem;
      text-align: center;
      font-size: 0.82rem;
      font-weight: 600;
      color: #166534;
      margin-bottom: 0.75rem;
    }

    /* ══════════════════════════════
       CARD ACTIONS
    ══════════════════════════════ */
    .card-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .view-details-btn {
      flex: 1;
      padding: 0.65rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .view-details-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(47,79,127,0.35);
    }

    /* ══════════════════════════════
       MODALS
    ══════════════════════════════ */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .detail-modal-box {
      background: white;
      border-radius: 20px;
      width: 90%;
      max-width: 750px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .detail-header {
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #f8fafc, #eff6ff);
      border-radius: 20px 20px 0 0;
    }
    .detail-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .detail-type-badge {
      background: rgba(47,79,127,0.1);
      color: #2f4f7f;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;
      border: 1px solid rgba(47,79,127,0.2);
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #94a3b8;
      transition: color 0.2s;
    }
    .close-btn:hover { color: #0f172a; }
    .detail-title { font-size: 1.4rem; font-weight: 700; color: #2f4f7f; margin: 0 0 0.5rem; }
    .acquired-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #15803d;
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .detail-body { padding: 1.25rem 1.5rem; }
    .detail-section { margin-bottom: 1.5rem; }
    .detail-section .section-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #2f4f7f;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid rgba(47,79,127,0.1);
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .info-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .info-item .info-label { font-size: 0.72rem; color: #94a3b8; font-weight: 500; }
    .info-item .info-value { font-size: 0.9rem; color: #1e293b; font-weight: 500; }
    .info-item .info-value.highlight { color: #2f4f7f; font-weight: 700; font-size: 1rem; }
    .info-item .info-value.mono { font-family: monospace; font-size: 0.75rem; color: #475569; }
    .description-text { font-size: 0.9rem; color: #475569; line-height: 1.7; }
    .detail-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .btn-secondary {
      padding: 0.65rem 1.25rem;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      color: #475569;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-contact {
      padding: 0.65rem 1.25rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .btn-contact:hover { opacity: 0.85; }

    /* Document Modal */
    .modal-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      width: 90%;
      max-width: 600px;
    }
    .document-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .document-modal-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .close-modal-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #64748b;
    }
    .close-modal-btn:hover { color: #dc2626; }
    .document-preview {
      text-align: center;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      margin: 1rem 0;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .preview-image { max-width: 100%; max-height: 300px; border-radius: 8px; }
    .file-icon-large { font-size: 3rem; margin-bottom: 0.5rem; }
    .document-actions { display: flex; justify-content: center; margin-top: 1rem; }
    .download-btn {
      padding: 0.5rem 1.2rem;
      background: linear-gradient(135deg, #2f4f7f, #1e3a5f);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .download-btn:hover { opacity: 0.85; }

    /* ══════════════════════════════
       RESPONSIVE
    ══════════════════════════════ */
    @media (max-width: 768px) {
      .acquisitions-grid { grid-template-columns: 1fr; }
      .cards-grid { grid-template-columns: 1fr; }
      .details-grid { grid-template-columns: 1fr; }
      .detail-item.full-width { grid-column: span 1; }
      .page-header { flex-direction: column; gap: 1rem; }
      .tabs-wrapper { width: 100%; flex-wrap: wrap; }
    }
  `]
})
export class MyTakenServicesComponent implements OnInit {

  acquisitions: ServiceAcquisition[] = [];
  pendingRequests: ServiceAcquisition[] = [];
  reservedServices: ServiceAcquisition[] = [];
  loading = false;
  activeTab: 'requests' | 'reserved' | 'taken' = 'requests';
  success = '';
  error = '';

  cancellingMap = new Map<number, boolean>();

  showDetailModal = false;
  selectedService: ServiceAcquisition | null = null;
  serviceDetail: any = null;

  viewingDocument: any = null;
  documentUrl: string = '';

  private currentUserId: number | null = null;
  private currentUserRole: string = '';

  private http = inject(HttpClient);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService);

  private roleConfig = {
    INVESTOR: {
      backLink: '/investisseur/services',
      backText: '← Back to Services',
      title: 'My Investment Services',
      subtitle: 'Track your investment requests and acquired services',
      browseLink: '/investisseur/services',
      browseText: 'Browse Services',
      emptyMessage: 'Browse investment services and request the ones that interest you.',
      emptyIcon: '📭',
      emptyTitle: 'No acquired services yet',
      statusLabel: 'ACQUIRED & PAID'
    },
    INTERNATIONAL_COMPANY: {
      backLink: '/societe-international/dashboard',
      backText: '← Back to Dashboard',
      title: 'My Investment Services',
      subtitle: 'Track your investment requests and acquired services',
      browseLink: '/societe-international/services',
      browseText: 'Browse Services',
      emptyMessage: 'Browse investment opportunities and request the ones that interest your company.',
      emptyIcon: '🏢',
      emptyTitle: 'No acquired services yet',
      statusLabel: 'ACQUIRED & PAID'
    }
  };

  get config() {
    return this.roleConfig[this.currentUserRole as keyof typeof this.roleConfig]
      || this.roleConfig.INVESTOR;
  }

  setTab(tab: 'requests' | 'reserved' | 'taken'): void {
    this.activeTab = tab;
  }

  goToServices(): void {
    this.router.navigate([this.config.browseLink]);
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
    } catch { return null; }
  }

  private extractRole(payload: any): string {
    const roles: string[] = payload?.realm_access?.roles || [];
    if (roles.includes('INVESTOR')) return 'INVESTOR';
    if (roles.includes('INTERNATIONAL_COMPANY')) return 'INTERNATIONAL_COMPANY';
    return 'INVESTOR';
  }

  private loadProfile(): Promise<void> {
    return new Promise((resolve) => {
      const token = localStorage.getItem('auth_token') || '';
      const payload = this.decodeJwt(token);
      if (payload) this.currentUserRole = this.extractRole(payload);
      this.http.get<any>('http://localhost:8089/api/auth/me', { headers: this.getHeaders() }).subscribe({
        next: (p) => { this.currentUserId = p.id ?? p.userId ?? null; resolve(); },
        error: () => resolve()
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    this.loadAllAcquisitions();
  }

  loadAllAcquisitions(): void {
    this.loading = true;

    this.acquisitionService.getMyAllAcquisitions().subscribe({
      next: (data: ServiceAcquisition[]) => {
        const investmentOnly = data.filter(a => a.serviceType === 'INVESTMENT');

        this.pendingRequests = investmentOnly.filter(
          a => a.paymentStatus === 'PENDING_PARTNER_APPROVAL'
        );
        this.reservedServices = investmentOnly.filter(
          a => a.paymentStatus === 'RESERVED' || a.paymentStatus === 'AWAITING_VALIDATION'
        );
        this.acquisitions = investmentOnly.filter(
          a => a.paymentStatus === 'COMPLETED'
        );

        this.acquisitions.forEach(acq => this.loadServiceDetails(acq));
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Error loading acquisitions:', err);
        this.error = 'Error loading your services.';
        this.loading = false;
      }
    });
  }

  loadServiceDetails(acquisition: ServiceAcquisition): void {
    acquisition.detailsLoading = true;
    const endpoint = `http://localhost:8089/api/investment-services/${acquisition.serviceId}`;
    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (service) => {
        acquisition.serviceDetails = service;
        acquisition.detailsLoading = false;
      },
      error: () => {
        acquisition.serviceDetails = null;
        acquisition.detailsLoading = false;
      }
    });
  }

  cancelRequest(acq: ServiceAcquisition): void {
    this.cancellingMap.set(acq.id, true);
    this.acquisitionService.cancelRequest(acq.id, 'Cancelled by user').subscribe({
      next: () => {
        this.success = 'Request cancelled successfully.';
        this.loadAllAcquisitions();
        setTimeout(() => this.success = '', 3000);
      },
      error: () => {
        this.error = 'Error cancelling request.';
        this.cancellingMap.set(acq.id, false);
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  cancelReservation(acq: ServiceAcquisition): void {
    this.cancellingMap.set(acq.id, true);
    this.acquisitionService.cancelRequest(acq.id, 'Reservation cancelled by user').subscribe({
      next: () => {
        this.success = 'Reservation cancelled successfully.';
        this.loadAllAcquisitions();
        setTimeout(() => this.success = '', 3000);
      },
      error: () => {
        this.error = 'Error cancelling reservation.';
        this.cancellingMap.set(acq.id, false);
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  viewServiceDetails(acquisition: ServiceAcquisition): void {
    this.selectedService = acquisition;
    this.serviceDetail = acquisition.serviceDetails;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedService = null;
    this.serviceDetail = null;
  }

  contactProvider(provider: any): void {
    if (!provider?.email) return;
    const name = provider.firstName && provider.lastName
      ? `${provider.firstName} ${provider.lastName}` : 'Provider';
    this.closeDetailModal();
    this.router.navigate(['/messagerie'], {
      queryParams: { contact: provider.email, name }
    });
  }

  viewDocument(doc: any): void {
    this.viewingDocument = doc;
    const url = `http://localhost:8089${doc.downloadUrl}`;
    if (doc.fileType && doc.fileType.startsWith('image/')) {
      this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
        next: (blob: Blob) => { this.documentUrl = URL.createObjectURL(blob); },
        error: () => { this.documentUrl = ''; }
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
      error: () => { alert('Error downloading file'); }
    });
  }

  isImage(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }
}