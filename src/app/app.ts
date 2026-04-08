// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpirationService } from './core/services/token-expiration.service';
import { SessionManagerService } from './core/services/session-manager.service';
import { AutoLogoutService } from './core/services/auto-logout.service'; // ✅ AJOUTÉ

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy { // ✅ OnDestroy ajouté
  constructor(
    private tokenExpirationService: TokenExpirationService,
    private sessionManagerService: SessionManagerService,
    private autoLogoutService: AutoLogoutService // ✅ AJOUTÉ
  ) {
    console.log('✅ TokenExpirationService injecté');
    console.log('✅ SessionManagerService injecté');
    console.log('✅ AutoLogoutService injecté'); // ✅ AJOUTÉ
  }

  ngOnInit(): void {
    console.log('🚀 Application démarrée - Vérification automatique des tokens expirés');
  }

  ngOnDestroy(): void {
    this.autoLogoutService.destroy(); // ✅ Nettoyer le listener beforeunload
  }
}