import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MessageAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

export interface Message {
  id: number;
  content: string;
  senderEmail: string;
  recipientEmail: string;
  sentDate: string;
  read: boolean;
  attachments: MessageAttachment[];  // ✅ Ajout des pièces jointes
}

export interface Conversation {
  id: number;
  senderRole: string;
  senderEmail: string;
  recipientEmail: string;
  recipientRole: string;
  lastMessage: string;
  lastMessageDate: string;
  senderViewed: boolean;
  partnerViewed: boolean;
  senderName?: string;
  recipientName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagerieService {

  private apiUrl = 'http://localhost:8089/api/messagerie';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENVOYER UN MESSAGE (SANS PIÈCES JOINTES)
  // ─────────────────────────────────────────────────────────────────────────

  sendMessage(recipientEmail: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/send`, {
      recipientEmail,
      content
    }, { headers: this.getHeaders() });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENVOYER UN MESSAGE AVEC PIÈCES JOINTES (multipart/form-data)
  // ─────────────────────────────────────────────────────────────────────────

  sendMessageWithAttachments(
    recipientEmail: string, 
    content: string | null, 
    files: File[]
  ): Observable<{ message: Message; attachmentCount: number }> {
    
    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail);
    
    if (content && content.trim()) {
      formData.append('content', content);
    }
    
    // Ajouter tous les fichiers
    files.forEach(file => {
      formData.append('attachments', file, file.name);
    });
    
    return this.http.post<{ message: Message; attachmentCount: number }>(
      `${this.apiUrl}/send-with-attachments`, 
      formData, 
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENVOYER UN MESSAGE UNIFIÉ (détecte automatiquement si fichiers ou non)
  // ─────────────────────────────────────────────────────────────────────────

  sendMessageUnified(
    recipientEmail: string, 
    content: string | null, 
    files: File[] = []
  ): Observable<{ message: Message; attachmentCount: number }> {
    
    // Si pas de fichiers, utiliser l'endpoint JSON
    if (files.length === 0) {
      return this.http.post<{ message: Message; attachmentCount: number }>(
        `${this.apiUrl}/send-unified`,
        { recipientEmail, content },
        { headers: this.getHeaders() }
      );
    }
    
    // Sinon, utiliser multipart
    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail);
    
    if (content && content.trim()) {
      formData.append('content', content);
    }
    
    files.forEach(file => {
      formData.append('attachments', file, file.name);
    });
    
    return this.http.post<{ message: Message; attachmentCount: number }>(
      `${this.apiUrl}/send-unified`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RÉPONDRE (universel - même endpoint pour tous les rôles)
  // ─────────────────────────────────────────────────────────────────────────

  replyToMessage(recipientEmail: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/reply`, {
      recipientEmail,
      content
    }, { headers: this.getHeaders() });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONVERSATIONS
  // ─────────────────────────────────────────────────────────────────────────

  getMyConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/my-conversations`,
      { headers: this.getHeaders() }
    );
  }

  getPartnerConversations(): Observable<Conversation[]> {
    return this.getMyConversations();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGES D'UNE CONVERSATION
  // ─────────────────────────────────────────────────────────────────────────

  getConversation(otherEmail: string): Observable<Message[]> {
    return this.http.get<Message[]>(
      `${this.apiUrl}/conversation/${otherEmail}`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RÉCUPÉRER UN MESSAGE SPÉCIFIQUE AVEC SES PIÈCES JOINTES
  // ─────────────────────────────────────────────────────────────────────────

  getMessage(messageId: number): Observable<Message> {
    return this.http.get<Message>(
      `${this.apiUrl}/message/${messageId}`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TÉLÉCHARGER UNE PIÈCE JOINTE
  // ─────────────────────────────────────────────────────────────────────────

  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachment/${attachmentId}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRÉVISUALISER UNE PIÈCE JOINTE (pour les images)
  // ─────────────────────────────────────────────────────────────────────────

  previewAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachment/${attachmentId}/preview`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBTENIR L'URL DE TÉLÉCHARGEMENT (pour utilisation directe dans <img>)
  // ─────────────────────────────────────────────────────────────────────────

  getAttachmentUrl(attachmentId: number): string {
    const token = localStorage.getItem('auth_token') || '';
    return `${this.apiUrl}/attachment/${attachmentId}?token=${token}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VÉRIFIER SI UN MESSAGE A DES PIÈCES JOINTES
  // ─────────────────────────────────────────────────────────────────────────

  hasAttachments(messageId: number): Observable<{ hasAttachments: boolean }> {
    return this.http.get<{ hasAttachments: boolean }>(
      `${this.apiUrl}/message/${messageId}/has-attachments`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUPPRIMER UNE PIÈCE JOINTE
  // ─────────────────────────────────────────────────────────────────────────

  deleteAttachment(attachmentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/attachment/${attachmentId}`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUPPRIMER TOUTES LES PIÈCES JOINTES D'UN MESSAGE
  // ─────────────────────────────────────────────────────────────────────────

  deleteAllAttachments(messageId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/message/${messageId}/attachments`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGES NON LUS
  // ─────────────────────────────────────────────────────────────────────────

  getUnreadMessages(): Observable<{ unreadCount: number; messages: Message[] }> {
    return this.http.get<{ unreadCount: number; messages: Message[] }>(
      `${this.apiUrl}/unread`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VÉRIFIER SI UNE CONVERSATION EXISTE
  // ─────────────────────────────────────────────────────────────────────────

  conversationExists(recipientEmail: string): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(
      `${this.apiUrl}/exists/${recipientEmail}`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECHERCHE
  // ─────────────────────────────────────────────────────────────────────────

  searchLocalPartners(q: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/search-local-partners?q=${q}`,
      { headers: this.getHeaders() }
    );
  }

  searchConversations(q: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/search-conversations?q=${q}`,
      { headers: this.getHeaders() }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTHODES UTILITAIRES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Formater la taille d'un fichier (bytes -> lisible)
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Vérifier si un fichier est une image (pour prévisualisation)
   */
  isImageFile(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  /**
   * Télécharger un fichier avec le nom original
   */
  downloadFile(attachment: MessageAttachment): void {
    this.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement:', err);
      }
    });
  }
}