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
  unreadCount?: number;
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
// MARQUER UNE CONVERSATION COMME LUE
// ─────────────────────────────────────────────────────────────────────────

markConversationAsRead(otherEmail: string): Observable<{ message: string }> {
  return this.http.put<{ message: string }>(
    `${this.apiUrl}/conversation/${otherEmail}/read`,
    {},
    { headers: this.getHeaders() }
  );
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
  // ─────────────────────────────────────────────────────────────────────────
// COMPTER LES MESSAGES NON LUS (UNIQUEMENT LE NOMBRE)
// ─────────────────────────────────────────────────────────────────────────

getUnreadMessagesCount(): Observable<{ unreadCount: number }> {
  return this.http.get<{ unreadCount: number }>(
    `${this.apiUrl}/unread/count`,
    { headers: this.getHeaders() }
  );
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
  // ========================================
// PAIEMENT LOCAL PARTNER (40 DT)
// ========================================

/**
 * 1. Vérifier si l'utilisateur a déjà payé pour contacter ce Local Partner
 */
checkIfAlreadyPaid(localPartnerEmail: string, serviceId: string): Observable<{
  hasPaid: boolean;
  requiresPayment: boolean;
  amount: number;
  currency: string;
}> {
  return this.http.get<{
    hasPaid: boolean;
    requiresPayment: boolean;
    amount: number;
    currency: string;
  }>(`${this.apiUrl}/contact-local-partner/check`, {
    headers: this.getHeaders(),
    params: { localPartnerEmail, serviceId }
  });
}

/**
 * 2. Initier le paiement (SANS message - juste le paiement)
 */
initiatePayment(localPartnerEmail: string, serviceId: string): Observable<{
  paymentId: string;
  paymentUrl: string;
  amount: number;
}> {
  return this.http.post<{
    paymentId: string;
    paymentUrl: string;
    amount: number;
  }>(`${this.apiUrl}/contact-local-partner/initiate-payment`, {
    localPartnerEmail,
    serviceId
  }, { headers: this.getHeaders() });
}

/**
 * 3. Vérifier le statut d'un paiement
 */
getPaymentStatus(paymentId: string): Observable<{
  paymentId: string;
  status: string;
  isCompleted: boolean;
  amount: number;
  createdAt: string;
  paidAt?: string;
}> {
  return this.http.get<{
    paymentId: string;
    status: string;
    isCompleted: boolean;
    amount: number;
    createdAt: string;
    paidAt?: string;
  }>(`${this.apiUrl}/contact-local-partner/payment-status/${paymentId}`, {
    headers: this.getHeaders()
  });
}

/**
 * 4. Confirmer le paiement (callback après paiement Flouci)
 */
confirmPayment(paymentId: string, transactionId?: string): Observable<{
  success: boolean;
  localPartnerEmail: string;
  paymentId: string;
}> {
  let url = `${this.apiUrl}/contact-local-partner/payment-success?paymentId=${paymentId}`;
  if (transactionId) {
    url += `&transaction_id=${transactionId}`;
  }
  return this.http.get<{
    success: boolean;
    localPartnerEmail: string;
    paymentId: string;
  }>(url, { headers: this.getHeaders() });
}
// ========================================
// ABONNEMENT MENSUEL - KONNECT
// ========================================

/**
 * 1. Vérifier l'abonnement actif
 */
checkSubscription(): Observable<{
  hasActiveSubscription: boolean;
  expiresAt?: string;
  daysRemaining?: number;
  requiresPayment?: boolean;
  amount?: number;
  currency?: string;
}> {
  return this.http.get<any>(
    `${this.apiUrl}/subscription/check`,
    { headers: this.getHeaders() }
  );
}

/**
 * 2. Initier le paiement Konnect
 */
initiateSubscription(): Observable<{
  paymentId: string;
  payUrl: string;
  paymentRef: string;
  amount: number;
  description: string;
}> {
  return this.http.post<any>(
    `${this.apiUrl}/subscription/subscribe`,
    {},
    { headers: this.getHeaders() }
  );
}

/**
 * 3. Confirmer le paiement après callback Konnect
 */
confirmSubscriptionPayment(
  paymentId: string,
  paymentRef: string,
  transactionId?: string
): Observable<{
  success: boolean;
  subscriberEmail: string;
  expiresAt: string;
  daysRemaining: number;
  message: string;
}> {
  let url = `${this.apiUrl}/subscription/payment-success?paymentId=${paymentId}&paymentRef=${paymentRef}`;
  if (transactionId) {
    url += `&transaction_id=${transactionId}`;
  }
  return this.http.get<any>(url, { headers: this.getHeaders() });
}

/**
 * 4. Callback si paiement échoué
 */
subscriptionPaymentFailed(paymentId?: string): Observable<any> {
  let url = `${this.apiUrl}/subscription/payment-failed`;
  if (paymentId) {
    url += `?paymentId=${paymentId}`;
  }
  return this.http.get<any>(url, { headers: this.getHeaders() });
}
}