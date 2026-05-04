import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="onClose()">
      <div class="modal-card" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="modal-header">
          <div class="icon-wrap">🔒</div>
          <h2>Accès aux Local Partners</h2>
          <p class="sub">Un abonnement mensuel est requis pour contacter un Local Partner.</p>
        </div>

        <!-- Features -->
        <ul class="features">
          <li>✅ Accès illimité à tous les Local Partners</li>
          <li>✅ Messagerie directe sans restriction</li>
          <li>✅ Valable 30 jours dès le paiement</li>
          <li>✅ Renouvellement facile</li>
        </ul>

        <!-- Price -->
        <div class="price-block">
          <span class="price">40</span>
          <span class="currency">TND</span>
          <span class="period">/ mois</span>
        </div>

        <!-- Error -->
        <div class="error-msg" *ngIf="errorMessage">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn-cancel" (click)="onClose()" [disabled]="loading">
            Annuler
          </button>
          <button class="btn-pay" (click)="subscribe()" [disabled]="loading">
            <span *ngIf="!loading">💳 Payer 40 TND</span>
            <span *ngIf="loading" class="spinner-wrap">
              <span class="dot-spin"></span> Chargement...
            </span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      border: 1px solid #e2e8f0;
    }
    .modal-header { text-align: center; margin-bottom: 1.5rem; }
    .icon-wrap { font-size: 2.5rem; margin-bottom: 0.75rem; }
    h2 { font-size: 1.3rem; font-weight: 600; color: #1e293b; margin: 0 0 0.4rem; }
    .sub { font-size: 0.9rem; color: #64748b; margin: 0; }
    .features { list-style: none; padding: 0; margin: 0 0 1.5rem; }
    .features li {
      font-size: 0.9rem; color: #334155;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .features li:last-child { border-bottom: none; }
    .price-block {
      display: flex; align-items: baseline;
      justify-content: center; gap: 0.4rem;
      margin-bottom: 1.5rem; padding: 1rem;
      background: #f8fafc; border-radius: 12px;
    }
    .price { font-size: 2.5rem; font-weight: 700; color: #0f172a; }
    .currency { font-size: 1.1rem; font-weight: 500; color: #475569; }
    .period { font-size: 0.9rem; color: #64748b; }
    .error-msg {
      font-size: 0.85rem; color: #dc2626;
      background: #fef2f2; border-radius: 8px;
      padding: 0.6rem; margin-bottom: 1rem; text-align: center;
    }
    .actions { display: flex; gap: 0.75rem; }
    .btn-cancel {
      flex: 1; padding: 0.7rem;
      border: 1px solid #e2e8f0; background: white;
      border-radius: 10px; font-size: 0.9rem;
      cursor: pointer; color: #64748b; font-weight: 500;
    }
    .btn-cancel:hover:not(:disabled) { background: #f8fafc; }
    .btn-pay {
      flex: 2; padding: 0.7rem;
      background: #2563eb; color: white;
      border: none; border-radius: 10px;
      font-size: 0.9rem; font-weight: 600; cursor: pointer;
    }
    .btn-pay:hover:not(:disabled) { background: #1d4ed8; }
    .btn-pay:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner-wrap {
      display: flex; align-items: center;
      justify-content: center; gap: 0.5rem;
    }
    .dot-spin {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SubscriptionModalComponent {

  @Output() closed = new EventEmitter<void>();
  @Output() subscribed = new EventEmitter<void>();

  loading = false;
  errorMessage: string | null = null;

  constructor(private subscriptionService: SubscriptionService) {}

  onClose(): void {
    if (!this.loading) this.closed.emit();
  }

  subscribe(): void {
    this.loading = true;
    this.errorMessage = null;

    // ✅ Sauvegarder le token dans sessionStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      sessionStorage.setItem('auth_token', token);
      console.log('✅ Token sauvegardé dans sessionStorage');
    }

    this.subscriptionService.initiateSubscription().subscribe({
      next: (res) => {
        this.loading = false;
        // ✅ Sauvegarder paymentId ET paymentRef
        localStorage.setItem('pending_subscription_payment_id', res.paymentId);
        localStorage.setItem('pending_subscription_payment_ref', res.paymentRef);
        // ✅ payUrl (pas paymentUrl)
        window.location.href = res.payUrl;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Une erreur est survenue. Veuillez réessayer.';
      }
    });
  }
}