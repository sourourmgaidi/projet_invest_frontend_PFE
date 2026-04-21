import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="card">

        <!-- Chargement -->
        <ng-container *ngIf="status === 'loading'">
          <div class="spinner"></div>
          <p class="msg">Vérification du paiement en cours...</p>
        </ng-container>

        <!-- Succès -->
        <ng-container *ngIf="status === 'success'">
          <div class="icon success-icon">✅</div>
          <h1>Abonnement activé !</h1>
          <p class="msg">
            Vous avez maintenant accès à tous les Local Partners pendant <strong>30 jours</strong>.
          </p>
          <p class="expiry" *ngIf="expiresAt">
            Expire le : {{ expiresAt | date:'dd/MM/yyyy à HH:mm' }}
          </p>
          <button class="btn-primary" (click)="goToServices()">
            Découvrir les Local Partners →
          </button>
        </ng-container>

        <!-- Échec -->
        <ng-container *ngIf="status === 'failed'">
          <div class="icon error-icon">❌</div>
          <h1>Paiement échoué</h1>
          <p class="msg">Le paiement n'a pas pu être confirmé. Votre abonnement n'a pas été activé.</p>
          <div class="actions">
            <button class="btn-secondary" (click)="goToServices()">Retour</button>
            <button class="btn-primary" (click)="retry()">Réessayer</button>
          </div>
        </ng-container>

        <!-- Erreur -->
        <ng-container *ngIf="status === 'error'">
          <div class="icon error-icon">⚠️</div>
          <h1>Erreur</h1>
          <p class="msg">{{ errorMessage }}</p>
          <button class="btn-secondary" (click)="goToServices()">Retour</button>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: var(--color-background-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: var(--font-sans);
    }

    .card {
      background: var(--color-background-primary);
      border: 0.5px solid var(--color-border-tertiary);
      border-radius: var(--border-radius-lg);
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }

    .icon { font-size: 3rem; margin-bottom: 1rem; }

    h1 {
      font-size: 1.4rem;
      font-weight: 500;
      color: var(--color-text-primary);
      margin: 0 0 0.75rem;
    }

    .msg {
      font-size: 0.95rem;
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0 0 1rem;
    }

    .expiry {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      background: var(--color-background-secondary);
      padding: 0.5rem 1rem;
      border-radius: var(--border-radius-md);
      margin-bottom: 1.5rem;
    }

    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid var(--color-border-tertiary);
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.25rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem; }

    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: var(--border-radius-md);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-primary:hover { opacity: 0.9; }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: 0.5px solid var(--color-border-secondary);
      background: transparent;
      border-radius: var(--border-radius-md);
      font-size: 0.9rem;
      cursor: pointer;
      color: var(--color-text-secondary);
    }

    .btn-secondary:hover { background: var(--color-background-secondary); }
  `]
})
export class SubscriptionSuccessComponent implements OnInit {

  status: 'loading' | 'success' | 'failed' | 'error' = 'loading';
  expiresAt: string | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService
  ) {}

// subscription-success.component.ts
ngOnInit(): void {
  // ✅ RESTAURER le token depuis sessionStorage
  let token = localStorage.getItem('auth_token');
  
  if (!token) {
    const sessionToken = sessionStorage.getItem('auth_token');
    if (sessionToken) {
      localStorage.setItem('auth_token', sessionToken);
      token = sessionToken;
      console.log('✅ Token restauré depuis sessionStorage');
    }
  }
  
  console.log('🔍 Token présent:', !!token);

  const paymentId = this.route.snapshot.queryParamMap.get('paymentId')
    || localStorage.getItem('pending_subscription_payment_id')
    || '';
    
  const transactionId = this.route.snapshot.queryParamMap.get('transaction_id') || undefined;

  if (!paymentId) {
    this.status = 'error';
    this.errorMessage = 'Identifiant de paiement manquant.';
    return;
  }

  localStorage.removeItem('pending_subscription_payment_id');

  setTimeout(() => {
    this.subscriptionService.confirmPayment(paymentId, transactionId).subscribe({
      next: (res) => {
        if (res.success) {
          this.status = 'success';
          this.expiresAt = res.expiresAt;
        } else {
          this.status = 'failed';
        }
      },
      error: (err) => {
        this.status = 'error';
        this.errorMessage = err.error?.error || 'Erreur lors de la confirmation du paiement.';
      }
    });
  }, 100);
}
  goToServices(): void {
    // Adapter le chemin selon le rôle de l'utilisateur
    const token = localStorage.getItem('auth_token') || '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles: string[] = payload?.realm_access?.roles || [];
        if (roles.includes('INTERNATIONAL_COMPANY')) {
          this.router.navigate(['/societe-international/services']);
          return;
        }
      } catch {}
    }
    this.router.navigate(['/investisseur/services']);
  }

  retry(): void {
    this.router.navigate(['/investisseur/services']);
  }
}