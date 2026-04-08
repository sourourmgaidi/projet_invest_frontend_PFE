// src/app/core/services/session-manager.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class SessionManagerService implements OnDestroy {
  
  constructor(private authService: AuthService) {
    console.log('🟢 SessionManagerService initialisé');
    this.initSessionListeners();
  }

  ngOnDestroy(): void {
    console.log('🔴 SessionManagerService détruit');
    this.removeSessionListeners();
  }

  private initSessionListeners(): void {
    window.addEventListener('beforeunload', this.handleClose.bind(this));
    window.addEventListener('pagehide', this.handleClose.bind(this));
    window.addEventListener('unload', this.handleClose.bind(this));
    console.log('✅ Listeners de session activés');
  }

  private removeSessionListeners(): void {
    window.removeEventListener('beforeunload', this.handleClose.bind(this));
    window.removeEventListener('pagehide', this.handleClose.bind(this));
    window.removeEventListener('unload', this.handleClose.bind(this));
    console.log('✅ Listeners de session désactivés');
  }

  private handleClose(): void {
    console.log('🔴 Fermeture détectée → déconnexion automatique');
    this.closeSession();
  }

  private closeSession(): void {
    try {
      // ✅ Déconnexion sans redirection (page est en train de se fermer)
      this.authService.logoutWithoutRedirect();
    } catch (error) {
      console.error('❌ Erreur lors de la fermeture de session:', error);
    }
  }
}
