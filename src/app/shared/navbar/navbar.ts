import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ChatService } from '../../core/services/chat.service'; // AJOUT: Import du service chat
import { Role, CurrentUser } from '../models/user.model';
import { Subscription } from 'rxjs';
import { MessagerieService } from '../../core/services/messagerie.service';

interface NavLink {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  userPhoto: string = '';
  photoVersion: number = Date.now();
  unreadCount: number = 0; // AJOUT: Propriété pour les messages non lus
  messagerieCount: number = 0;
  private userSubscription: Subscription | null = null;
  private chatSubscription: Subscription | null = null; // AJOUT: Subscription pour le chat
  private messagerieSubscription: Subscription | null = null


  private readonly ROLE_MENUS: Record<Role, NavLink[]> = {
    [Role.ADMIN]: [
      { label: 'Dashboard', route: '/admin/dashboard', icon: '🛡️' }
    ],
    [Role.TOURIST]: [
      { label: 'Dashboard', route: '/touriste/dashboard', icon: '🏠' },
      { label: 'Services', route: '/touriste/services', icon: '🗺️' },
      { label: 'Messagerie', route: '/messagerie', icon: '💬' }
    ],
    [Role.INVESTOR]: [
      { label: 'Dashboard', route: '/investisseur/dashboard', icon: '🏠' },
      { label: 'Services', route: '/investisseur/services', icon: '📈' },
      { label: 'Messagerie', route: '/messagerie', icon: '💬' }
    ],
    [Role.PARTNER]: [
      { label: 'Dashboard', route: '/partenaire-economique/dashboard', icon: '🏠' },
      { label: 'Services', route: '/partenaire-economique/services', icon: '🤝' },
      { label: 'Messagerie', route: '/messagerie', icon: '💬' }
    ],
    [Role.LOCAL_PARTNER]: [
      { label: 'Dashboard', route: '/partenaire-local/dashboard', icon: '🏠' },
      { label: 'Messagerie', route: '/partenaire-local/messagerie', icon: '💬' }
    ],
    [Role.INTERNATIONAL_COMPANY]: [
      { label: 'Dashboard', route: '/societe-international/dashboard', icon: '🏠' },
      { label: 'Services',  route: '/societe-international/services',  icon: '🌐' },
      { label: 'Messagerie', route: '/societe-international/messagerie', icon: '💬' }
    ]
  };

  private readonly ROLE_LABELS: Record<Role, string> = {
    [Role.ADMIN]: 'Administrateur',
    [Role.TOURIST]: 'Touriste',
    [Role.INVESTOR]: 'Investisseur',
    [Role.PARTNER]: 'Partenaire Économique',
    [Role.LOCAL_PARTNER]: 'Partenaire Local',
    [Role.INTERNATIONAL_COMPANY]: 'Société Internationale'
  };

  constructor(
    public authService: AuthService,
    private chatService: ChatService, // AJOUT: Injection du service chat
     private messagerieService: MessagerieService, 
    private router: Router
  ) {}

  ngOnInit() {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('🔄 Navbar: utilisateur mis à jour', user);
      this.currentUser = user;
      this.loadUserPhoto();
      this.photoVersion = Date.now(); // Force le rechargement du composant
      
      // AJOUT: Charger le nombre de messages non lus quand l'utilisateur est connecté
      if (user) {
        this.loadUnreadCount();
        this.loadMessagerieCount();    // ← AJOUT - Messagerie

      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.chatSubscription?.unsubscribe(); // AJOUT: Nettoyer la subscription chat
    this.messagerieSubscription?.unsubscribe(); // ← AJOUT
  }
  // AJOUT: Méthode séparée pour la Messagerie
loadMessagerieCount(): void {
  this.messagerieSubscription = this.messagerieService.getUnreadMessagesCount().subscribe({
    next: (data) => {
      this.messagerieCount = data.unreadCount;
      console.log('📬 messagerieCount:', this.messagerieCount);
    },
    error: (err: any) => console.error('Erreur messagerie count', err)
  });
}

  // AJOUT: Méthode pour charger les messages non lus
  loadUnreadCount(): void {
    this.chatSubscription = this.chatService.getUnreadCount().subscribe({
      next: (data: any) => {
        this.unreadCount = data.count;
      },
      error: (err: any) => console.error('Erreur chargement messages non lus', err)
    });
  }

  loadUserPhoto() {
    if (this.currentUser) {
      // Essayer tous les noms de champs possibles
      this.userPhoto = (this.currentUser as any).profilePhoto || 
                      (this.currentUser as any).profilePicture || 
                      (this.currentUser as any).photo || 
                      (this.currentUser as any).photoProfil || 
                      (this.currentUser as any).picture || 
                      '';
      
      console.log('📸 Photo chargée dans navbar:', this.userPhoto);
    }
  }

  get navLinks(): NavLink[] {
    if (!this.currentUser?.role) return [];
    return this.ROLE_MENUS[this.currentUser.role] || [];
  }

  get roleLabel(): string {
    if (!this.currentUser?.role) return '';
    return this.ROLE_LABELS[this.currentUser.role] || '';
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    
    const first = (this.currentUser as any).prenom?.charAt(0) || 
                  this.currentUser.firstName?.charAt(0) || '';
    const last = (this.currentUser as any).nom?.charAt(0) || 
                 this.currentUser.lastName?.charAt(0) || '';
    
    return (first + last).toUpperCase() || 
           this.currentUser.email?.charAt(0).toUpperCase() || 
           '?';
  }

  getDisplayName(): string {
    if (!this.currentUser) return 'Utilisateur';
    
    return (this.currentUser as any).prenom || 
           this.currentUser.firstName || 
           (this.currentUser as any).nom || 
           this.currentUser.lastName || 
           this.currentUser.email.split('@')[0] || 
           'Utilisateur';
  }

  // ✅ MÉTHODE CORRIGÉE - URL sans paramètre
  getProfilePhoto(): string {
    if (this.userPhoto) {
      // Si c'est déjà une URL complète
      if (this.userPhoto.startsWith('http')) {
        return this.userPhoto;  // Retourne l'URL telle quelle
      } else {
        // Si c'est un chemin relatif
        return `http://localhost:8089/uploads/profile-photos/${this.userPhoto}`;
      }
    }
    return '';
  }

  handleImageError(event: any) {
    console.warn('⚠️ Navbar - Erreur chargement image');
    event.target.style.display = 'none';
    const container = event.target.closest('.avatar-container');
    if (container) {
      const fallback = container.querySelector('.avatar-fallback');
      if (fallback) fallback.classList.remove('hidden');
    }
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    this.authService.logout();
  }
}