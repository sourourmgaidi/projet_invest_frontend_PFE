import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';

// IMPORTER LES SERVICES
import { ServiceRequestService } from '../../../core/services/service-request.service';
import { CollaborationRequestService } from '../../../core/services/collaboration-request.service';
import { TouristRequestService } from '../../../core/services/tourist-request.service';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NavbarComponent, RouterModule, CommonModule, NotificationBellComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  // Compteurs pour les services
  pendingServicesCount = 0;
  pendingInvestmentCount = 0;
  pendingCollaborationCount = 0;
  pendingTouristCount = 0;

  // Compteurs pour les requests
  totalRequestsCount = 0;
  investmentRequestsCount = 0;
  collaborationRequestsCount = 0;
  touristRequestsCount = 0;
  pendingEditRequestsCount = 0;
  pendingDeleteRequestsCount = 0;

  // Propriétés pour les notifications
  showNotifications = false;
  notificationCount = 0;
  notifications: any[] = [];

  // ✅ NOUVELLES PROPRIÉTÉS POUR LES STATISTIQUES
  totalUsers: number = 0;
  totalServices: number = 0;
  monthlyTrend: number = 0;
  isLoadingStats: boolean = true;

  constructor(
    private http: HttpClient,
    // INJECTER LES SERVICES (comme dans AdminRequestsComponent)
    private investmentService: ServiceRequestService,
    private collaborationService: CollaborationRequestService,
    private touristService: TouristRequestService
  ) {}

  ngOnInit(): void {
    this.loadPendingCount();
    this.loadRequestsCount();
    this.loadNotifications();
    this.loadStatisticsPreview(); // ✅ AJOUTER CETTE LIGNE
  }

  // Charge le nombre de services en attente
  loadPendingCount(): void {
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<{ collaboration: any[]; investment: any[]; tourist: any[] }>(
      'http://localhost:8089/api/admin/services/pending',
      { headers }
    ).subscribe({
      next: (data) => {
        this.pendingCollaborationCount = data.collaboration?.length || 0;
        this.pendingInvestmentCount = data.investment?.length || 0;
        this.pendingTouristCount = data.tourist?.length || 0;
        
        this.pendingServicesCount = 
          this.pendingCollaborationCount +
          this.pendingInvestmentCount +
          this.pendingTouristCount;
        
        console.log('📊 Services en attente:', {
          total: this.pendingServicesCount,
          collaboration: this.pendingCollaborationCount,
          investment: this.pendingInvestmentCount,
          tourist: this.pendingTouristCount
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement services:', err);
        this.pendingServicesCount = 0;
        this.pendingCollaborationCount = 0;
        this.pendingInvestmentCount = 0;
        this.pendingTouristCount = 0;
      }
    });
  }

  // ✅ VERSION CORRIGÉE - Comme dans AdminRequestsComponent
  loadRequestsCount(): void {
    console.log('🔍 Chargement des demandes...');

    // Réinitialiser les compteurs
    this.totalRequestsCount = 0;
    this.investmentRequestsCount = 0;
    this.collaborationRequestsCount = 0;
    this.touristRequestsCount = 0;
    this.pendingEditRequestsCount = 0;
    this.pendingDeleteRequestsCount = 0;

    // Variable pour suivre le nombre de requêtes terminées
    let completedRequests = 0;
    const totalRequests = 3;

    const checkCompletion = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        console.log('📊 RÉSULTATS FINAUX:', {
          total: this.totalRequestsCount,
          investment: this.investmentRequestsCount,
          collaboration: this.collaborationRequestsCount,
          tourist: this.touristRequestsCount,
          edit: this.pendingEditRequestsCount,
          delete: this.pendingDeleteRequestsCount
        });
      }
    };

    // === INVESTMENT REQUESTS ===
    this.investmentService.getAllRequests().subscribe({
      next: (response) => {
        console.log('✅ Investment response:', response);
        
        // Filtrer les demandes en attente
        const pendingRequests = response.requests?.filter((r: any) => r.status === 'PENDING') || [];
        this.investmentRequestsCount = pendingRequests.length;
        
        // Compter par type
        pendingRequests.forEach((req: any) => {
          if (req.requestType === 'EDIT') this.pendingEditRequestsCount++;
          else if (req.requestType === 'DELETE') this.pendingDeleteRequestsCount++;
        });
        
        this.totalRequestsCount += this.investmentRequestsCount;
        console.log('📊 Investment count:', this.investmentRequestsCount);
        checkCompletion();
      },
      error: (err) => {
        console.warn('Could not load investment requests', err);
        this.investmentRequestsCount = 0;
        checkCompletion();
      }
    });

    // === COLLABORATION REQUESTS ===
    this.collaborationService.getAllRequests().subscribe({
      next: (response) => {
        console.log('✅ Collaboration response:', response);
        
        // Filtrer les demandes en attente
        const pendingRequests = response.requests?.filter((r: any) => r.status === 'PENDING') || [];
        this.collaborationRequestsCount = pendingRequests.length;
        
        // Compter par type
        pendingRequests.forEach((req: any) => {
          if (req.requestType === 'EDIT') this.pendingEditRequestsCount++;
          else if (req.requestType === 'DELETE') this.pendingDeleteRequestsCount++;
        });
        
        this.totalRequestsCount += this.collaborationRequestsCount;
        console.log('📊 Collaboration count:', this.collaborationRequestsCount);
        checkCompletion();
      },
      error: (err) => {
        console.warn('Could not load collaboration requests', err);
        this.collaborationRequestsCount = 0;
        checkCompletion();
      }
    });

    // === TOURIST REQUESTS ===
    this.touristService.getAllRequests().subscribe({
      next: (response) => {
        console.log('✅ Tourist response:', response);
        
        // Gestion des différentes structures de réponse
        let requests: any[] = [];
        if (Array.isArray(response)) {
          requests = response;
        } else if (response.requests) {
          requests = response.requests;
        }
        
        // Filtrer les demandes en attente
        const pendingRequests = requests.filter(r => r.status === 'PENDING') || [];
        this.touristRequestsCount = pendingRequests.length;
        
        // Compter par type
        pendingRequests.forEach((req: any) => {
          if (req.requestType === 'EDIT') this.pendingEditRequestsCount++;
          else if (req.requestType === 'DELETE') this.pendingDeleteRequestsCount++;
        });
        
        this.totalRequestsCount += this.touristRequestsCount;
        console.log('📊 Tourist count:', this.touristRequestsCount);
        console.log('📊 TOTAL Demandes:', this.totalRequestsCount);
        checkCompletion();
      },
      error: (err) => {
        console.warn('Could not load tourist requests', err);
        this.touristRequestsCount = 0;
        checkCompletion();
      }
    });
  }

  // Charge les notifications de l'admin
  loadNotifications(): void {
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>('http://localhost:8089/api/notifications/admin', { headers })
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications || [];
          this.notificationCount = response.unreadCount || 0;
          console.log('🔔 Notifications chargées:', {
            total: this.notifications.length,
            unread: this.notificationCount
          });
        },
        error: (err) => {
          console.error('❌ Erreur chargement notifications:', err);
          this.notifications = [];
          this.notificationCount = 0;
        }
      });
  }

  // ✅ NOUVELLE MÉTHODE POUR CHARGER L'APERÇU DES STATISTIQUES
  loadStatisticsPreview(): void {
    this.isLoadingStats = true;
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // Récupérer le résumé des statistiques
    this.http.get<any>('http://localhost:8089/api/stats/summary', { headers })
      .subscribe({
        next: (summary) => {
          this.totalUsers = 
            (summary.totalInvestors || 0) +
            (summary.totalEconomicPartners || 0) +
            (summary.totalInternationalCompanies || 0) +
            (summary.totalTourists || 0) +
            (summary.totalLocalPartners || 0);
          
          this.totalServices = 
            (summary.approvedInvestmentServices || 0) +
            (summary.approvedCollaborationServices || 0) +
            (summary.approvedTouristServices || 0);
          
          this.isLoadingStats = false;
          console.log('📊 Statistiques chargées:', {
            totalUsers: this.totalUsers,
            totalServices: this.totalServices
          });
        },
        error: (err) => {
          console.error('Error loading stats preview:', err);
          this.totalUsers = 0;
          this.totalServices = 0;
          this.isLoadingStats = false;
        }
      });

    // Récupérer la tendance mensuelle pour l'aperçu
    this.http.get<any>('http://localhost:8089/api/stats/notification', { headers, responseType: 'text' as 'json' })
      .subscribe({
        next: (notification: string) => {
          // Extraire le pourcentage de la notification
          const match = notification.match(/(\d+)%/);
          if (match) {
            this.monthlyTrend = parseInt(match[1]);
          } else {
            this.monthlyTrend = 0;
          }
          console.log('📈 Tendance mensuelle:', this.monthlyTrend);
        },
        error: (err) => {
          console.error('Error loading trend:', err);
          this.monthlyTrend = 0;
        }
      });
  }

  // Toggle le panneau de notifications
  toggleNotificationPanel(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  // Fermer le panneau de notifications
  closeNotificationPanel(): void {
    this.showNotifications = false;
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: number): void {
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.put(`http://localhost:8089/api/notifications/${notificationId}/read`, {}, { headers })
      .subscribe({
        next: () => {
          const notification = this.notifications.find(n => n.id === notificationId);
          if (notification) {
            notification.read = true;
          }
          this.notificationCount = this.notifications.filter(n => !n.read).length;
        },
        error: (err) => {
          console.warn('Could not mark notification as read', err);
        }
      });
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): void {
    const token = localStorage.getItem('auth_token') || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.put('http://localhost:8089/api/notifications/mark-all-read', {}, { headers })
      .subscribe({
        next: () => {
          this.notifications.forEach(n => n.read = true);
          this.notificationCount = 0;
        },
        error: (err) => {
          console.warn('Could not mark all notifications as read', err);
        }
      });
  }

  // Rafraîchir toutes les données
  refreshData(): void {
    this.loadPendingCount();
    this.loadRequestsCount();
    this.loadNotifications();
    this.loadStatisticsPreview(); // ✅ AJOUTER CETTE LIGNE
  }

  // Formater la date des notifications
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Obtenir l'icône selon le type de notification
  getNotificationIcon(notification: any): string {
    if (notification.title?.includes('investissement')) return '📈';
    if (notification.title?.includes('collaboration')) return '🤝';
    if (notification.title?.includes('touristique')) return '🌍';
    if (notification.title?.includes('modification')) return '✏️';
    if (notification.title?.includes('suppression')) return '🗑️';
    if (notification.title?.includes('approuvé')) return '✅';
    if (notification.title?.includes('rejeté')) return '❌';
    return '📢';
  }
}