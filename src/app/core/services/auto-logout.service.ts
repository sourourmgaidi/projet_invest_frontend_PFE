// src/app/core/services/auto-logout.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class AutoLogoutService {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.init();
  }

  private init(): void {
    sessionStorage.setItem('tab_active', 'true');
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.checkOrphanedSession();
  }

  private onBeforeUnload = (): void => {
    // ✅ Utiliser les méthodes qui existent déjà dans AuthService
    const refreshToken = localStorage.getItem('refresh_token');
    const currentUser = this.authService.getCurrentUser();
    const email = currentUser?.email ?? null;
    const role = this.authService.getUserRole(); // getUserRole() existe déjà

    if (!refreshToken || !this.authService.isLoggedIn()) return;

    const logoutUrl = this.getLogoutUrlByRole(role);
    const payload = JSON.stringify({ refreshToken, email });

    const sent = navigator.sendBeacon(
      logoutUrl,
      new Blob([payload], { type: 'application/json' })
    );

    if (sent) {
      // ✅ Utiliser clearSession via logout sans redirection
      // (pas de clearLocalSession → utiliser ce qui existe)
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
      localStorage.removeItem('user_role');
      localStorage.removeItem('token_expires_at');
    }
  };

  private getLogoutUrlByRole(role: string | null): string {
    const base = 'http://localhost:8089/api';
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return `${base}/admin/logout`;
      case 'TOURIST':
        return `${base}/touristes/logout`;
      case 'LOCAL_PARTNER':
        return `${base}/partenaires-locaux/logout`;
      case 'PARTNER':
        return `${base}/partenaires-economiques/logout`;
      case 'INTERNATIONAL_COMPANY':
        return `${base}/international-companies/logout`;
      default:
        return `${base}/auth/logout`; // INVESTOR + fallback
    }
  }

  private checkOrphanedSession(): void {
    const tabWasActive = sessionStorage.getItem('tab_active');
    const hasTokens = !!localStorage.getItem('refresh_token');

    if (!tabWasActive && hasTokens) {
      console.log('🧹 Session orpheline détectée → nettoyage');
      // ✅ logoutWithoutRedirect() existe dans AuthService
      this.authService.logoutWithoutRedirect();
      this.router.navigate(['/login']);
    }
  }

  destroy(): void {
    window.removeEventListener('beforeunload', this.onBeforeUnload);
  }
}