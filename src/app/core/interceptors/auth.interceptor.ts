// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, tap } from 'rxjs';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);
  
  const isKeycloakRequest = req.url.includes('localhost:9090');
  const isPublicEndpoint = req.url.includes('/end-by-email') || 
                           req.url.includes('/login') || 
                           req.url.includes('/register') ||
                           req.url.includes('/refresh');
  const token = localStorage.getItem('auth_token');

  const reqWithToken = (token && !isKeycloakRequest && !isPublicEndpoint)
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(reqWithToken).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('🔍 Intercepteur - Erreur capturée:', error.status);
      
      // Si ce n'est pas une erreur 401, laisser passer
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Ignorer les requêtes vers Keycloak et endpoints publics
      if (isKeycloakRequest || isPublicEndpoint) {
        return throwError(() => error);
      }

      // ✅ Récupérer l'email du token expiré
      const email = getEmailFromToken();
      
      if (email) {
        console.log('🔑 Token expiré, fermeture de la session pour:', email);
        
        // ✅ Appeler le service pour fermer la session
        sessionService.endSessionByEmail(email).subscribe({
          next: () => {
            console.log('✅ Session fermée via endSessionByEmail');
            clearLocalStorage();
            router.navigate(['/login']);
          },
          error: (err: any) => {
            console.warn('⚠️ Erreur endSessionByEmail:', err);
            clearLocalStorage();
            router.navigate(['/login']);
          }
        });
      } else {
        console.warn('⚠️ Impossible de récupérer l\'email');
        clearLocalStorage();
        router.navigate(['/login']);
      }
      
      // Retourner une erreur
      return throwError(() => new Error('Session expirée'));
    })
  );
};

// ✅ Extraire l'email du JWT
function getEmailFromToken(): string | null {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.email || payload?.sub || null;
  } catch {
    return null;
  }
}

// ✅ Nettoyer le localStorage
function clearLocalStorage(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('current_user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('token_expires_at');
}