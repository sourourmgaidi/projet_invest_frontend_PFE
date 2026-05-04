import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  selector: 'app-societe-international-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, NotificationBellComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>
      <div class="page-main">

        <!-- Header -->
        <div class="page-header">
          <div>
            <a routerLink="/societe-international/dashboard" class="back-link">← Back to Dashboard</a>
            <h1>Messages</h1>
            <p class="subtitle">Your conversations with local partners</p>
          </div>
          <app-notification-bell></app-notification-bell>
        </div>

        <div class="inbox-container">

          <!-- ── Sidebar ── -->
          <div class="sidebar" [class.mobile-hidden]="mobileShowChat">
            <div class="sidebar-header">
              <h2>💬 Conversations</h2>
              <span class="badge-count" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
            </div>
            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="filterConversations()"
                     placeholder="Search conversations..." class="search-input" />
            </div>
            <div class="conv-list">
              <div class="loading-state" *ngIf="loadingConv">
                <div class="spinner"></div>
              </div>
              <div class="conv-item"
                   *ngFor="let conv of filteredConversations"
                   [class.active]="selectedConv?.id === conv.id"
                   [class.unread]="!isViewed(conv)"
                   (click)="selectConversation(conv)">
                <div class="conv-avatar">{{ getInitials(conv) }}</div>
                <div class="conv-info">
                  <div class="conv-top">
                    <span class="conv-name">{{ getContactName(conv) }}</span>
                    <span class="conv-time">{{ formatTime(conv.lastMessageDate) }}</span>
                  </div>
                  <div class="conv-bottom">
  <span class="conv-preview">{{ conv.lastMessage || 'Start conversation...' }}</span>
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
                <p>No conversations yet</p>
                <small>Contact a local partner from the Services page</small>
              </div>
            </div>
          </div>

          <!-- ── Chat Zone ── -->
          <div class="chat-zone" [class.mobile-show]="mobileShowChat">

            <div class="chat-header" *ngIf="selectedConv">
              <button class="back-btn" (click)="mobileShowChat = false">←</button>
              <div class="conv-avatar-lg">{{ getInitials(selectedConv) }}</div>
              <div class="contact-info">
                <h3>{{ getContactName(selectedConv) }}</h3>
                <span class="role-tag">{{ getRoleLabel(selectedConv) }}</span>
              </div>
            </div>

            <div class="chat-header empty-header" *ngIf="!selectedConv">
              <div class="empty-chat-hint">
                <div>💬</div>
                <p>Select a conversation to start</p>
              </div>
            </div>

            <div class="messages-area" #messagesContainer>
              <div class="loading-msgs" *ngIf="loadingMessages">
                <div class="spinner"></div>
                <span>Loading messages...</span>
              </div>
              <ng-container *ngIf="!loadingMessages && selectedConv">
                <div class="messages-list" *ngIf="messages.length > 0">
                  <div class="msg-row" *ngFor="let msg of messages"
                       [class.mine]="msg.senderEmail === myEmail">
                    <div class="msg-avatar" *ngIf="msg.senderEmail !== myEmail">
                      {{ getInitials(selectedConv) }}
                    </div>
                    <div class="msg-bubble">
                      <p *ngIf="msg.content && !isAutoAttachLabel(msg.content)">{{ msg.content }}</p>

                      <!-- Pièces jointes -->
                      <div class="attachments-list" *ngIf="msg.attachments && msg.attachments.length > 0">
                        <div class="attachment-item" *ngFor="let att of msg.attachments">

                          <!-- Image -->
                          <ng-container *ngIf="isImageFile(att.fileType)">
                            <div class="img-preview-wrapper" (click)="openImagePreview(att)">
                              <img [src]="getBlobUrl(att.id)" [alt]="att.fileName"
                                   class="img-preview" loading="lazy" />
                              <div class="img-zoom-hint">🔍</div>
                            </div>
                            <div class="att-footer">
                              <span class="att-name">{{ att.fileName }}</span>
                              <button class="att-dl-btn" (click)="downloadFile(att)" title="Download">⬇</button>
                            </div>
                          </ng-container>

                          <!-- Fichier non-image -->
                          <ng-container *ngIf="!isImageFile(att.fileType)">
                            <div class="file-att">
                              <span class="file-icon">{{ getFileIcon(att.fileType) }}</span>
                              <div class="file-info">
                                <span class="file-name">{{ att.fileName }}</span>
                                <span class="file-size">{{ formatFileSize(att.fileSize) }}</span>
                              </div>
                              <button class="att-dl-btn" (click)="downloadFile(att)" title="Download">⬇</button>
                            </div>
                          </ng-container>

                        </div>
                      </div>

                      <div class="msg-meta">
                        <span class="msg-time">{{ formatMsgTime(msg.sentDate) }}</span>
                        <span class="attach-indicator" *ngIf="msg.attachments && msg.attachments.length > 0">
                          📎{{ msg.attachments.length }}
                        </span>
                        <span class="msg-status" *ngIf="msg.senderEmail === myEmail">
                          {{ msg.read ? '✓✓' : '✓' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="no-messages" *ngIf="messages.length === 0">
                  <div>👋</div>
                  <p>Start the conversation!</p>
                  <small>Send your first message to {{ getContactName(selectedConv) }}</small>
                </div>
              </ng-container>
            </div>

            <!-- ── Input Area ── -->
            <div class="input-area" *ngIf="selectedConv">

              <!-- Aperçu fichiers sélectionnés -->
              <div class="files-preview" *ngIf="selectedFiles.length > 0">
                <div class="files-preview-header">
                  <span>{{ selectedFiles.length }} file(s) selected</span>
                  <button class="clear-files-btn" (click)="clearFiles()">✕ Clear all</button>
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
                <!-- Bouton pièce jointe -->
                <button class="attach-btn" (click)="fileInput.click()"
                        [class.has-files]="selectedFiles.length > 0" title="Attach file">
                  📎
                  <span class="attach-badge" *ngIf="selectedFiles.length > 0">{{ selectedFiles.length }}</span>
                </button>

                <input #fileInput type="file" multiple
                       accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                       style="display:none"
                       (change)="onFilesSelected($event)" />

                <textarea [(ngModel)]="newMessage"
                          placeholder="Write a message... (Enter to send)"
                          (keydown.enter)="$event.preventDefault(); sendMessage()"
                          (input)="autoResize($event)"
                          rows="1" class="msg-input"></textarea>

                <button class="send-btn"
                        [disabled]="(!newMessage.trim() && selectedFiles.length === 0) || sending"
                        (click)="sendMessage()">
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
              <p class="input-hint">Press Enter to send · Shift+Enter for new line</p>
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
          <button class="modal-dl-btn" (click)="downloadFile(previewAtt)">⬇ Download</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== LAYOUT PRINCIPAL ===== */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f2f2f2;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* La navbar prend toute la largeur en haut */
app-navbar {
  width: 100%;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.page-main {
  flex: 1;
  padding: 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  height: calc(100vh - 70px);
}

/* ===== PAGE HEADER ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.back-link {
  display: inline-block;
  color: #2f4f7f;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 0.35rem;
  transition: opacity 0.2s;
}

.back-link:hover { opacity: 0.7; }

h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a40;
  margin: 0 0 0.2rem;
}

h1::after {
  content: '';
  display: block;
  width: 44px;
  height: 3px;
  background: #ffd700;
  margin-top: 0.3rem;
  border-radius: 2px;
}

.subtitle {
  color: #6b7a91;
  margin: 0;
  font-size: 0.88rem;
}

/* ===== INBOX CONTAINER ===== */
.inbox-container {
  display: flex;
  flex: 1;
  min-height: 0;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 16px rgba(47, 79, 127, 0.1);
  border: 1px solid #d8dde6;
}

/* ===== SIDEBAR ===== */
.sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #d8dde6;
  display: flex;
  flex-direction: column;
  background: #fafbff;
}

.sidebar-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #d8dde6;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f2f2f2;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #2f4f7f;
}

.badge-count {
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-wrapper {
  padding: 0.65rem 0.9rem;
  position: relative;
  border-bottom: 1px solid #d8dde6;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  font-size: 0.82rem;
  outline: none;
  background: white;
  box-sizing: border-box;
  color: #1a2a40;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #2f4f7f;
  box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.1);
}

.search-icon {
  position: absolute;
  left: 1.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9aa5b4;
  pointer-events: none;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
}

/* ===== ITEMS CONVERSATION ===== */
.conv-item {
  display: flex;
  padding: 0.8rem 1rem;
  gap: 0.65rem;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 1px solid #f2f2f2;
  border-left: 3px solid transparent;
}

.conv-item:hover { background: #eef2f8; }

.conv-item.active {
  background: #eef2f8;
  border-left-color: #2f4f7f;
}

.conv-item.unread {
  background: #fffdf0;
  border-left-color: #ffd700;
}

.conv-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #2f4f7f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.82rem;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.18rem;
}

.conv-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1a2a40;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 145px;
}

.conv-time {
  font-size: 0.68rem;
  color: #9aa5b4;
  flex-shrink: 0;
}

.conv-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.15rem;
}

.conv-preview {
  font-size: 0.76rem;
  color: #6b7a91;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 175px;
}

.conv-badges {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.unread-dot {
  color: #ffd700;
  font-size: 0.9rem;
  line-height: 1;
}

.conv-unread-count {
  background: #e74c3c;
  color: white;
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
  font-size: 0.62rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.role-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: #2f4f7f;
  background: #e8eef7;
  padding: 0.1rem 0.5rem;
  border-radius: 20px;
  display: inline-block;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.empty-conv {
  text-align: center;
  padding: 2.5rem 1.5rem;
  color: #9aa5b4;
}

.empty-icon { font-size: 2.2rem; margin-bottom: 0.6rem; }

.empty-conv p {
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0 0 0.4rem;
  color: #6b7a91;
}

.empty-conv small { font-size: 0.78rem; }

/* ===== CHAT ZONE ===== */
.chat-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f7f9fc;
  min-width: 0;
}

.chat-header {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #d8dde6;
  background: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  min-height: 64px;
}

.empty-header { justify-content: center; }

.empty-chat-hint {
  text-align: center;
  color: #9aa5b4;
  font-size: 0.88rem;
}

.back-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #2f4f7f;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.back-btn:hover { background: #eef2f8; }

.conv-avatar-lg {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2f4f7f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.contact-info h3 {
  margin: 0 0 2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a2a40;
}

.role-tag {
  font-size: 0.72rem;
  color: #2f4f7f;
  background: #e8eef7;
  padding: 0.15rem 0.6rem;
  border-radius: 20px;
  font-weight: 500;
}

/* ===== MESSAGES ===== */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
}

.loading-msgs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  color: #6b7a91;
  font-size: 0.88rem;
  margin: auto;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}

.msg-row.mine { flex-direction: row-reverse; }

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #2f4f7f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 700;
}

.msg-bubble {
  max-width: 60%;
  padding: 0.6rem 0.9rem;
  border-radius: 16px;
  background: white;
  border: 1px solid #d8dde6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  color: #1a2a40;
}

.mine .msg-bubble {
  background: #2f4f7f;
  color: white;
  border-color: transparent;
  border-radius: 16px 16px 4px 16px;
}

.msg-row:not(.mine) .msg-bubble {
  border-radius: 16px 16px 16px 4px;
}

.msg-bubble p {
  margin: 0 0 0.2rem;
  font-size: 0.85rem;
  line-height: 1.5;
  word-wrap: break-word;
}

.msg-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.3rem;
}

.msg-time {
  font-size: 0.62rem;
  opacity: 0.62;
}

.msg-status { font-size: 0.62rem; opacity: 0.8; }
.attach-indicator { font-size: 0.62rem; opacity: 0.75; }

.no-messages {
  text-align: center;
  margin: auto;
  color: #9aa5b4;
  padding: 2rem;
}

.no-messages div { font-size: 2.8rem; margin-bottom: 0.65rem; }
.no-messages p { font-size: 0.92rem; font-weight: 500; color: #6b7a91; margin: 0 0 0.35rem; }

/* ===== PIÈCES JOINTES DANS LES BULLES ===== */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.3rem;
}

.img-preview-wrapper {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  max-width: 200px;
}

.img-preview {
  width: 100%;
  display: block;
  border-radius: 10px;
  transition: filter 0.2s;
}

.img-zoom-hint {
  position: absolute;
  inset: 0;
  background: rgba(47, 79, 127, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.img-preview-wrapper:hover .img-zoom-hint { opacity: 1; }
.img-preview-wrapper:hover .img-preview { filter: brightness(0.82); }

.att-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.18rem;
  padding: 0 0.1rem;
}

.att-name {
  font-size: 0.7rem;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 145px;
}

.file-att {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 175px;
}

.file-icon { font-size: 1.3rem; flex-shrink: 0; }

.file-info { flex: 1; min-width: 0; }

.file-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 125px;
}

.file-size { font-size: 0.65rem; opacity: 0.7; }

.att-dl-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0.22rem 0.38rem;
  font-size: 0.82rem;
  transition: background 0.2s;
  flex-shrink: 0;
}

.att-dl-btn:hover { background: rgba(255, 255, 255, 0.4); }

/* ===== INPUT AREA ===== */
.input-area {
  padding: 0.85rem 1.25rem 0.65rem;
  background: white;
  border-top: 1px solid #d8dde6;
  flex-shrink: 0;
}

.files-preview {
  margin-bottom: 0.55rem;
  background: #eef2f8;
  border: 1px solid #b8cce4;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
}

.files-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #2f4f7f;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.clear-files-btn {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.clear-files-btn:hover { background: #fee2e2; }

.files-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  background: white;
  border: 1px solid #b8cce4;
  border-radius: 20px;
  padding: 0.18rem 0.55rem;
  font-size: 0.72rem;
  color: #1a2a40;
}

.chip-icon { font-size: 0.85rem; }

.chip-name {
  font-weight: 500;
  max-width: 85px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-size { color: #9aa5b4; }

.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #9aa5b4;
  font-size: 0.75rem;
  padding: 0;
  transition: color 0.2s;
}

.chip-remove:hover { color: #e74c3c; }

.input-wrapper {
  display: flex;
  gap: 0.65rem;
  align-items: flex-end;
}

.attach-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  background: #f2f2f2;
  border: 1.5px solid #d8dde6;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.attach-btn:hover {
  background: #eef2f8;
  border-color: #2f4f7f;
}

.attach-btn.has-files {
  background: #eef2f8;
  border-color: #2f4f7f;
}

.attach-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #2f4f7f;
  color: white;
  border-radius: 50%;
  width: 17px;
  height: 17px;
  font-size: 0.58rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.msg-input {
  flex: 1;
  padding: 0.65rem 0.9rem;
  border: 1.5px solid #d8dde6;
  border-radius: 12px;
  resize: none;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 0.88rem;
  max-height: 120px;
  outline: none;
  line-height: 1.4;
  background: #f2f2f2;
  color: #1a2a40;
  transition: all 0.2s;
}

.msg-input:focus {
  border-color: #2f4f7f;
  background: white;
  box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.1);
}

.msg-input::placeholder { color: #9aa5b4; }

.send-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  background: #2f4f7f;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #ffd700;
  transform: translateY(-1px);
}

.send-btn:hover:not(:disabled) svg { stroke: #1e3456; }

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.input-hint {
  margin: 0.35rem 0 0;
  font-size: 0.68rem;
  color: #9aa5b4;
}

/* ===== MODAL IMAGE ===== */
.img-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.img-modal-content {
  position: relative;
  background: #1e3456;
  border-radius: 14px;
  overflow: hidden;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.modal-close:hover { background: rgba(255, 215, 0, 0.3); }

.modal-img {
  max-width: 85vw;
  max-height: 78vh;
  object-fit: contain;
  display: block;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  background: #1a2a40;
  color: #9aa5b4;
  font-size: 0.8rem;
}

.modal-dl-btn {
  background: #ffd700;
  color: #1e3456;
  border: none;
  border-radius: 7px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  transition: opacity 0.2s;
}

.modal-dl-btn:hover { opacity: 0.88; }

/* ===== SPINNERS ===== */
.spinner {
  width: 26px;
  height: 26px;
  border: 2.5px solid #d8dde6;
  border-top-color: #2f4f7f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== SCROLLBAR ===== */
.conv-list::-webkit-scrollbar,
.messages-area::-webkit-scrollbar { width: 5px; }

.conv-list::-webkit-scrollbar-track,
.messages-area::-webkit-scrollbar-track { background: #f2f2f2; }

.conv-list::-webkit-scrollbar-thumb,
.messages-area::-webkit-scrollbar-thumb {
  background: #b8cce4;
  border-radius: 3px;
}

.conv-list::-webkit-scrollbar-thumb:hover,
.messages-area::-webkit-scrollbar-thumb:hover { background: #3a6199; }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .page-main { padding: 0; gap: 0; height: calc(100vh - 56px); }
  .page-header { padding: 1rem; }
  .inbox-container { border-radius: 0; }
  .sidebar { width: 100%; }
  .sidebar.mobile-hidden { display: none; }
  .chat-zone { display: none; }
  .chat-zone.mobile-show { display: flex; }
  .back-btn { display: flex; }
}
  `]
})
export class SocieteInternationalMessagerieComponent implements OnInit, OnDestroy, AfterViewChecked {

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
        setTimeout(() => this.openOrCreate(params['contact'], params['name']), 800);
      }
    });

    this.refreshSub = interval(10000).subscribe(() => {
      this.loadConversations(false);
      if (this.selectedConv) this.reloadMessages();
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

  loadConversations(showLoader = true): void {
  if (showLoader) this.loadingConv = true;
  
  this.http.get<Conversation[]>(`${this.API}/my-conversations`, {
    headers: this.getHeaders()
  }).subscribe({
    next: (data) => {
      this.conversations = data;
      
      // Compter les messages non lus pour chaque conversation
      let completedRequests = 0;
      const totalRequests = data.length;
      
      if (totalRequests === 0) {
        this.filterConversations();
        this.unreadCount = 0;
        this.loadingConv = false;
        return;
      }
      
      data.forEach(conv => {
        const otherEmail = this.getOtherEmail(conv);
        
        this.http.get<Message[]>(`${this.API}/conversation/${otherEmail}`, {
          headers: this.getHeaders()
        }).subscribe({
          next: (messages) => {
            const unreadMessages = messages.filter(m => 
              m.senderEmail === otherEmail && !m.read
            );
            conv.unreadCount = unreadMessages.length;
            
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.unreadCount = data.filter(c => !this.isViewed(c)).length;
              this.loadingConv = false;
            }
          },
          error: () => {
            conv.unreadCount = 0;
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.unreadCount = data.filter(c => !this.isViewed(c)).length;
              this.loadingConv = false;
            }
          }
        });
      });
    },
    error: () => { this.loadingConv = false; }
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

selectConversation(conv: Conversation): void {
  this.selectedConv = conv;
  this.mobileShowChat = true;
  this.loadMessages(conv);
  
  // ✅ Marquer les messages comme lus quand on ouvre la conversation
  const otherEmail = this.getOtherEmail(conv);
  this.messagerieService.markConversationAsRead(otherEmail).subscribe({
    next: () => {
      conv.unreadCount = 0;
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
        this.messages = [...data]
          .map(m => ({ ...m, attachments: m.attachments || [] }))
          .sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
        this.loadingMessages = false;
        this.shouldScroll = true;
      },
      error: () => { this.messages = []; this.loadingMessages = false; }
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
          .map(m => ({ ...m, attachments: m.attachments || [] }))
          .sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
        if (sorted.length > this.messages.length) {
          this.messages = sorted;
          this.shouldScroll = true;
        }
      },
      error: () => {}
    });
  }

  openOrCreate(contactEmail: string, contactName?: string): void {
    const existing = this.conversations.find(c =>
      c.senderEmail === contactEmail || c.recipientEmail === contactEmail
    );
    if (existing) {
      this.selectConversation(existing);
    } else {
      const fakeConv: Conversation = {
        id: -1,
        senderRole: 'INTERNATIONAL_COMPANY',
        senderEmail: this.myEmail,
        recipientEmail: contactEmail,
        recipientRole: 'LOCAL_PARTNER',
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

  // ── Gestion fichiers ──

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.selectedFiles = [...this.selectedFiles, ...Array.from(input.files)];
    input.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles(): void { this.selectedFiles = []; }

  // ── Envoi message ──

  sendMessage(): void {
    const hasText = this.newMessage.trim().length > 0;
    const hasFiles = this.selectedFiles.length > 0;

    if ((!hasText && !hasFiles) || !this.selectedConv || this.sending) return;

    const otherEmail = this.getOtherEmail(this.selectedConv);
    const content = this.newMessage.trim();
    this.sending = true;
    this.newMessage = '';

    // Sans fichiers → JSON simple
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
          alert('Error sending message. Please try again.');
        }
      });
      return;
    }

    // Avec fichiers → multipart XHR
    const filesToSend = [...this.selectedFiles];
    const token = localStorage.getItem('auth_token') || '';
    const formData = new FormData();
    formData.append('recipientEmail', otherEmail);
    formData.append('content', content || `📎 ${this.selectedFiles.length} fichier(s) joint(s)`);
    this.selectedFiles.forEach(file => formData.append('attachments', file, file.name));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${this.API}/send-with-attachments`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const msg = { ...data.message, attachments: data.message.attachments || [] };
          this.messages.push(msg);
          this.selectedFiles = [];
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(false), 400);
        } catch (e) { console.error('Erreur parsing:', e); }
      } else {
        this.newMessage = content;
        this.selectedFiles = filesToSend;
        alert(`Erreur ${xhr.status} : ${xhr.responseText || 'Vérifiez le backend'}`);
      }
      this.sending = false;
    };

    xhr.onerror = () => {
      this.sending = false;
      this.newMessage = content;
      this.selectedFiles = filesToSend;
      alert('Erreur réseau.');
    };

    xhr.send(formData);
  }

  // ── Blob URLs pour les images ──

  getBlobUrl(attachmentId: number): string {
    if (this.blobUrlCache.has(attachmentId)) return this.blobUrlCache.get(attachmentId)!;
    this.blobUrlCache.set(attachmentId, '');
    const token = localStorage.getItem('auth_token') || '';
    this.http.get(`${this.API}/attachment/${attachmentId}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        this.blobUrlCache.set(attachmentId, url);
      },
      error: () => this.blobUrlCache.delete(attachmentId)
    });
    return '';
  }

  // ── Téléchargement ──

  downloadFile(att: MessageAttachment): void {
    const token = localStorage.getItem('auth_token') || '';
    this.http.get(`${this.API}/attachment/${att.id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = att.fileName; a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Erreur lors du téléchargement.')
    });
  }

  // ── Modal image ──

  openImagePreview(att: MessageAttachment): void { this.previewAtt = att; }
  closeImagePreview(): void { this.previewAtt = null; }

  // ── Helpers ──

  isImageFile(fileType: string): boolean {
    return fileType?.startsWith('image/') ?? false;
  }

  isAutoAttachLabel(content: string): boolean {
    return /^📎 \d+ (fichier|pièce)\(s\)/.test(content);
  }

  getFileIcon(fileType: string): string {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📕';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
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

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

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
    const role = conv.senderEmail === this.myEmail ? conv.recipientRole : conv.senderRole;
    const labels: Record<string, string> = {
      'LOCAL_PARTNER': 'Local Partner',
      'INVESTOR': 'Investor',
      'PARTNER': 'Economic Partner',
      'TOURIST': 'Tourist',
      'INTERNATIONAL_COMPANY': 'International Company'
    };
    return labels[role] || role || '';
  }

  isViewed(conv: Conversation): boolean {
    return conv.senderEmail === this.myEmail ? conv.senderViewed : conv.partnerViewed;
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('en', { day: '2-digit', month: 'short' });
  }

  formatMsgTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}