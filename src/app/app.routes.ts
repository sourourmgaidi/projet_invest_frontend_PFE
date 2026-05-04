import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard'; 
import { roleGuard } from './core/guards/role-guard';
import { Role } from './shared/models/user.model';
import { AdminNotificationsComponent } from './features/admin/notifications/notifications.component';
import { RegionServicesComponent } from './features/public/home/region/region-services.component';
import { InboxComponent } from './shared/inbox/inbox.component';

export const routes: Routes = [

  // ── Pages publiques ───────────────────────────────
  {
    path: '',
    loadComponent: () => import('./features/public/home/home')
      .then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/public/login/login')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/public/register/register')
      .then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/public/forgot-password/forgot-password.component')
      .then(m => m.ForgotPasswordComponent)
  },
   {
    path: 'tunisia-map',
    loadComponent: () => import('./features/public/tunisiaMap/tunisia-map.component')
      .then(m => m.TunisiaMapComponent)
  },
  {
  path: 'tunisia-map-3d',
  loadComponent: () => import('./features/public/tunisia-mapbox/tunisia-mapbox.component')
    .then(m => m.TunisiaMapboxComponent)
},
 {
    path: 'region-services/:id',
    component: RegionServicesComponent
  },

  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent),
    canActivate: [authGuard]  
  },
    {
    path: 'chat',
    loadComponent: () => import('./shared/chat/chat.component')
      .then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  {
    path: 'chat/:userId/:role',
    loadComponent: () => import('./shared/chat/chat.component')
      .then(m => m.ChatComponent),
    canActivate: [authGuard]
  },

  // ── Admin ─────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.ADMIN] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/users.component')
          .then(m => m.AdminUsersComponent)
      },
      {
        path: 'notifications',
        component: AdminNotificationsComponent
      },
      {
  path: 'stats',
  loadComponent: () => import('./features/admin/stats-dashboard/stats-dashboard.component')
    .then(m => m.StatsDashboardComponent)
},
{
  path: 'admin-stats',
  loadComponent: () => import('./features/admin/admin-stats/admin-stats.component')
    .then(m => m.AdminStatsComponent)
},
      {
        path: 'requests',
        loadComponent: () => import('./features/admin/requests/admin-requests.component')
          .then(m => m.AdminRequestsComponent)
      },
        {
      path: 'requests/investment/:id',
      loadComponent: () => import('./features/admin/requests/request-detail.component')
        .then(m => m.AdminRequestDetailComponent)
    },
    {
      path: 'requests/collaboration/:id',
      loadComponent: () => import('./features/admin/requests/collaboration-request-detail.component')
        .then(m => m.CollaborationRequestDetailComponent)
    },
    {
  path: 'requests/tourist/:id',
  loadComponent: () => import('./features/admin/requests/tourist-request-detail.component')
    .then(m => m.TouristRequestDetailComponent)
},
    {
  path: 'tourist-requests',
  loadComponent: () => import('./features/admin/requests/admin-tourist-requests.component')
    .then(m => m.AdminTouristRequestsComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: [Role.ADMIN] }
}
    ]
  },

  // ── Touriste ──────────────────────────────────────
  {
    path: 'touriste',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.TOURIST] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/touriste/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
       {
        path: 'favoris',
        loadComponent: () => import('./features/touriste/favoris/favorites.component')
          .then(m => m.TouristFavoritesComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/touriste/services/services.component')
          .then(m => m.TouristServicesComponent)
      },
         {
        path: 'my-requests',
        loadComponent: () => import('./features/touriste/tourist-requests/tourist-requests.component')
          .then(m => m.TouristRequestsComponent)
      }
    ]
  },

  // ── Investisseur ──────────────────────────────────
  {
    path: 'investisseur',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.INVESTOR] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/investisseur/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/investisseur/services/services.component')
          .then(m => m.InvestorServicesComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./shared/favoritesInvestservice/favorites-list/favorites-list.component')
          .then(m => m.FavoritesListComponent)
      },
      // ✅ CORRIGÉ : lazy load au lieu de component statique
      {
        path: 'acquisition-requests',
        loadComponent: () => import('./features/partenaire-local/myRequests/partner-acquisition-requests.component')
          .then(m => m.PartnerAcquisitionRequestsComponent)
      },
      {
        path: 'my-requests',
        loadComponent: () => import('./features/public/my-acquired-services/my-acquired-services.component')
          .then(m => m.MyAcquiredServicesComponent)
      },
      {
        path: 'my-taken-services',
        loadComponent: () => import('./features/investisseur/MyTakenService/my-taken-services.component')
          .then(m => m.MyTakenServicesComponent)
      }
    ]
  },

  // ── Partenaire Économique ─────────────────────────
  {
    path: 'partenaire-economique',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.PARTNER] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/partenaire-economique/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/partenaire-economique/services/services.components')
          .then(m => m.EconomicPartnerServicesComponent)
      },
      {
        path: 'favorites-collaboration',
        loadComponent: () => import('./shared/favorites-collaboration/favorites-list/favorites-list.component')
          .then(m => m.FavoritesCollaborationListComponent)
      },
      {
  path: 'my-collaborations',
  loadComponent: () => import('./features/partenaire-economique/my-collaboration-partner/my-collaboration-partner.component')
    .then(m => m.MyCollaborationPartnerComponent)
},

    ]
  },

  // ── Partenaire Local ──────────────────────────────
  {
    path: 'partenaire-local',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.LOCAL_PARTNER] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/partenaire-local/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'messagerie',
        loadComponent: () => import('./features/partenaire-local/messagerie/partenaire-local-messagerie.component')
          .then(m => m.PartenaireLocalMessagerieComponent)
      },
      // ✅ CORRIGÉ : lazy load au lieu de component statique
      {
        path: 'acquisition-requests',
        loadComponent: () => import('./features/partenaire-local/myRequests/partner-acquisition-requests.component')
          .then(m => m.PartnerAcquisitionRequestsComponent)
      },
      {
        path: 'requests',
        loadComponent: () => import('./features/partenaire-local/requests/partner-requests.component')
          .then(m => m.PartnerRequestsComponent)
      },
      {
        path: 'requests/:id',
        loadComponent: () => import('./features/partenaire-local/requests/request-detail.component')
          .then(m => m.RequestDetailComponent)
      }
    ]
  },

  // ── Société Internationale ────────────────────────
  {
    path: 'societe-international', 
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.INTERNATIONAL_COMPANY] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/societe-international/dashboard/dashboard')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/investisseur/services/services.component')
          .then(m => m.InvestorServicesComponent),
        data: { userRole: 'INT_COMPANY' }
      },
      {
        path: 'collaboration-services',
        loadComponent: () => import('./features/societe-international/collaboration/collaboration-services.component')
          .then(m => m.CollaborationServicesComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: [Role.INTERNATIONAL_COMPANY] }
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/societe-international/notifications/notifications.component')
          .then(m => m.CompanyNotificationsComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./shared/favoritesInvestservice/favorites-list/favorites-list.component')
          .then(m => m.FavoritesListComponent)
      },
      {
        path: 'favorites-collaboration',
        loadComponent: () => import('./shared/favorites-collaboration/favorites-list/favorites-list.component')
          .then(m => m.FavoritesCollaborationListComponent)
      },
      {
        path: 'messagerie',
        loadComponent: () => import('./features/societe-international/messagerie/societe-international-messagerie.component')
          .then(m => m.SocieteInternationalMessagerieComponent)
      },
      {
        path: 'my-requests',  
        loadComponent: () => import('./features/public/my-acquired-services/my-acquired-services.component')
          .then(m => m.MyAcquiredServicesComponent)
      },
      {
        path: 'my-taken-services',  
        loadComponent: () => import('./features/investisseur/MyTakenService/my-taken-services.component')
          .then(m => m.MyTakenServicesComponent)
      },
      {
  path: 'my-collaborations',
  loadComponent: () => import('./features/societe-international/my-collaboration/my-collaboration.component')
    .then(m => m.MyCollaborationComponent)
}
    ]
  },

  {
    path: 'messagerie',
    loadComponent: () => import('./shared/inbox/inbox.component')
      .then(m => m.InboxComponent),
    canActivate: [authGuard]
  },
  {
    path: 'subscription/payment-success',
    loadComponent: () => import('./shared/Subscription/subscription-success.component')
      .then(m => m.SubscriptionSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'investisseur/subscription/payment-success',
    loadComponent: () => import('./shared/Subscription/subscription-success.component')
      .then(m => m.SubscriptionSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'societe-international/subscription/payment-success',
    loadComponent: () => import('./shared/Subscription/subscription-success.component')
      .then(m => m.SubscriptionSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'my-stats',
    loadComponent: () => import('./shared/user-stats/user-stats.component')
      .then(m => m.UserStatsComponent),
    canActivate: [authGuard]
  },

  // ── Wildcard ──────────────────────────────────────
  { path: '**', redirectTo: '' }
];