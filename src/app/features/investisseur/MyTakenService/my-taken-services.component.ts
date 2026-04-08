// my-taken-services.component.ts
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
            <p>Loading your acquired services...</p>
          </div>

          <div class="empty-state" *ngIf="!loading && acquisitions.length === 0">
            <div class="empty-icon">{{ config.emptyIcon }}</div>
            <h3>{{ config.emptyTitle }}</h3>
            <p>{{ config.emptyMessage }}</p>
            <a [routerLink]="config.browseLink" class="browse-btn">{{ config.browseText }} →</a>
          </div>

          <!-- Acquisitions Grid -->
          <div class="acquisitions-grid" *ngIf="!loading && acquisitions.length > 0">
            <div class="acquisition-card" *ngFor="let a of acquisitions">

              <!-- Status Banner -->
              <div class="status-banner banner-completed">
                <span class="status-icon">✅</span>
                <span class="status-label">{{ config.statusLabel }}</span>
                <span class="status-date" *ngIf="a.paidAt">
                  {{ a.paidAt | date:'dd/MM/yyyy HH:mm' }}
                </span>
              </div>

              <!-- Service Info -->
              <div class="card-body">
                <div class="service-header">
                  <div class="service-type-badge">
                    <span>📈</span> INVESTMENT
                  </div>
                  <h3 class="service-name">{{ a.serviceName }}</h3>
                </div>

                <!-- Service Details (loaded dynamically) -->
                <div class="service-details-section" *ngIf="a.serviceDetails">
                  <div class="details-grid">
                    <div class="detail-item full-width" *ngIf="a.serviceDetails.description">
                      <span class="detail-label">📝 Description</span>
                      <span class="detail-value description">{{ a.serviceDetails.description | slice:0:200 }}{{ (a.serviceDetails.description?.length || 0) > 200 ? '...' : '' }}</span>
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

                  <!-- Provider Info -->
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

                  <!-- Documents Section -->
                  <div class="documents-section" *ngIf="a.serviceDetails.documents?.length > 0">
                    <h4 class="section-title">📎 Documents</h4>
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

                <!-- Loading indicator -->
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
      </div>
    </div>

    <!-- Service Detail Modal -->
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

          <!-- Financial Info -->
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

          <!-- Service Info -->
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

          <!-- Description -->
          <div class="detail-section" *ngIf="serviceDetail.description">
            <h4 class="section-title">📝 Description</h4>
            <p class="description-text">{{ serviceDetail.description }}</p>
          </div>

          <!-- Provider -->
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
              <button class="contact-provider-btn"
                      (click)="contactProvider(serviceDetail.provider)">
                💬 Contact
              </button>
            </div>
          </div>

          <!-- Documents -->
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

          <!-- Acquisition Info -->
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
    /* ── Layout ── */
    .page-layout { display: flex; min-height: 100vh; background: #f1f5f9; font-family: 'Inter', sans-serif; }
    app-navbar { width: 280px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; z-index: 100; }
    .page-main { flex: 1; padding: 2rem; overflow-y: auto; }
    .page-content { max-width: 1100px; margin: 0 auto; }

    /* ── Header ── */
    .page-header { margin-bottom: 2rem; }
    .back-link { display: inline-block; color: #2563eb; font-size: 0.9rem; font-weight: 500; text-decoration: none; margin-bottom: 0.5rem; }
    .back-link:hover { color: #7c3aed; }
    h1 { font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    h1::after { content: ''; display: block; width: 60px; height: 4px; background: linear-gradient(90deg, #2563eb, #7c3aed); margin-top: 0.4rem; border-radius: 2px; }
    .subtitle { color: #64748b; margin: 0; font-size: 0.95rem; }

    /* ── Loading / Empty ── */
    .loading-state, .empty-state { text-align: center; padding: 4rem; background: white; border-radius: 16px; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #0f172a; margin-bottom: 0.5rem; }
    .empty-state p { color: #64748b; margin-bottom: 1.5rem; }
    .browse-btn { display: inline-block; padding: 0.7rem 1.5rem; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 10px; text-decoration: none; font-weight: 600; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Grid ── */
    .acquisitions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(550px, 1fr)); gap: 1.5rem; }

    /* ── Card ── */
    .acquisition-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
    .acquisition-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

    /* ── Status Banner ── */
    .status-banner { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; }
    .banner-completed { background: linear-gradient(135deg, #059669, #10b981); color: white; }
    .status-icon { font-size: 1.1rem; }
    .status-label { font-weight: 700; font-size: 0.85rem; flex: 1; }
    .status-date { font-size: 0.75rem; opacity: 0.85; }

    /* ── Card Body ── */
    .card-body { padding: 1.25rem; }
    .service-header { margin-bottom: 1rem; }
    .service-type-badge { display: inline-flex; align-items: center; gap: 0.3rem; background: #eff6ff; color: #2563eb; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; }
    .service-name { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }

    /* ── Service Details Section ── */
    .service-details-section { background: #f8fafc; border-radius: 12px; padding: 0.75rem; margin-bottom: 1rem; }
    .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 0.75rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-item.full-width { grid-column: span 2; }
    .detail-label { font-size: 0.7rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
    .detail-value { font-size: 0.85rem; color: #1e293b; font-weight: 500; }
    .detail-value.description { font-weight: normal; color: #475569; line-height: 1.4; }
    .detail-value.amount { color: #059669; font-weight: 700; font-size: 0.9rem; }

    /* ── Provider Section ── */
    .provider-section { margin-top: 0.75rem; margin-bottom: 0.75rem; }
    .provider-card { display: flex; align-items: center; gap: 0.75rem; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem 0.8rem; }
    .provider-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
    .provider-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .provider-name { font-weight: 600; color: #0f172a; font-size: 0.85rem; }
    .provider-email { font-size: 0.72rem; color: #64748b; }
    .contact-provider-btn { padding: 0.35rem 0.8rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #2563eb; font-weight: 600; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
    .contact-provider-btn:hover { background: #2563eb; color: white; }

    /* ── Documents Section ── */
    .documents-section { margin-top: 0.75rem; }
    .section-title { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
    .documents-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .document-item { display: flex; align-items: center; gap: 0.4rem; background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.75rem; }
    .doc-icon { font-size: 0.9rem; }
    .doc-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
    .view-doc-btn { background: #2563eb; color: white; border: none; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.65rem; cursor: pointer; transition: background 0.2s; margin-left: 0.3rem; }
    .view-doc-btn:hover { background: #1d4ed8; }

    /* ── Loading Details ── */
    .loading-details { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.75rem; }
    .spinner-small { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.6s linear infinite; }

    /* ── Payment Info ── */
    .payment-info { background: #f0fdf4; border-radius: 10px; padding: 0.75rem; margin-bottom: 0.75rem; }
    .info-row { display: flex; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 0.3rem; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; font-weight: 500; min-width: 110px; }
    .info-value { color: #1e293b; font-weight: 500; }
    .info-value.amount { color: #059669; font-weight: 700; font-size: 1rem; }
    .info-value.mono { font-family: monospace; font-size: 0.75rem; color: #475569; }

    /* ── Access Badge ── */
    .access-badge { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 0.6rem; text-align: center; font-size: 0.85rem; font-weight: 600; color: #15803d; margin-bottom: 0.75rem; }

    /* ── Actions ── */
    .card-actions { display: flex; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
    .view-details-btn { flex: 1; padding: 0.65rem; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .view-details-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

    /* ── Modal Styles ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .detail-modal-box { background: white; border-radius: 20px; width: 90%; max-width: 750px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .detail-header { padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg, #f8fafc, #eff6ff); border-radius: 20px 20px 0 0; }
    .detail-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .detail-type-badge { background: #eff6ff; color: #2563eb; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; padding: 0.25rem; transition: color 0.2s; }
    .close-btn:hover { color: #0f172a; }
    .detail-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem; }
    .acquired-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
    .detail-body { padding: 1.25rem 1.5rem; }
    .detail-section { margin-bottom: 1.5rem; }
    .section-title { font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #f1f5f9; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .info-label { font-size: 0.72rem; color: #94a3b8; font-weight: 500; }
    .info-value { font-size: 0.9rem; color: #1e293b; font-weight: 500; }
    .info-value.highlight { color: #059669; font-weight: 700; font-size: 1rem; }
    .description-text { font-size: 0.9rem; color: #475569; line-height: 1.7; }
    .documents-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .download-doc-btn { background: #059669; color: white; border: none; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.65rem; cursor: pointer; margin-left: 0.3rem; }
    .download-doc-btn:hover { background: #047857; }
    .detail-footer { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9; }
    .btn-secondary { padding: 0.65rem 1.25rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; color: #475569; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-contact { padding: 0.65rem 1.25rem; background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; border-radius: 10px; color: white; font-weight: 600; font-size: 0.9rem; cursor: pointer; }

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

    @media (max-width: 768px) {
      .page-layout { flex-direction: column; }
      app-navbar { width: 100%; height: auto; position: relative; }
      .acquisitions-grid { grid-template-columns: 1fr; }
      .details-grid { grid-template-columns: 1fr; }
      .detail-item.full-width { grid-column: span 1; }
    }
  `]
})
export class MyTakenServicesComponent implements OnInit {

  acquisitions: any[] = [];
  loading = false;

  // Detail modal
  showDetailModal = false;
  selectedService: any = null;
  serviceDetail: any = null;

  // Document modal
  viewingDocument: any = null;
  documentUrl: string = '';

  // User info
  private currentUserId: number | null = null;
  private currentUserRole: string = '';

  private http = inject(HttpClient);
  private router = inject(Router);
  private acquisitionService = inject(AcquisitionService);

  // Configuration selon le rôle
  private roleConfig = {
    INVESTOR: {
      backLink: '/investisseur/services',
      backText: '← Back to Services',
      title: 'My Acquired Investment Services',
      subtitle: 'Services you have successfully acquired',
      browseLink: '/investisseur/services',
      browseText: 'Browse Services',
      emptyMessage: 'Browse investment services and request the ones that interest you.',
      emptyIcon: '📭',
      emptyTitle: 'No acquired services yet',
      statusLabel: 'ACQUIRED & PAID'
    },
    INTERNATIONAL_COMPANY: {
  backLink: '/societe-international/services',  // ✅ Déjà correct dans votre code
  backText: '← Back to Investment Services',
  title: 'My Company\'s Acquired Services',
  subtitle: 'Services your company has successfully acquired',
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
        next: (p) => {
          this.currentUserId = p.id ?? p.userId ?? null;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    this.loadAcquisitions();
  }

  // ─── Load ONLY COMPLETED acquisitions ───────
  loadAcquisitions(): void {
  this.loading = true;

  this.acquisitionService.getMyServices().subscribe({
    next: (data: ServiceAcquisition[]) => {
      console.log('📋 All acquisitions:', data);

      const completedOnly = data.filter(a =>
        a.paymentStatus === 'COMPLETED' && a.serviceType === 'INVESTMENT'
      );

      console.log('✅ Completed acquisitions only:', completedOnly.length);

      this.acquisitions = completedOnly;
      this.acquisitions.forEach(acq => this.loadServiceDetails(acq));
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Error loading acquisitions:', err);
      this.loading = false;
    }
  });
}

  loadServiceDetails(acquisition: any): void {
    acquisition.detailsLoading = true;
    
    const endpoint = `http://localhost:8089/api/investment-services/${acquisition.serviceId}`;

    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (service) => {
        acquisition.serviceDetails = service;
        acquisition.detailsLoading = false;
      },
      error: (err) => {
        console.error(`❌ Error loading service ${acquisition.serviceId}:`, err);
        acquisition.serviceDetails = null;
        acquisition.detailsLoading = false;
      }
    });
  }

  // ─── View Service Details ───────────────────
  viewServiceDetails(acquisition: any): void {
    this.selectedService = acquisition;
    this.serviceDetail = acquisition.serviceDetails;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedService = null;
    this.serviceDetail = null;
  }

  // ─── Contact Provider ────────────────────────
  contactProvider(provider: any): void {
    if (!provider?.email) return;
    const name = provider.firstName && provider.lastName
      ? `${provider.firstName} ${provider.lastName}` : 'Provider';
    this.closeDetailModal();
    this.router.navigate(['/messagerie'], {
      queryParams: { contact: provider.email, name }
    });
  }

  // ─── Document Viewer ─────────────────────────
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