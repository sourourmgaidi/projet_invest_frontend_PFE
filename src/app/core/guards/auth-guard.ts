import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

// ✅ Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/forgot-password',
  '/subscription/payment-success',
  '/investisseur/subscription/payment-success',
  '/societe-international/subscription/payment-success'
];

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // ✅ Extraire le chemin de base (sans les paramètres)
  const baseUrl = state.url.split('?')[0];
  
  // ✅ Si c'est une route publique, on laisse passer SANS vérification
  if (PUBLIC_ROUTES.includes(baseUrl)) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};