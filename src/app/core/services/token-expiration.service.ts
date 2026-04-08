// src/app/core/services/token-expiration.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { interval, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TokenExpirationService implements OnDestroy {
  private checkSubscription: Subscription | null = null; // ✅ Initialisé à null
  private readonly CHECK_INTERVAL = 30000; // Vérifier toutes les 30 secondes

  constructor(
    private router: Router,
    private sessionService: SessionService
  ) {
    this.startTokenCheck();
  }

  ngOnDestroy() {
    if (this.checkSubscription) {
      this.checkSubscription.unsubscribe();
      this.checkSubscription = null;
    }
  }

  private startTokenCheck(): void {
    this.checkSubscription = interval(this.CHECK_INTERVAL).subscribe(() => {
      this.checkTokenExpiration();
    });
  }

  private checkTokenExpiration(): void {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir en millisecondes
      const now = Date.now();
      const timeUntilExpiry = exp - now;

      console.log(`⏰ Temps avant expiration: ${Math.floor(timeUntilExpiry / 1000)} secondes`);

      // Si le token est expiré ou expire dans moins de 5 secondes
      if (timeUntilExpiry <= 5000) {
        console.log('🔑 Token expiré, fermeture de la session...');
        const email = payload.email || payload.sub;
        
        if (email) {
          // Fermer la session
          this.sessionService.endSessionByEmail(email).subscribe({
            next: (response) => {
              console.log('✅ Session fermée avec succès:', response);
              this.clearAndRedirect();
            },
            error: (err) => {
              console.error('❌ Erreur fermeture session:', err);
              this.clearAndRedirect();
            }
          });
        } else {
          this.clearAndRedirect();
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      this.clearAndRedirect();
    }
  }

  private clearAndRedirect(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('token_expires_at');
    this.router.navigate(['/login']);
  }
}