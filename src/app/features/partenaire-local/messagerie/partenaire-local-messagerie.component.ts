import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { MessagerieService } from '../../../core/services/messagerie.service';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';


interface MessageAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

interface Message {
  id: number;
  content: string;
  senderEmail: string;
  recipientEmail: string;
  sentDate: string;
  read: boolean;
  attachments: MessageAttachment[];
}

interface Conversation {
  id: number;
  senderRole: string;
  senderEmail: string;
  recipientEmail: string;
  recipientRole: string;
  lastMessage: string;
  lastMessageDate: string;
  senderViewed: boolean;
  partnerViewed: boolean;
  _contactName?: string;
  unreadCount?: number;
}

@Component({
  selector: 'app-partenaire-local-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, NotificationBellComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>

      <div class="page-main">

        <!-- Header page -->
        <div class="page-header">
          <div>
            <a routerLink="/partenaire-local/dashboard" class="back-link">← Retour au Dashboard</a>
            <h1>Messagerie</h1>
            <p class="subtitle">Gérez vos conversations avec vos partenaires</p>
          </div>
          <app-notification-bell></app-notification-bell>
        </div>

        <div class="inbox-container">

          <!-- ────────── SIDEBAR ────────── -->
          <div class="sidebar" [class.mobile-hidden]="mobileShowChat">

            <div class="sidebar-header">
              <h2>💬 Conversations</h2>
              
            </div>

            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterConversations()"
                placeholder="Rechercher une conversation..."
                class="search-input"
              />
            </div>

            <div class="conv-list">

              <div class="loading-state" *ngIf="loadingConv">
                <div class="spinner"></div>
              </div>

              <div
                class="conv-item"
                *ngFor="let conv of filteredConversations"
                [class.active]="selectedConv?.id === conv.id"
                [class.unread]="!isViewed(conv)"
                (click)="selectConversation(conv)"
              >
                <div class="conv-avatar" [class.green]="conv.recipientRole === 'LOCAL_PARTNER'">
                  {{ getInitials(conv) }}
                </div>
                <div class="conv-info">
                  <div class="conv-top">
                    <span class="conv-name">{{ getContactName(conv) }}</span>
                    <span class="conv-time">{{ formatTime(conv.lastMessageDate) }}</span>
                  </div>
                  <div class="conv-bottom">
  <span class="conv-preview">{{ conv.lastMessage || 'Démarrer la conversation...' }}</span>
  <div class="conv-badges">
    <span class="unread-dot" *ngIf="!isViewed(conv)">●</span>
    <span class="conv-unread-count" *ngIf="conv.unreadCount && conv.unreadCount > 0">
      {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
    </span>
  </div>
</div>
                  <span class="role-badge">{{ getRoleLabel(conv) }}</span>
                </div>
              </div>

              <div class="empty-conv" *ngIf="filteredConversations.length === 0 && !loadingConv">
                <div class="empty-icon">📭</div>
                <p>Aucune conversation</p>
                <small>Les messages des investisseurs, touristes et partenaires apparaîtront ici</small>
              </div>

            </div>
          </div>

          <!-- ────────── ZONE CHAT ────────── -->
          <div class="chat-zone" [class.mobile-show]="mobileShowChat">

            <!-- Header chat -->
            <div class="chat-header" *ngIf="selectedConv">
              <button class="back-btn" (click)="mobileShowChat = false" title="Retour">←</button>
              <div class="avatar-lg" [class.green]="selectedConv.recipientRole === 'LOCAL_PARTNER'">
                {{ getInitials(selectedConv) }}
              </div>
              <div class="contact-info">
                <h3>{{ getContactName(selectedConv) }}</h3>
                <span class="role-tag">{{ getRoleLabel(selectedConv) }}</span>
              </div>
            </div>

            <!-- Header vide -->
            <div class="chat-header empty-header" *ngIf="!selectedConv">
              <div class="empty-chat-hint">
                <div class="hint-icon">💬</div>
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            </div>

            <!-- Zone messages -->
            <div class="messages-area" #messagesContainer>

              <div class="loading-msgs" *ngIf="loadingMessages">
                <div class="spinner"></div>
                <span>Chargement des messages...</span>
              </div>

              <ng-container *ngIf="!loadingMessages && selectedConv">

                <div class="messages-list" *ngIf="messages.length > 0">
                  <div
                    class="msg-row"
                    *ngFor="let msg of messages"
                    [class.mine]="msg.senderEmail === myEmail">

                    <div class="msg-avatar" *ngIf="msg.senderEmail !== myEmail">
                      {{ getInitials(selectedConv) }}
                    </div>

                    <div class="msg-bubble">

                      <!-- ✅ Badge rôle — alimenté par l'API /user-role/{email} -->
                      <span class="msg-sender-role" *ngIf="msg.senderEmail !== myEmail && getMsgSenderRole(msg)">
                        {{ getMsgSenderRole(msg) }}
                      </span>

                      <p *ngIf="msg.content">{{ msg.content }}</p>

                      <!-- ── Pièces jointes ── -->
                      <div class="attachments-list" *ngIf="msg.attachments && msg.attachments.length > 0">
                        <div
                          class="attachment-item"
                          *ngFor="let att of msg.attachments"
                          [class.is-image]="isImageFile(att.fileType)"
                        >
                          <ng-container *ngIf="isImageFile(att.fileType)">
                            <div class="img-preview-wrapper">
                              <img
                                [src]="getBlobUrl(att.id)"
                                [alt]="att.fileName"
                                class="img-preview"
                                (click)="openImagePreview(att)"
                                loading="lazy"
                              />
                              <div class="img-overlay" (click)="openImagePreview(att)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                </svg>
                              </div>
                            </div>
                            <div class="att-footer">
                              <span class="att-name">{{ att.fileName }}</span>
                              <button class="att-dl-btn" (click)="downloadFile(att)" title="Télécharger">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </button>
                            </div>
                          </ng-container>

                          <ng-container *ngIf="!isImageFile(att.fileType)">
                            <div class="file-att">
                              <div class="file-icon">{{ getFileIcon(att.fileType) }}</div>
                              <div class="file-info">
                                <span class="file-name">{{ att.fileName }}</span>
                                <span class="file-size">{{ formatFileSize(att.fileSize) }}</span>
                              </div>
                              <button class="att-dl-btn" (click)="downloadFile(att)" title="Télécharger">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </button>
                            </div>
                          </ng-container>
                        </div>
                      </div>
                      <!-- ── Fin pièces jointes ── -->

                      <div class="msg-meta">
                        <span class="msg-time">{{ formatMsgTime(msg.sentDate) }}</span>
                        <span class="attach-count" *ngIf="msg.attachments && msg.attachments.length > 0">
                          📎 {{ msg.attachments.length }}
                        </span>
                        <span class="msg-status" *ngIf="msg.senderEmail === myEmail">
                          {{ msg.read ? '✓✓' : '✓' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="no-messages" *ngIf="messages.length === 0">
                  <div class="no-msg-icon">👋</div>
                  <p>Commencez la conversation !</p>
                  <small>Envoyez votre premier message à {{ getContactName(selectedConv) }}</small>
                </div>

              </ng-container>

            </div>

            <!-- ── Zone saisie ── -->
            <div class="input-area" *ngIf="selectedConv">

              <div class="files-preview" *ngIf="selectedFiles.length > 0">
                <div class="files-preview-header">
                  <span>{{ selectedFiles.length }} fichier(s) sélectionné(s)</span>
                  <button class="clear-files-btn" (click)="clearFiles()">✕ Tout supprimer</button>
                </div>
                <div class="files-chips">
                  <div class="file-chip" *ngFor="let f of selectedFiles; let i = index">
                    <span class="chip-icon">{{ getFileIcon(f.type) }}</span>
                    <span class="chip-name">{{ f.name }}</span>
                    <span class="chip-size">({{ formatFileSize(f.size) }})</span>
                    <button class="chip-remove" (click)="removeFile(i)">✕</button>
                  </div>
                </div>
              </div>

              <div class="input-wrapper">
                <button
                  class="attach-btn"
                  (click)="fileInput.click()"
                  title="Joindre un fichier"
                  [class.has-files]="selectedFiles.length > 0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                       viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span class="attach-badge" *ngIf="selectedFiles.length > 0">{{ selectedFiles.length }}</span>
                </button>

                <input
                  #fileInput
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  style="display:none"
                  (change)="onFilesSelected($event)"
                />

                <textarea
                  [(ngModel)]="newMessage"
                  placeholder="Écrire un message... (Entrée pour envoyer)"
                  (keydown.enter)="$event.preventDefault(); sendMessage()"
                  (input)="autoResize($event)"
                  rows="1"
                  class="msg-input"
                ></textarea>

                <button
                  class="send-btn"
                  [disabled]="(!newMessage.trim() && selectedFiles.length === 0) || sending"
                  (click)="sendMessage()"
                  [title]="sending ? 'Envoi en cours...' : 'Envoyer'"
                >
                  <span *ngIf="!sending">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </span>
                  <div class="spinner-sm" *ngIf="sending"></div>
                </button>
              </div>
              <p class="input-hint">Appuyez sur Entrée pour envoyer · Shift+Entrée pour une nouvelle ligne · 📎 pour joindre</p>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal prévisualisation image ── -->
    <div class="img-modal" *ngIf="previewAtt" (click)="closeImagePreview()">
      <div class="img-modal-content" (click)="$event.stopPropagation()">
        <button class="modal-close" (click)="closeImagePreview()">✕</button>
        <img [src]="getBlobUrl(previewAtt.id)" [alt]="previewAtt.fileName" class="modal-img" />
        <div class="modal-footer">
          <span>{{ previewAtt.fileName }}</span>
          <button class="modal-dl-btn" (click)="downloadFile(previewAtt)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #f0fdf4, #f1f5f9);
      font-family: 'Inter', sans-serif;
    }
    app-navbar {
      width: 280px; flex-shrink: 0;
      position: sticky; top: 0; height: 100vh; z-index: 100;
    }
    .page-main {
      flex: 1; padding: 1.5rem 2rem;
      overflow: hidden; display: flex; flex-direction: column;
      gap: 1rem;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-shrink: 0;
    }
    .back-link {
      display: inline-block; color: #059669; font-size: 0.85rem;
      font-weight: 500; text-decoration: none; margin-bottom: 0.4rem;
    }
    .back-link:hover { color: #047857; }
    h1 {
      font-size: 1.75rem; font-weight: 700; color: #0f172a;
      margin: 0 0 0.2rem;
    }
    h1::after {
      content: ''; display: block; width: 50px; height: 3px;
      background: linear-gradient(90deg, #059669, #10b981);
      margin-top: 0.3rem; border-radius: 2px;
    }
    .subtitle { color: #64748b; margin: 0; font-size: 0.9rem; }
    .inbox-container {
      display: flex; flex: 1; min-height: 0;
      background: white; border-radius: 20px; overflow: hidden;
      box-shadow: 0 4px 30px rgba(0,0,0,0.08);
      border: 1px solid #d1fae5;
    }
    .sidebar {
      width: 320px; flex-shrink: 0;
      border-right: 1px solid #f0fdf4;
      display: flex; flex-direction: column;
      background: #fafffe;
    }
    .sidebar-header {
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid #f0fdf4;
      display: flex; align-items: center; gap: 0.75rem;
    }
    .sidebar-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .badge-count {
      background: #ef4444; color: white; border-radius: 50%;
      width: 20px; height: 20px; font-size: 0.7rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .search-wrapper {
      padding: 0.75rem 1rem; position: relative;
      border-bottom: 1px solid #f0fdf4;
    }
    .search-input {
      width: 100%; padding: 0.55rem 0.75rem 0.55rem 2.1rem;
      border: 1px solid #d1fae5; border-radius: 10px;
      font-size: 0.85rem; outline: none; background: white;
      box-sizing: border-box; transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
    .search-icon {
      position: absolute; left: 1.65rem; top: 50%;
      transform: translateY(-50%); color: #94a3b8; pointer-events: none;
    }
    .conv-list { flex: 1; overflow-y: auto; }
    .conv-item {
      display: flex; padding: 0.85rem 1.25rem; gap: 0.75rem;
      cursor: pointer; transition: all 0.15s;
      border-bottom: 1px solid #f8fafc; position: relative;
    }
    .conv-item:hover { background: #f0fdf4; }
    .conv-item.active { background: #ecfdf5; border-left: 3px solid #10b981; }
    .conv-item.unread { background: #fffbeb; }
    .conv-item.unread .conv-name { font-weight: 700; }
    .conv-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.9rem;
    }
    .conv-avatar.green { background: linear-gradient(135deg, #059669, #10b981); }
    .conv-info { flex: 1; min-width: 0; }
    .conv-top {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 0.2rem;
    }
    .conv-name {
      font-weight: 600; font-size: 0.9rem; color: #0f172a;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;
    }
    .conv-time { font-size: 0.7rem; color: #94a3b8; flex-shrink: 0; }
    .conv-bottom {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 0.2rem;
    }
    .conv-preview {
      font-size: 0.8rem; color: #64748b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
    }
    .unread-dot { color: #10b981; font-size: 0.85rem; flex-shrink: 0; }
    .role-badge {
      font-size: 0.68rem; font-weight: 600; color: #059669;
      background: #d1fae5; padding: 0.1rem 0.5rem; border-radius: 20px;
      display: inline-block;
    }
    .empty-conv { text-align: center; padding: 3rem 1.5rem; color: #94a3b8; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-conv p { font-size: 0.95rem; font-weight: 500; margin: 0 0 0.5rem; color: #64748b; }
    .empty-conv small { font-size: 0.8rem; }
    .loading-state { display: flex; justify-content: center; padding: 2rem; }
    .chat-zone {
      flex: 1; display: flex; flex-direction: column;
      background: #f8fafc; min-width: 0;
    }
    .chat-header {
      padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0;
      background: white; display: flex; align-items: center; gap: 0.75rem;
      flex-shrink: 0; min-height: 70px;
    }
    .empty-header { justify-content: center; }
    .empty-chat-hint { text-align: center; color: #94a3b8; }
    .hint-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .empty-chat-hint p { margin: 0; font-size: 0.9rem; }
    .back-btn {
      display: none; background: none; border: none;
      font-size: 1.3rem; cursor: pointer; color: #059669;
      padding: 0.25rem 0.5rem; border-radius: 8px;
      transition: background 0.2s;
    }
    .back-btn:hover { background: #f0fdf4; }
    .avatar-lg {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.9rem;
    }
    .avatar-lg.green { background: linear-gradient(135deg, #059669, #10b981); }
    .contact-info h3 { margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
    .role-tag {
      font-size: 0.75rem; color: #059669; background: #d1fae5;
      padding: 0.15rem 0.6rem; border-radius: 20px; font-weight: 500;
    }
    .messages-area {
      flex: 1; overflow-y: auto; padding: 1.5rem;
      display: flex; flex-direction: column;
      background: linear-gradient(180deg, #f8fafc 0%, #f0fdf4 100%);
    }
    .loading-msgs {
      display: flex; align-items: center; justify-content: center;
      gap: 0.75rem; color: #64748b; font-size: 0.9rem; margin: auto;
    }
    .messages-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .msg-row { display: flex; align-items: flex-end; gap: 0.5rem; }
    .msg-row.mine { flex-direction: row-reverse; }
    .msg-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700;
    }
    .msg-bubble {
      max-width: 60%; padding: 0.65rem 1rem;
      border-radius: 18px; background: white;
      box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      border: 1px solid #f1f5f9;
    }
    .mine .msg-bubble {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white; border-color: transparent;
      border-radius: 18px 18px 4px 18px;
    }
    .msg-row:not(.mine) .msg-bubble { border-radius: 18px 18px 18px 4px; }
    .msg-bubble p { margin: 0 0 0.25rem; font-size: 0.88rem; line-height: 1.5; word-wrap: break-word; }
    .msg-meta { display: flex; justify-content: flex-end; align-items: center; gap: 0.3rem; margin-top: 0.3rem; }
    .msg-time { font-size: 0.65rem; opacity: 0.65; }
    .msg-status { font-size: 0.65rem; opacity: 0.8; }
    .attach-count { font-size: 0.65rem; opacity: 0.75; }

    /* ✅ Badge rôle expéditeur */
    .msg-sender-role {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      color: #059669;
      background: #d1fae5;
      padding: 0.1rem 0.5rem;
      border-radius: 20px;
      margin-bottom: 0.35rem;
      width: fit-content;
    }

    .no-messages { text-align: center; margin: auto; color: #94a3b8; padding: 2rem; }
    .no-msg-icon { font-size: 3rem; margin-bottom: 0.75rem; }
    .no-messages p { font-size: 0.95rem; font-weight: 500; color: #64748b; margin: 0 0 0.4rem; }
    .no-messages small { font-size: 0.8rem; }
    .attachments-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }
    .img-preview-wrapper {
      position: relative; border-radius: 10px; overflow: hidden;
      cursor: pointer; max-width: 220px;
    }
    .img-preview { width: 100%; display: block; border-radius: 10px; transition: filter 0.2s; }
    .img-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s; color: white;
    }
    .img-preview-wrapper:hover .img-overlay { opacity: 1; }
    .img-preview-wrapper:hover .img-preview { filter: brightness(0.85); }
    .att-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 0.25rem; padding: 0 0.1rem;
    }
    .att-name {
      font-size: 0.72rem; opacity: 0.8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
    }
    .file-att {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.5rem 0.65rem; background: rgba(255,255,255,0.15);
      border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); min-width: 180px;
    }
    .mine .file-att { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.3); }
    .file-icon { font-size: 1.4rem; flex-shrink: 0; }
    .file-info { flex: 1; min-width: 0; }
    .file-name {
      display: block; font-size: 0.78rem; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
    }
    .file-size { font-size: 0.68rem; opacity: 0.7; }
    .att-dl-btn {
      background: rgba(255,255,255,0.2); border: none; border-radius: 6px;
      cursor: pointer; padding: 0.3rem; display: flex; align-items: center;
      transition: background 0.2s; color: inherit; flex-shrink: 0;
    }
    .att-dl-btn:hover { background: rgba(255,255,255,0.35); }
    .input-area {
      padding: 0.75rem 1.5rem 0.75rem;
      background: white; border-top: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .files-preview {
      margin-bottom: 0.6rem; background: #f0fdf4;
      border: 1px solid #d1fae5; border-radius: 12px; padding: 0.6rem 0.8rem;
    }
    .files-preview-header {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: #059669; font-weight: 600; margin-bottom: 0.4rem;
    }
    .clear-files-btn {
      background: none; border: none; color: #ef4444; cursor: pointer;
      font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.4rem;
      border-radius: 4px; transition: background 0.15s;
    }
    .clear-files-btn:hover { background: #fee2e2; }
    .files-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .file-chip {
      display: flex; align-items: center; gap: 0.3rem;
      background: white; border: 1px solid #d1fae5;
      border-radius: 20px; padding: 0.2rem 0.6rem;
      font-size: 0.75rem; color: #374151;
    }
    .chip-icon { font-size: 0.9rem; }
    .chip-name { font-weight: 500; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chip-size { color: #94a3b8; }
    .chip-remove {
      background: none; border: none; cursor: pointer; color: #94a3b8;
      font-size: 0.8rem; padding: 0; line-height: 1; transition: color 0.15s;
    }
    .chip-remove:hover { color: #ef4444; }
    .input-wrapper { display: flex; gap: 0.6rem; align-items: flex-end; }
    .attach-btn {
      width: 44px; height: 44px; flex-shrink: 0;
      background: #f1f5f9; border: 1.5px solid #e2e8f0;
      border-radius: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #64748b; transition: all 0.2s; position: relative;
    }
    .attach-btn:hover { background: #d1fae5; border-color: #10b981; color: #059669; }
    .attach-btn.has-files { background: #d1fae5; border-color: #10b981; color: #059669; }
    .attach-badge {
      position: absolute; top: -5px; right: -5px;
      background: #059669; color: white;
      border-radius: 50%; width: 18px; height: 18px;
      font-size: 0.65rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
    }
    .msg-input {
      flex: 1; padding: 0.75rem 1rem;
      border: 1.5px solid #d1fae5; border-radius: 14px;
      resize: none; font-family: inherit; font-size: 0.9rem;
      max-height: 120px; outline: none; line-height: 1.4;
      transition: border-color 0.2s, box-shadow 0.2s; background: #fafffe;
    }
    .msg-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
    .send-btn {
      width: 44px; height: 44px; flex-shrink: 0;
      background: linear-gradient(135deg, #059669, #10b981);
      color: white; border: none; border-radius: 12px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(5,150,105,0.4); }
    .send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    .input-hint { margin: 0.4rem 0 0; font-size: 0.72rem; color: #94a3b8; }
    .img-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .img-modal-content {
      position: relative; background: #1e293b; border-radius: 16px; overflow: hidden;
      max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 25px 80px rgba(0,0,0,0.6);
    }
    .modal-close {
      position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
      background: rgba(0,0,0,0.5); color: white; border: none;
      border-radius: 50%; width: 32px; height: 32px;
      cursor: pointer; font-size: 0.9rem; display: flex;
      align-items: center; justify-content: center; transition: background 0.2s;
    }
    .modal-close:hover { background: rgba(0,0,0,0.8); }
    .modal-img { max-width: 85vw; max-height: 78vh; object-fit: contain; display: block; }
    .modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: #0f172a; color: #94a3b8; font-size: 0.82rem;
    }
    .modal-dl-btn {
      display: flex; align-items: center; gap: 0.4rem;
      background: #059669; color: white; border: none;
      border-radius: 8px; padding: 0.4rem 0.9rem;
      cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: background 0.2s;
    }
    .modal-dl-btn:hover { background: #047857; }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid #d1fae5; border-top-color: #10b981;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .conv-badges {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.conv-unread-count {
  background: #ef4444;
  color: white;
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}
    .spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: white;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) {
      app-navbar { width: 100%; height: auto; position: relative; }
      .page-layout { flex-direction: column; }
      .page-main { padding: 0; gap: 0; }
      .page-header { padding: 1rem; }
      .inbox-container { border-radius: 0; flex: 1; }
      .sidebar { width: 100%; }
      .sidebar.mobile-hidden { display: none; }
      .chat-zone { display: none; }
      .chat-zone.mobile-show { display: flex; }
      .back-btn { display: flex; }
      .msg-bubble { max-width: 80%; }
    }
  `]
})
export class PartenaireLocalMessagerieComponent implements OnInit, OnDestroy, AfterViewChecked {

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConv: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  searchQuery = '';
  myEmail = '';
  sending = false;
  loadingConv = false;
  loadingMessages = false;
  mobileShowChat = false;
  unreadCount = 0;
  private shouldScroll = false;

  // ── Pièces jointes ──
  selectedFiles: File[] = [];
  previewAtt: MessageAttachment | null = null;
  private blobUrlCache = new Map<number, string>();

  // ✅ Cache des rôles par email — alimenté par /user-role/{email}
  private roleCache = new Map<string, string>();

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private messagerieService = inject(MessagerieService);
  private refreshSub?: Subscription;

  private readonly API = 'http://localhost:8089/api/messagerie';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    const token = localStorage.getItem('auth_token') || '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.myEmail = payload.email || payload.sub || payload.preferred_username || '';
      } catch { this.myEmail = ''; }
    }

    this.loadConversations();

    this.route.queryParams.subscribe(params => {
      if (params['contact']) {
        setTimeout(() => {
          this.openOrCreate(params['contact'], params['name']);
        }, 800);
      }
    });

    this.refreshSub = interval(10000).subscribe(() => {
      this.loadConversations(false);
      if (this.selectedConv) {
        this.reloadMessages();
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.blobUrlCache.forEach(url => window.URL.revokeObjectURL(url));
    this.blobUrlCache.clear();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ────────── Chargement conversations ──────────

  private loadRolesForConversations(conversations: Conversation[]): void {
  conversations.forEach(conv => {
    const otherEmail = this.getOtherEmail(conv);
    if (otherEmail && !this.roleCache.has(otherEmail)) {
      this.http.get<{ email: string; role: string }>(
        `${this.API}/user-role/${otherEmail}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (data) => this.roleCache.set(data.email, data.role),
        error: () => {}
      });
    }
  });
}
loadConversations(showLoader = true): void {
  if (showLoader) this.loadingConv = true;

  this.http.get<Conversation[]>(`${this.API}/my-conversations`, {
    headers: this.getHeaders()
  }).subscribe({
    next: (data) => {
      this.conversations = data;
      
      // Pour chaque conversation, compter les messages non lus
      let completedRequests = 0;
      const totalRequests = data.length;
      
      if (totalRequests === 0) {
        this.filterConversations();
        this.unreadCount = 0;
        this.loadingConv = false;
        this.loadRolesForConversations(data);
        return;
      }
      
      data.forEach(conv => {
        const otherEmail = this.getOtherEmail(conv);
        
        this.http.get<Message[]>(`${this.API}/conversation/${otherEmail}`, {
          headers: this.getHeaders()
        }).subscribe({
          next: (messages) => {
            // Compter les messages non lus envoyés par l'autre personne
            const unreadMessages = messages.filter(m => 
              m.senderEmail === otherEmail && !m.read
            );
            conv.unreadCount = unreadMessages.length;
            console.log(`📊 Conversation avec ${otherEmail}: ${conv.unreadCount} messages non lus`); // Debug
            
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.unreadCount = this.conversations.filter(c => !this.isViewed(c)).length;
              this.loadingConv = false;
              this.loadRolesForConversations(data);
            }
          },
          error: (err) => {
            console.error(`Erreur chargement messages pour ${otherEmail}:`, err);
            conv.unreadCount = 0;
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.unreadCount = this.conversations.filter(c => !this.isViewed(c)).length;
              this.loadingConv = false;
              this.loadRolesForConversations(data);
            }
          }
        });
      });
    },
    error: (err) => { 
      console.error('Erreur chargement conversations:', err);
      this.loadingConv = false; 
    }
  });
}
  filterConversations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = this.conversations;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredConversations = this.conversations.filter(c =>
      this.getContactName(c).toLowerCase().includes(q) ||
      (c.lastMessage?.toLowerCase().includes(q) ?? false)
    );
  }

  // ────────── Sélectionner une conversation ──────────

selectConversation(conv: Conversation): void {
  this.selectedConv = conv;
  this.mobileShowChat = true;
  this.loadMessages(conv);
  
  // ✅ Marquer les messages comme lus quand on ouvre la conversation
  const otherEmail = this.getOtherEmail(conv);
  this.messagerieService.markConversationAsRead(otherEmail).subscribe({
    next: () => {
      conv.unreadCount = 0;
      // Recharger les conversations pour mettre à jour l'affichage
      setTimeout(() => this.loadConversations(false), 500);
    },
    error: (err) => console.error('Erreur marquage lecture:', err)
  });
}

  loadMessages(conv: Conversation): void {
    this.loadingMessages = true;
    this.messages = [];

    const otherEmail = this.getOtherEmail(conv);

    this.http.get<Message[]>(`${this.API}/conversation/${otherEmail}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.messages = [...data].sort((a, b) =>
          new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime()
        );
        this.messages = this.messages.map(m => ({ ...m, attachments: m.attachments || [] }));
        this.loadingMessages = false;
        this.shouldScroll = true;
        // ✅ Charger les rôles depuis l'API pour tous les expéditeurs
        this.loadRolesForMessages(this.messages);
      },
      error: () => {
        this.messages = [];
        this.loadingMessages = false;
      }
    });
  }

  reloadMessages(): void {
    if (!this.selectedConv) return;
    const otherEmail = this.getOtherEmail(this.selectedConv);

    this.http.get<Message[]>(`${this.API}/conversation/${otherEmail}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        const sorted = [...data]
          .sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime())
          .map(m => ({ ...m, attachments: m.attachments || [] }));

        if (sorted.length > this.messages.length) {
          this.messages = sorted;
          this.shouldScroll = true;
          this.loadRolesForMessages(this.messages);
        }
      },
      error: () => {}
    });
  }

  // ✅ Charge les rôles depuis /user-role/{email} pour chaque expéditeur reçu
  private loadRolesForMessages(messages: Message[]): void {
    const emails = [...new Set(
      messages
        .filter(m => m.senderEmail !== this.myEmail)
        .map(m => m.senderEmail)
    )];

    emails.forEach(email => {
      if (this.roleCache.has(email)) return;
      this.http.get<{ email: string; role: string }>(
        `${this.API}/user-role/${email}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (data) => this.roleCache.set(email, data.role),
        error: () => this.roleCache.set(email, '')
      });
    });
  }

  // ✅ Retourne le rôle depuis le cache (alimenté par l'API)
  getMsgSenderRole(msg: Message): string {
    const role = this.roleCache.get(msg.senderEmail) || '';
    const labels: Record<string, string> = {
      'LOCAL_PARTNER': 'Partenaire Local',
      'INVESTOR': 'Investisseur',
      'PARTNER': 'Partenaire Économique',
      'TOURIST': 'Touriste',
      'ADMIN': 'Administrateur',
      'INTERNATIONAL_COMPANY': 'Société Internationale'
    };
    return labels[role] || '';
  }

  // ────────── Ouvrir ou créer une conversation ──────────

  openOrCreate(contactEmail: string, contactName?: string): void {
    const existing = this.conversations.find(c =>
      c.senderEmail === contactEmail || c.recipientEmail === contactEmail
    );
    if (existing) {
      this.selectConversation(existing);
    } else {
      const fakeConv: Conversation = {
        id: -1,
        senderRole: 'LOCAL_PARTNER',
        senderEmail: this.myEmail,
        recipientEmail: contactEmail,
        recipientRole: '',
        lastMessage: '',
        lastMessageDate: new Date().toISOString(),
        senderViewed: true,
        partnerViewed: false,
        _contactName: contactName || contactEmail
      };
      this.selectedConv = fakeConv;
      this.messages = [];
      this.mobileShowChat = true;
    }
  }

  // ────────── Gestion des fichiers ──────────

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const newFiles = Array.from(input.files);
    this.selectedFiles = [...this.selectedFiles, ...newFiles];
    input.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles(): void {
    this.selectedFiles = [];
  }

  // ────────── Envoyer un message ──────────

  sendMessage(): void {
    const hasText = this.newMessage.trim().length > 0;
    const hasFiles = this.selectedFiles.length > 0;

    if ((!hasText && !hasFiles) || !this.selectedConv || this.sending) return;

    const otherEmail = this.getOtherEmail(this.selectedConv);
    const content = this.newMessage.trim();
    this.sending = true;
    this.newMessage = '';

    if (!hasFiles) {
      this.http.post<Message>(`${this.API}/send`,
        { recipientEmail: otherEmail, content },
        { headers: this.getHeaders() }
      ).subscribe({
        next: (msg) => {
          this.messages.push({ ...msg, attachments: msg.attachments || [] });
          this.sending = false;
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(false), 400);
        },
        error: () => {
          this.sending = false;
          this.newMessage = content;
          alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
      });
      return;
    }

    const formData = new FormData();
    formData.append('recipientEmail', otherEmail);
    const finalContent = content || `📎 ${this.selectedFiles.length} pièce(s) jointe(s)`;
    formData.append('content', finalContent);
    this.selectedFiles.forEach(file => formData.append('attachments', file, file.name));

    const token = localStorage.getItem('auth_token') || '';
    const filesToSend = [...this.selectedFiles];

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${this.API}/send-with-attachments`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: { message: Message; attachmentCount: number } = JSON.parse(xhr.responseText);
          const msg = { ...data.message, attachments: data.message.attachments || [] };
          this.messages.push(msg);
          this.selectedFiles = [];
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(false), 400);
        } catch (e) {
          console.error('Erreur parsing réponse:', e);
        }
      } else {
        this.newMessage = content;
        this.selectedFiles = filesToSend;
        alert(`Erreur serveur ${xhr.status} : ${xhr.responseText || 'Vérifiez le backend'}`);
      }
      this.sending = false;
    };

    xhr.onerror = () => {
      this.sending = false;
      this.newMessage = content;
      this.selectedFiles = filesToSend;
      alert('Erreur réseau. Vérifiez que le serveur est accessible et que CORS est configuré.');
    };

    xhr.send(formData);
  }

  // ────────── Prévisualisation image ──────────

  openImagePreview(att: MessageAttachment): void { this.previewAtt = att; }
  closeImagePreview(): void { this.previewAtt = null; }

  // ────────── Téléchargement ──────────

  downloadFile(att: MessageAttachment): void {
    this.http.get(`${this.API}/attachment/${att.id}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Erreur lors du téléchargement.')
    });
  }

  getBlobUrl(attachmentId: number): string {
    if (this.blobUrlCache.has(attachmentId)) {
      return this.blobUrlCache.get(attachmentId)!;
    }
    this.blobUrlCache.set(attachmentId, '');
    this.http.get(`${this.API}/attachment/${attachmentId}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        this.blobUrlCache.set(attachmentId, url);
      },
      error: () => { this.blobUrlCache.delete(attachmentId); }
    });
    return '';
  }

  // ────────── Auto-resize textarea ──────────

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // ────────── Helpers ──────────

  getOtherEmail(conv: Conversation): string {
    return conv.senderEmail === this.myEmail ? conv.recipientEmail : conv.senderEmail;
  }

  getContactName(conv: Conversation): string {
    if (conv._contactName) return conv._contactName;
    const email = this.getOtherEmail(conv);
    return email?.includes('@') ? email.split('@')[0] : (email || 'Contact');
  }

  getInitials(conv: Conversation): string {
    const name = this.getContactName(conv);
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

 getRoleLabel(conv: Conversation): string {
  let role = conv.senderEmail === this.myEmail ? conv.recipientRole : conv.senderRole;

  // ✅ Si UNKNOWN ou vide → chercher dans le roleCache
  if (!role || role === 'UNKNOWN') {
    const otherEmail = this.getOtherEmail(conv);
    role = this.roleCache.get(otherEmail) || '';
  }

  const labels: Record<string, string> = {
  'LOCAL_PARTNER': 'Local Partner',
  'INVESTOR': 'Investor',
  'PARTNER': 'Economic Partner',
  'TOURIST': 'Tourist',
  'ADMIN': 'Administrator',
  'INTERNATIONAL_COMPANY': 'International Company'
};

  return labels[role] || ''; 
}

  isViewed(conv: Conversation): boolean {
    return conv.senderEmail === this.myEmail ? conv.senderViewed : conv.partnerViewed;
  }

  isImageFile(fileType: string): boolean {
    return fileType?.startsWith('image/') ?? false;
  }

  getFileIcon(fileType: string): string {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📕';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '🗜️';
    if (fileType.startsWith('text/')) return '📃';
    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'maintenant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    if (diffMins < 10080) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatMsgTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}