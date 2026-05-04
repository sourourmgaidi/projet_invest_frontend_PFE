import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // ✅ AJOUTER
import { AdminService } from '../../../core/services/admin.service';
import type { User, UsersResponse, StatisticsResponse } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  statistics: StatisticsResponse | null = null;
  
  loading = false;
  error = '';
  success = '';
  
  searchTerm = '';
  selectedRole = 'ALL';
  selectedUser: User | null = null;
  showUserDetails = false;
  showDeleteModal = false;
  userToDelete: string | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // ✅ Cache pour les photos de profil
  photoCache: Map<string, string> = new Map();
  photoLoading: Set<string> = new Set();

  roleColors: { [key: string]: string } = {
    'INVESTOR': '#27AE60',
    'TOURIST': '#4A90E2',
    'PARTNER': '#F39C12',
    'LOCAL_PARTNER': '#9B59B6',
    'INTERNATIONAL_COMPANY': '#E74C3C',
    'ADMIN': '#C62828'
  };

  roleLabels: { [key: string]: string } = {
    'INVESTOR': 'INVESTOR',
    'TOURIST': 'TOURIST',
    'PARTNER': 'PARTNER',
    'LOCAL_PARTNER': 'LOCAL PARTNER',
    'INTERNATIONAL_COMPANY': 'INTERNATIONAL COMPANY',
    'ADMIN': 'ADMIN'
  };

  constructor(
    private adminService: AdminService,
    private http: HttpClient // ✅ AJOUTER
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    // ✅ Nettoyer les URLs blob
    this.photoCache.forEach(url => {
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
    this.photoCache.clear();
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer la photo de profil
  getUserProfilePhoto(user: any): string {
    if (!user) return '';
    
    const photoFilename = user.profilePhoto || user.profilePicture || user.photo || '';
    
    if (!photoFilename) return this.getDefaultAvatarSvg();
    
    let fullUrl = '';
    if (photoFilename.startsWith('http')) {
      fullUrl = photoFilename;
    } else {
      fullUrl = `http://localhost:8089/uploads/profile-photos/${photoFilename}`;
    }
    
    const cacheKey = `user-${user.id || user.email}`;
    
    if (this.photoCache.has(cacheKey)) {
      return this.photoCache.get(cacheKey)!;
    }
    
    this.loadUserProfilePhoto(fullUrl, cacheKey);
    return this.getDefaultAvatarSvg();
  }

  // ✅ NOUVELLE MÉTHODE: Avatar par défaut
  private getDefaultAvatarSvg(): string {
    return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%239ca3af\'/%3E%3Ctext x=\'50\' y=\'65\' font-size=\'40\' text-anchor=\'middle\' fill=\'white\'%3E?%3C/text%3E%3C/svg%3E';
  }

  // ✅ NOUVELLE MÉTHODE: Charger la photo
  loadUserProfilePhoto(photoUrl: string, cacheKey: string): void {
    if (this.photoLoading.has(cacheKey)) return;
    
    this.photoLoading.add(cacheKey);
    
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get(photoUrl, { headers, responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.photoCache.set(cacheKey, url);
        this.photoLoading.delete(cacheKey);
      },
      error: (err) => {
        console.error('❌ Erreur chargement photo:', err);
        this.photoLoading.delete(cacheKey);
      }
    });
  }

  loadUsers() {
    this.loading = true;
    this.error = '';
    
    this.adminService.getAllUsers().subscribe({
      next: (response: UsersResponse) => {
        this.users = response.users;
        this.applyFilter();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement utilisateurs:', err);
        this.error = 'Erreur lors du chargement des utilisateurs';
        this.loading = false;
      }
    });
  }

  loadStatistics() {
    this.adminService.getStatistics().subscribe({
      next: (stats: StatisticsResponse) => {
        this.statistics = stats;
      },
      error: (err: any) => {
        console.error('Erreur chargement statistiques:', err);
      }
    });
  }

 searchUsers() {
  const term = this.searchTerm.trim().toLowerCase();

  if (term) {
    this.filteredUsers = this.users.filter(user =>
      user.firstName?.toLowerCase().includes(term) ||
      user.lastName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term)
    );

    if (this.selectedRole !== 'ALL') {
      this.filteredUsers = this.filteredUsers.filter(u => u.role === this.selectedRole);
    }

    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.currentPage = 1;
  } else {
    this.applyFilter();
  }
}

  applyFilter() {
    if (this.selectedRole === 'ALL') {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(u => u.role === this.selectedRole);
    }
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredUsers.slice(start, end);
  }

  changePage(page: number) {
    this.currentPage = page;
  }

  viewUserDetails(user: User) {
    this.selectedUser = user;
    this.showUserDetails = true;
  }

  closeDetails() {
    this.showUserDetails = false;
    this.selectedUser = null;
  }

  confirmDelete(email: string) {
    this.userToDelete = email;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser() {
    if (!this.userToDelete) return;

    this.loading = true;
    this.error = '';
    
    this.adminService.deleteUser(this.userToDelete).subscribe({
      next: (response: any) => {
        this.success = 'Utilisateur supprimé avec succès';
        this.showDeleteModal = false;
        this.userToDelete = null;
        this.loadUsers();
        this.loadStatistics();
        
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err: any) => {
        console.error('Erreur suppression:', err);
        this.error = err.error?.error || 'Erreur lors de la suppression';
        this.loading = false;
        this.showDeleteModal = false;
      }
    });
  }

  getRoleColor(role: string): string {
    return this.roleColors[role] || '#666';
  }

  getRoleLabel(role: string): string {
    return this.roleLabels[role] || role;
  }

  getUserInitials(user: User): string {
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email.charAt(0).toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  refreshData() {
    this.searchTerm = '';
    this.selectedRole = 'ALL';
    this.loadUsers();
    this.loadStatistics();
  }
}