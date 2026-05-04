import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FavoriteTouristService } from '../../../core/services/favorite-tourist.service';
import { ChatbotWidgetComponent } from "../../../shared/Agents/chatbot-widget.component";
import { AcquisitionService } from '../../../core/services/acquisition.service'; // ✅ IMPORT AcquisitionService

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent, ChatbotWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  // Compteurs
  savedCount = 0;
  servicesCount = 0;
  recommendationsCount = 0;
  touristServices: any[] = [];
  
  // Compteur de favoris
  favoritesCount = 0;
  
  // ✅ NOUVEAUX compteurs pour les demandes
  requestsCount = 0;
  pendingRequestsCount = 0;

  private http = inject(HttpClient);
  private favoriteService = inject(FavoriteTouristService);
  private acquisitionService = inject(AcquisitionService); // ✅ NOUVEAU service

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadServicesCount();
    this.loadFavoritesCount();
    this.loadRequestsCount(); // ✅ NOUVEL appel
    // Vous pouvez ajouter d'autres méthodes pour savedCount et recommendationsCount
  }

  // Charger les services touristiques disponibles
  loadServicesCount(): void {
    this.http.get<any[]>('http://localhost:8089/api/tourist-services/approved',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.servicesCount = data.length;
        this.touristServices = data;
        console.log(`✅ ${this.servicesCount} services touristiques disponibles`);
        console.log('📋 Premiers services:', this.touristServices.slice(0, 3));
      },
      error: (err) => {
        console.error('❌ Erreur chargement services touristiques:', err);
        this.servicesCount = 0;
        this.touristServices = [];
      }
    });
  }

  // Charger le nombre de favoris
  loadFavoritesCount(): void {
    console.log('🔄 Chargement du nombre de favoris...');
    
    this.favoriteService.getFavoritesCount().subscribe({
      next: (count) => {
        console.log('📥 Réponse reçue:', count);
        this.favoritesCount = count;
        console.log(`✅ ${this.favoritesCount} favoris trouvés`);
      },
      error: (err) => {
        console.error('❌ Erreur détaillée:', err);
        this.favoritesCount = 0;
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Charger le nombre de demandes
  loadRequestsCount(): void {
    console.log('🔄 Chargement des demandes...');
    
    this.acquisitionService.getTouristMyAll().subscribe({
      next: (requests) => {
        this.requestsCount = requests.length;
        // Compter les demandes en attente (PENDING ou RESERVED)
        this.pendingRequestsCount = requests.filter(
          r => r.paymentStatus === 'PENDING_PARTNER_APPROVAL' || 
               r.paymentStatus === 'RESERVED'
        ).length;
        console.log(`✅ ${this.requestsCount} demandes trouvées (${this.pendingRequestsCount} en attente)`);
      },
      error: (err) => {
        console.error('❌ Erreur chargement des demandes:', err);
        this.requestsCount = 0;
        this.pendingRequestsCount = 0;
      }
    });
  }

  // Vous pouvez ajouter ces méthodes si les APIs existent
  /*
  loadSavedCount(): void {
    // Appel API pour les destinations sauvegardées
  }

  loadRecommendationsCount(): void {
    // Appel API pour les recommandations
  }
  */
}