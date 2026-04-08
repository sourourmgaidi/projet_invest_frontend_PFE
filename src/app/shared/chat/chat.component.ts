import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { ChatService, ChatMessage, ChatAttachment, Conversation, UserSearchResult } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth';
import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    JwtHelperService,
    { provide: JWT_OPTIONS, useValue: {} }
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  selectedFiles: File[] = [];
  unreadCount = 0;
  loading = false;
  userRole: string = '';
  userName: string = '';
  userId: number = 0;
  userEmail: string = '';
  
  // ✅ MAP POUR LES COMPTEURS DE MESSAGES NON LUS PAR CONVERSATION
  unreadCounts: Map<string, number> = new Map();

  // NOUVELLES PROPRIÉTÉS POUR LA RECHERCHE
  showUserSearch: boolean = false;
  searchQuery: string = '';
  searchResults: UserSearchResult[] = [];
  searchLoading: boolean = false;
  searchTimeout: any;

  // ========================================
  // ✅ PROPRIÉTÉS POUR LES IMAGES
  // ========================================
  selectedImage: { url: string; name: string; attachment: ChatAttachment } | null = null;
  imageBlobUrls: Map<number, string> = new Map();
  imageLoading: Set<number> = new Set();

  constructor(
    private chatService: ChatService,
    private jwtHelper: JwtHelperService,
    private authService: AuthService,
      private router: Router
  ) {
    this.loadUserFromAuth();
  }

  ngOnInit(): void {
    this.loadUserFromAuth();
    this.loadConversations();
    this.loadUnreadCount();
    
    if (!this.isAdmin) {
      this.loadAdminsForNonAdmin();
    }
  }

  ngOnDestroy(): void {
    this.imageBlobUrls.forEach(url => {
      window.URL.revokeObjectURL(url);
    });
    this.imageBlobUrls.clear();
  }

  /**
   * Charger les informations depuis AuthService
   */
  loadUserFromAuth(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userRole = currentUser.role || 'USER';
      this.userName = currentUser.prenom || currentUser.firstName || 'Utilisateur';
      this.userId = currentUser.id || 0;
      this.userEmail = currentUser.email || '';
      
      console.log('✅ Utilisateur chargé depuis AuthService:', {
        role: this.userRole,
        name: this.userName,
        id: this.userId,
        isAdmin: this.userRole === 'ADMIN'
      });
      
      localStorage.setItem('userRole', this.userRole);
      localStorage.setItem('userName', this.userName);
      localStorage.setItem('userId', this.userId.toString());
      localStorage.setItem('userEmail', this.userEmail);
    } else {
      this.fallbackToLocalStorage();
    }
  }

  /**
   * Vérifier si l'utilisateur courant est admin
   */
  get isAdmin(): boolean {
    return this.userRole === 'ADMIN';
  }

  /**
   * Fallback sur localStorage
   */
  fallbackToLocalStorage(): void {
    this.userRole = localStorage.getItem('userRole') || 'USER';
    this.userName = localStorage.getItem('userName') || 'Utilisateur';
    this.userId = parseInt(localStorage.getItem('userId') || '0');
    this.userEmail = localStorage.getItem('userEmail') || '';
    
    console.log('🔄 Fallback localStorage:', {
      role: this.userRole,
      name: this.userName,
      id: this.userId,
      isAdmin: this.isAdmin
    });
  }

  getCurrentUserId(): number {
    return this.userId;
  }

  /**
   * ✅ NOUVELLE MÉTHODE POUR CHARGER LES NON LUS D'UNE CONVERSATION
   */
  loadUnreadCountForConversation(conv: any): void {
    const convKey = `${conv.otherRole}_${conv.otherId}`;
    
    this.chatService.getConversation(conv.otherRole, conv.otherId).subscribe({
      next: (data: any) => {
        let messagesData = data.content || data || [];
        
        // Compter les messages non lus (reçus et non lus)
        const unreadCount = messagesData.filter(
          (msg: any) => !msg.read && msg.receiverId === this.userId
        ).length;
        
        // Stocker le compteur
        this.unreadCounts.set(convKey, unreadCount);
        
        console.log(`📬 Conversation avec ${conv.otherRole} ${conv.otherId}: ${unreadCount} non lu(s)`);
      },
      error: (err) => console.error('Erreur chargement messages pour compteur', err)
    });
  }

  /**
   * ✅ MÉTHODE POUR OBTENIR LE COMPTEUR D'UNE CONVERSATION
   */
  getUnreadCount(conv: any): number {
    const convKey = `${conv.otherRole}_${conv.otherId}`;
    return this.unreadCounts.get(convKey) || 0;
  }

  /**
   * ✅ MODIFIÉ: Charger les conversations avec les compteurs
   */
  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        console.log('📥 Conversations brutes:', conversations);
        
        this.conversations = conversations;
        
        // POUR CHAQUE CONVERSATION, CHARGER LES MESSAGES POUR COMPTER LES NON LUS
        this.conversations.forEach(conv => {
          this.loadUnreadCountForConversation(conv);
        });
        
        // Si l'utilisateur est admin, enrichir avec les noms de tous les utilisateurs
        if (this.isAdmin) {
          this.chatService.getAllUsers().subscribe({
            next: (users) => {
              console.log('📋 Tous les utilisateurs chargés:', users.length);
              
              const usersMap = new Map<number, UserSearchResult>();
              users.forEach(user => {
                usersMap.set(user.id, user);
              });
              
              this.conversations = this.conversations.map(conv => {
                const user = usersMap.get(conv.otherId);
                if (user) {
                  return {
                    ...conv,
                    otherFirstName: user.firstName,
                    otherLastName: user.lastName,
                    otherDisplayName: user.displayName || `${user.firstName} ${user.lastName}`.trim()
                  };
                }
                return conv;
              });
              
              console.log('✅ Conversations enrichies pour admin:', this.conversations);
            },
            error: (err) => {
              console.error('❌ Erreur chargement users:', err);
            }
          });
        } else {
          this.chatService.getAdmins().subscribe({
            next: (admins) => {
              console.log('👥 Admins chargés:', admins.length);
              
              const adminsMap = new Map<number, UserSearchResult>();
              admins.forEach(admin => {
                adminsMap.set(admin.id, admin);
              });
              
              this.conversations = this.conversations.map(conv => {
                const admin = adminsMap.get(conv.otherId);
                if (admin) {
                  return {
                    ...conv,
                    otherFirstName: admin.firstName,
                    otherLastName: admin.lastName,
                    otherDisplayName: admin.displayName || `${admin.firstName} ${admin.lastName}`.trim()
                  };
                }
                return conv;
              });
              
              console.log('✅ Conversations enrichies pour non-admin:', this.conversations);
            },
            error: (err) => {
              console.error('❌ Erreur chargement admins:', err);
            }
          });
        }
      },
      error: (err: any) => console.error('Erreur chargement conversations', err)
    });
  }

  loadUnreadCount(): void {
    this.chatService.getUnreadCount().subscribe({
      next: (data: any) => this.unreadCount = data.count || 0,
      error: (err: any) => console.error('Erreur compteur non lus', err)
    });
  }

  /**
   * ✅ MODIFIÉ: Réinitialiser le compteur quand on sélectionne une conversation
   */
  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    
    // Remettre le compteur à 0 pour cette conversation
    const convKey = `${conversation.otherRole}_${conversation.otherId}`;
    this.unreadCounts.set(convKey, 0);
    
    this.loadMessages(conversation.otherRole, conversation.otherId);
  }

  loadMessages(targetRole: string, targetId: number): void {
    this.loading = true;
    this.chatService.getConversation(targetRole, targetId).subscribe({
      next: (data: any) => {
        console.log('Messages reçus:', data);
        let messagesData = data.content || data || [];
        this.messages = messagesData.sort((a: any, b: any) => 
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        this.loading = false;
        setTimeout(() => {
          this.markMessagesAsRead();
          this.scrollToBottom();
        }, 500);
      },
      error: (err: any) => {
        console.error('Erreur chargement messages', err);
        this.loading = false;
      }
    });
  }

  /**
   * ✅ MODIFIÉ: Mettre à jour les compteurs quand on marque les messages comme lus
   */
  markMessagesAsRead(): void {
    let markedCount = 0;
    
    this.messages.forEach(msg => {
      if (!msg.read && msg.receiverId === this.userId) {
        this.chatService.markAsRead(msg.id).subscribe();
        markedCount++;
      }
    });
    
    if (markedCount > 0 && this.selectedConversation) {
      console.log(`✅ ${markedCount} message(s) marqué(s) comme lu`);
      
      // Mettre à jour le compteur global
      this.unreadCount = Math.max(0, this.unreadCount - markedCount);
      
      // Mettre à jour le compteur de la conversation sélectionnée
      const convKey = `${this.selectedConversation.otherRole}_${this.selectedConversation.otherId}`;
      this.unreadCounts.set(convKey, 0);
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() && this.selectedFiles.length === 0) return;

    if (this.selectedConversation) {
      if (this.selectedFiles.length > 0) {
        this.chatService.sendMessageWithAttachments(
          this.selectedConversation.otherRole,
          this.selectedConversation.otherId,
          this.newMessage,
          this.selectedFiles
        ).subscribe({
          next: (msg: ChatMessage) => {
            this.messages = [...this.messages, msg];
            this.newMessage = '';
            this.selectedFiles = [];
            this.scrollToBottom();
          },
          error: (err: any) => console.error('Erreur envoi message', err)
        });
      } else {
        this.chatService.sendMessage(
          this.selectedConversation.otherRole,
          this.selectedConversation.otherId,
          this.newMessage
        ).subscribe({
          next: (msg: ChatMessage) => {
            this.messages = [...this.messages, msg];
            this.newMessage = '';
            this.scrollToBottom();
          },
          error: (err: any) => console.error('Erreur envoi message', err)
        });
      }
    }
  }

  onFileSelected(event: any): void {
    this.selectedFiles = Array.from(event.target.files);
  }

  downloadFile(attachment: ChatAttachment): void {
    this.chatService.downloadAttachment(attachment.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Erreur téléchargement', err)
    });
  }

  /**
   * Supprimer un message avec confirmation selon son état
   */
  deleteMessage(message: ChatMessage): void {
    // Déterminer le message de confirmation selon que le message est lu ou non
    let confirmationMessage = '';
    let isUnread = !message.read;
    
    if (isUnread) {
      confirmationMessage = 
        `⚠️ ATTENTION: Ce message n'a pas été lu par ${message.receiverName}.\n\n` +
        `La suppression le supprimera DÉFINITIVEMENT pour vous deux.\n` +
        `Cette action est irréversible.`;
    } else {
      confirmationMessage = 
        `ℹ️ Ce message a été lu.\n\n` +
        `Il sera supprimé seulement de VOTRE vue.\n` +
        `${message.senderId === this.userId ? 'Le destinataire' : 'L\'expéditeur'} pourra toujours le voir.`;
    }
    
    if (confirm(confirmationMessage)) {
      this.chatService.deleteMessage(message.id).subscribe({
        next: (response: any) => {
          // Retirer le message de la liste
          this.messages = this.messages.filter(m => m.id !== message.id);
          
          // Afficher une notification selon le type de suppression
          if (response.type === 'PERMANENT') {
            console.log('✅ Message supprimé définitivement pour tous');
            alert('✅ Message supprimé définitivement pour tous');
          } else {
            console.log('✅ Message supprimé de votre vue');
            alert('✅ Message supprimé de votre vue');
          }
          
          // Recharger les messages pour être sûr
          if (this.selectedConversation) {
            this.loadMessages(
              this.selectedConversation.otherRole, 
              this.selectedConversation.otherId
            );
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur suppression', err);
          alert('Erreur lors de la suppression du message');
        }
      });
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  formatTime(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const msgDate = new Date(date);
    const today = new Date();
    if (msgDate.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    return msgDate.toLocaleDateString('fr-FR');
  }

  shouldShowDate(message: ChatMessage, index: number): boolean {
    if (!message || !message.sentAt) return false;
    if (index === 0) return true;
    const currentDate = new Date(message.sentAt).toDateString();
    const prevDate = new Date(this.messages[index - 1].sentAt).toDateString();
    return currentDate !== prevDate;
  }

  isImage(fileType: string): boolean {
    return fileType?.startsWith('image/') || false;
  }

  getFileIcon(fileType: string): string {
    if (!fileType) return '📎';
    if (fileType.startsWith('image/')) return '📷';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📎';
  }

  /**
   * Obtenir les initiales pour l'avatar de la conversation
   */
  getConversationInitial(conv: Conversation): string {
    if (!conv) return '?';
    
    if (conv.otherFirstName) {
      return conv.otherFirstName.charAt(0).toUpperCase();
    }
    
    if (conv.otherDisplayName) {
      return conv.otherDisplayName.charAt(0).toUpperCase();
    }
    
    return (conv.otherRole || '?').charAt(0);
  }

  /**
   * Obtenir le nom d'affichage de la conversation
   */
  getConversationName(conv: Conversation): string {
    if (!conv) return 'Inconnu';
    
    if (conv.otherDisplayName) {
      return conv.otherDisplayName;
    }
    
    if (conv.otherFirstName && conv.otherLastName) {
      return `${conv.otherFirstName} ${conv.otherLastName}`;
    } else if (conv.otherFirstName) {
      return conv.otherFirstName;
    } else if (conv.otherLastName) {
      return conv.otherLastName;
    }
    
    return conv.otherRole || 'Inconnu';
  }

  /**
   * Obtenir le libellé du rôle en français
   */
  getConversationRole(conv: Conversation): string {
    if (!conv || !conv.otherRole) return '';
    
    if (conv.otherRole === 'ADMIN') return '';
    
    const roleMap: { [key: string]: string } = {
      'TOURIST': 'Touriste',
      'INVESTOR': 'Investisseur',
      'PARTNER': 'Partenaire économique',
      'LOCAL_PARTNER': 'Partenaire local',
      'INTERNATIONAL_COMPANY': 'Société internationale'
    };
    
    return roleMap[conv.otherRole] || conv.otherRole;
  }

  getConversationTime(conv: any): string {
    if (!conv || !conv.lastMessageDate) return '';
    return this.formatTime(conv.lastMessageDate);
  }

  // ========================================
  // MÉTHODES POUR LES IMAGES
  // ========================================

  loadImage(attachment: ChatAttachment): void {
    if (this.imageLoading.has(attachment.id)) {
      return;
    }
    
    this.imageLoading.add(attachment.id);
    
    this.chatService.downloadAttachment(attachment.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        this.imageBlobUrls.set(attachment.id, url);
        this.imageLoading.delete(attachment.id);
        this.updateImagesWithId(attachment.id, url);
        console.log(`✅ Image ${attachment.id} chargée avec succès: ${attachment.fileName}`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement image ${attachment.id}:`, err);
        this.imageLoading.delete(attachment.id);
        this.updateImagesWithId(attachment.id, 'assets/images/image-not-found.png');
      }
    });
  }

  private updateImagesWithId(attachmentId: number, url: string): void {
    const images = document.querySelectorAll(`img[data-attachment-id="${attachmentId}"]`);
    images.forEach(img => {
      img.setAttribute('src', url);
    });
  }

  getImageUrl(attachment: ChatAttachment): string {
    if (this.imageBlobUrls.has(attachment.id)) {
      return this.imageBlobUrls.get(attachment.id)!;
    } else {
      this.loadImage(attachment);
      return 'assets/images/loading-image.png';
    }
  }

  openImage(attachment: ChatAttachment): void {
    if (this.imageBlobUrls.has(attachment.id)) {
      this.selectedImage = {
        url: this.imageBlobUrls.get(attachment.id)!,
        name: attachment.fileName,
        attachment: attachment
      };
    } else {
      this.chatService.downloadAttachment(attachment.id).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          this.imageBlobUrls.set(attachment.id, url);
          this.selectedImage = {
            url: url,
            name: attachment.fileName,
            attachment: attachment
          };
        },
        error: (err) => console.error('Erreur chargement image', err)
      });
    }
  }

  closeImage(): void {
    this.selectedImage = null;
  }

  onAttachmentLoad(attachment: ChatAttachment): void {
    // Géré par loadImage
  }

  onAttachmentError(attachment: ChatAttachment): void {
    console.error(`❌ Erreur événement image ${attachment.id}`);
    this.updateImagesWithId(attachment.id, 'assets/images/image-not-found.png');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ========================================
  // MÉTHODES POUR LA RECHERCHE D'UTILISATEURS
  // ========================================

  openNewChat(): void {
    this.loadUserFromAuth();
    
    console.log('📬 Ouverture du chat - Rôle:', this.userRole, 'isAdmin:', this.isAdmin);
    
    this.showUserSearch = true;
    this.searchQuery = '';
    this.searchResults = [];
    
    if (this.isAdmin) {
      console.log('📋 Chargement de TOUS les utilisateurs...');
      this.loadAllUsersForSearch();
    } else {
      console.log('👥 Chargement des admins seulement...');
      this.loadAdminsForSearch();
    }
  }

  closeUserSearch(): void {
    this.showUserSearch = false;
    this.searchQuery = '';
    this.searchResults = [];
    clearTimeout(this.searchTimeout);
  }

  loadAllUsersForSearch(): void {
    this.searchLoading = true;
    this.chatService.getAllUsers().subscribe({
      next: (users) => {
        console.log('✅ getAllUsers a retourné:', users.length, 'utilisateurs');
        this.searchResults = users.filter(user => user.id !== this.userId);
        this.searchLoading = false;
        console.log('📋 Admin - Tous les utilisateurs chargés:', this.searchResults.length);
        
        const roles = this.countUsersByRole(this.searchResults);
        console.log('📊 Répartition par rôle:', roles);
      },
      error: (err) => {
        console.error('❌ Erreur chargement tous utilisateurs', err);
        this.searchLoading = false;
      }
    });
  }

  countUsersByRole(users: UserSearchResult[]): any {
    const counts: any = {};
    users.forEach(user => {
      counts[user.role] = (counts[user.role] || 0) + 1;
    });
    return counts;
  }

  loadAdminsForSearch(): void {
    this.searchLoading = true;
    this.chatService.getAdmins().subscribe({
      next: (admins) => {
        this.searchResults = admins.filter(admin => admin.id !== this.userId);
        this.searchLoading = false;
        console.log('👥 Non-admin - Admins chargés:', this.searchResults.length);
      },
      error: (err) => {
        console.error('Erreur chargement admins', err);
        this.searchLoading = false;
      }
    });
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    
    if (this.searchQuery.length < 2) {
      if (this.isAdmin) {
        this.loadAllUsersForSearch();
      } else {
        this.loadAdminsForSearch();
      }
      return;
    }

    this.searchLoading = true;
    
    this.searchTimeout = setTimeout(() => {
      if (this.isAdmin) {
        this.chatService.searchUsers(this.searchQuery).subscribe({
          next: (results) => {
            this.searchResults = results.filter(user => user.id !== this.userId);
            this.searchLoading = false;
            console.log('🔍 Admin - Résultats recherche:', this.searchResults.length);
          },
          error: (err) => {
            console.error('Erreur recherche', err);
            this.searchLoading = false;
          }
        });
      } else {
        this.chatService.getAdmins().subscribe({
          next: (admins) => {
            this.searchResults = admins.filter(admin => 
              admin.id !== this.userId && (
                admin.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                (admin.firstName && admin.firstName.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                (admin.lastName && admin.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()))
              )
            );
            this.searchLoading = false;
            console.log('🔍 Non-admin - Résultats recherche admins:', this.searchResults.length);
          },
          error: (err) => {
            console.error('Erreur recherche admins', err);
            this.searchLoading = false;
          }
        });
      }
    }, 300);
  }

  loadAdminsForNonAdmin(): void {
    this.chatService.getAdmins().subscribe({
      next: (admins) => {
        console.log('Admins disponibles:', admins);
        const existingAdminIds = this.conversations
          .filter(c => c.otherRole === 'ADMIN')
          .map(c => c.otherId);
        
        const newAdmins = admins.filter(a => !existingAdminIds.includes(a.id));
        
        const adminConversations = newAdmins.map(admin => ({
          otherRole: admin.role,
          otherId: admin.id,
          lastMessageDate: new Date().toISOString(),
          otherFirstName: admin.firstName,
          otherLastName: admin.lastName,
          otherDisplayName: admin.displayName || `${admin.firstName} ${admin.lastName}`.trim()
        }));
        
        this.conversations = [...adminConversations, ...this.conversations];
      },
      error: (err) => console.error('Erreur chargement admins', err)
    });
  }

 startConversationWithUser(user: UserSearchResult): void {
  this.closeUserSearch();
  
  const existingConv = this.conversations.find(
    c => c.otherId === user.id && c.otherRole === user.role
  );

  if (existingConv) {
    this.selectConversation(existingConv);
  } else {
    // ✅ SOLUTION SIMPLE: Créer la conversation localement sans appel API
    const newConv: Conversation = {
      otherRole: user.role,
      otherId: user.id,
      lastMessageDate: new Date().toISOString(),
      otherFirstName: user.firstName,
      otherLastName: user.lastName,
      otherDisplayName: user.displayName || `${user.firstName} ${user.lastName}`.trim()
    };
    
    // Ajouter la conversation à la liste
    this.conversations = [newConv, ...this.conversations];
    
    // Sélectionner la nouvelle conversation
    setTimeout(() => {
      this.selectConversation(newConv);
    }, 100);
    
    console.log('✅ Nouvelle conversation créée localement sans message');
  }
}

  getUserInitials(user: UserSearchResult): string {
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.email[0].toUpperCase();
  }

  onImageError(user: UserSearchResult): void {
    user.profilePhoto = undefined;
  }

  canStartConversationWith(user: UserSearchResult): boolean {
    if (this.isAdmin) return true;
    return user.role === 'ADMIN';
  }

  /**
   * ✅ Retourner au dashboard selon le rôle de l'utilisateur
   */
 returnToDashboard(): void {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    this.router.navigate(['/login']);
    return;
  }

  // ✅ Décoder le JWT sans librairie externe
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔑 Token payload:', payload);

    // Keycloak met les rôles dans realm_access.roles
    const roles: string[] = payload?.realm_access?.roles || [];
    console.log('🎭 Rôles trouvés:', roles);

    const roleRoutes: Record<string, string> = {
      'ADMIN':                 '/admin/dashboard',
      'TOURIST':               '/touriste/dashboard',
      'INVESTOR':              '/investisseur/dashboard',
      'PARTNER':               '/partenaire-economique/dashboard',
      'LOCAL_PARTNER':         '/partenaire-local/dashboard',
      'INTERNATIONAL_COMPANY': '/societe-international/dashboard',
    };

    // Trouver le premier rôle métier dans le token
    const matchedRole = Object.keys(roleRoutes).find(r => roles.includes(r));

    if (!matchedRole) {
      console.warn('⚠️ Aucun rôle métier trouvé dans le token, rôles:', roles);
      this.router.navigate(['/login']);
      return;
    }

    const dashboardPath = roleRoutes[matchedRole];
    console.log('🚀 Redirection vers:', dashboardPath);
    this.router.navigate([dashboardPath]);

  } catch (e) {
    console.error('❌ Erreur décodage token:', e);
    this.router.navigate(['/login']);
  }
}
}