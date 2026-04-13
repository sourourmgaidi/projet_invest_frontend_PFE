import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MessagerieService, Conversation, Message, MessageAttachment } from '../../core/services/messagerie.service';
import { AuthService } from '../../core/services/auth';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Role } from '../models/user.model';
import { interval, Subscription, switchMap } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  template: `
    <div class="page-layout">
      <app-navbar></app-navbar>

      <div class="page-main">
        <div class="inbox-container">

          <!-- Sidebar des conversations -->
          <div class="conversations-sidebar" [class.mobile-hidden]="mobileShowChat">
            <div class="sidebar-header">
              <h2>💬 Messages</h2>
            </div>

            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="searchConversations()"
                placeholder="Search conversations..."
              />
            </div>

            <div class="conversations-list">
              <div
                class="conversation-item"
                *ngFor="let conv of filteredConversations"
                [class.active]="selectedConversation?.id === conv.id"
                [class.unread]="!isViewed(conv)"
                (click)="selectConversation(conv)"
              >
                <div class="conv-avatar">{{ getInitials(conv) }}</div>
                <div class="conv-details">
                  <div class="conv-header">
                    <span class="conv-name">{{ getContactName(conv) }}</span>
                    <span class="conv-time">{{ formatTime(conv.lastMessageDate) }}</span>
                  </div>
                 <div class="conv-last-message">
  <span class="last-msg">{{ getLastMessagePreview(conv) }}</span>
  <div class="conv-badges">
    <span class="unread-dot" *ngIf="!isViewed(conv)">●</span>
    <span class="conv-unread-count" *ngIf="conv.unreadCount && conv.unreadCount > 0">
      {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
    </span>
  </div>
</div>
                </div>
              </div>

              <div class="empty-conversations" *ngIf="filteredConversations.length === 0 && !loading">
                <div class="empty-icon">✉️</div>
                <p>No conversations yet</p>
              </div>

              <div class="loading-conv" *ngIf="loading">
                <div class="spinner-small"></div>
              </div>
            </div>
          </div>

          <!-- Zone de chat -->
          <div class="chat-area" [class.mobile-visible]="mobileShowChat">

            <!-- Chat header -->
            <div class="chat-header" *ngIf="selectedConversation">
              <button class="back-btn" (click)="mobileShowChat = false">←</button>
              <div class="contact-info">
                <div class="contact-avatar">{{ getInitials(selectedConversation) }}</div>
                <div>
                  <h3>{{ getContactName(selectedConversation) }}</h3>
                  <p class="contact-role">{{ getContactRoleLabel(selectedConversation) }}</p>
                </div>
              </div>
            </div>

            <div class="chat-header empty-header" *ngIf="!selectedConversation">
              <h3>Select a conversation to start messaging</h3>
            </div>

            <!-- Messages -->
            <div class="messages-container" #messagesContainer>
              <div class="messages-list" *ngIf="messages.length > 0">
                <div
                  class="message-item"
                  *ngFor="let msg of messages"
                  [class.my-message]="msg.senderEmail === myEmail"
                >
                  <div class="message-bubble">
                    <!-- Texte -->
                    <p *ngIf="msg.content && !isAutoAttachLabel(msg.content)">{{ msg.content }}</p>

                    <!-- ── Pièces jointes ── -->
                    <div class="attachments-list" *ngIf="msg.attachments && msg.attachments.length > 0">
                      <div
                        class="attachment-item"
                        *ngFor="let att of msg.attachments"
                      >
                        <!-- Image -->
                        <ng-container *ngIf="isImageFile(att.fileType)">
                          <div class="img-preview-wrapper" (click)="openImagePreview(att)">
                            <img
                              [src]="getBlobUrl(att.id)"
                              [alt]="att.fileName"
                              class="img-preview"
                              loading="lazy"
                            />
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
                    <!-- ── Fin pièces jointes ── -->

                    <div class="msg-meta">
                      <span class="message-time">{{ formatMessageTime(msg.sentDate) }}</span>
                      <span class="attach-indicator" *ngIf="msg.attachments && msg.attachments.length > 0">
                        📎{{ msg.attachments.length }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="no-messages" *ngIf="messages.length === 0 && selectedConversation">
                <div class="no-msg-icon">💬</div>
                <p>No messages yet. Say hello! 👋</p>
              </div>
            </div>

            <!-- ── Input Area ── -->
            <div class="message-input-area" *ngIf="selectedConversation">

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

              <div class="input-row">
                <!-- Bouton pièce jointe -->
                <button
                  class="attach-btn"
                  (click)="fileInput.click()"
                  [class.has-files]="selectedFiles.length > 0"
                  title="Attach file"
                >
                  📎
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
                  placeholder="Type your message..."
                  (keydown.enter)="$event.preventDefault(); sendMessage()"
                  (input)="autoResize($event)"
                  rows="1"
                ></textarea>

                <button
                  class="send-btn"
                  [disabled]="(!newMessage.trim() && selectedFiles.length === 0) || sending"
                  (click)="sendMessage()"
                >
                  <span *ngIf="!sending">Send ➤</span>
                  <span *ngIf="sending">...</span>
                </button>
              </div>
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
    /* ─── Page Layout ─── */
    .page-layout {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      font-family: 'Inter', sans-serif;
    }
    app-navbar {
      width: 280px;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      z-index: 100;
    }
    .page-main {
      flex: 1;
      padding: 2rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ─── Inbox Container ─── */
    .inbox-container {
      display: flex;
      height: calc(100vh - 4rem);
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 30px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }

    /* ─── Sidebar ─── */
    .conversations-sidebar {
      width: 320px;
      flex-shrink: 0;
      border-right: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      background: #fafbff;
    }
    .sidebar-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .sidebar-header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }
    .search-box {
      padding: 0.75rem 1rem;
      position: relative;
      border-bottom: 1px solid #f1f5f9;
    }
    .search-box input {
      width: 100%;
      padding: 0.55rem 0.75rem 0.55rem 2.2rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.85rem;
      background: white;
      outline: none;
      box-sizing: border-box;
    }
    .search-box input:focus { border-color: #2563eb; }
    .search-icon {
      position: absolute;
      left: 1.65rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.8rem;
      pointer-events: none;
    }
    .conversations-list { flex: 1; overflow-y: auto; }
    .conversation-item {
      display: flex;
      padding: 0.9rem 1.25rem;
      gap: 0.75rem;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid #f8fafc;
    }
    .conversation-item:hover { background: #f0f4ff; }
    .conversation-item.active { background: #eff6ff; border-left: 3px solid #2563eb; }
    .conversation-item.unread { background: #fffbeb; }
    .conv-avatar {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
      flex-shrink: 0;
    }
    .conv-details { flex: 1; min-width: 0; }
    .conv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
    .conv-name { font-weight: 600; font-size: 0.9rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    .conv-time { font-size: 0.7rem; color: #94a3b8; flex-shrink: 0; }
    .conv-last-message { display: flex; justify-content: space-between; align-items: center; }
    .last-msg { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
    .unread-dot { color: #2563eb; font-size: 0.9rem; flex-shrink: 0; }
    .empty-conversations { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-conversations p { font-size: 0.9rem; }
    .loading-conv { display: flex; justify-content: center; padding: 2rem; }
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

.unread-dot {
  color: #2563eb;
  font-size: 0.85rem;
  flex-shrink: 0;
}
    .spinner-small {
      width: 28px; height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Chat Area ─── */
    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      min-width: 0;
    }
    .chat-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: white;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }
    .empty-header { justify-content: center; color: #94a3b8; }
    .empty-header h3 { margin: 0; font-size: 0.95rem; font-weight: 500; }
    .back-btn {
      display: none;
      background: none; border: none;
      font-size: 1.3rem; cursor: pointer; color: #2563eb;
      padding: 0 0.5rem 0 0;
    }
    .contact-info { display: flex; align-items: center; gap: 0.75rem; }
    .contact-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
    }
    .contact-info h3 { margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
    .contact-role { margin: 0; font-size: 0.78rem; color: #64748b; }

    /* ─── Messages ─── */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .messages-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .message-item { display: flex; }
    .message-item.my-message { justify-content: flex-end; }
    .message-bubble {
      max-width: 65%;
      padding: 0.7rem 1rem;
      border-radius: 18px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #f1f5f9;
    }
    .my-message .message-bubble {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      border-color: transparent;
    }
    .message-bubble p { margin: 0 0 0.2rem; font-size: 0.9rem; line-height: 1.5; word-wrap: break-word; }

    .msg-meta {
      display: flex; justify-content: flex-end;
      align-items: center; gap: 0.4rem; margin-top: 0.25rem;
    }
    .message-time { font-size: 0.65rem; opacity: 0.65; }
    .attach-indicator { font-size: 0.65rem; opacity: 0.75; }

    .no-messages { text-align: center; margin: auto; color: #94a3b8; }
    .no-msg-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .no-messages p { font-size: 0.9rem; }

    /* ─── Pièces jointes dans les bulles ─── */
    .attachments-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.35rem; }

    .img-preview-wrapper {
      position: relative; border-radius: 10px; overflow: hidden;
      cursor: pointer; max-width: 200px;
    }
    .img-preview { width: 100%; display: block; border-radius: 10px; transition: filter 0.2s; }
    .img-zoom-hint {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; opacity: 0; transition: opacity 0.2s;
    }
    .img-preview-wrapper:hover .img-zoom-hint { opacity: 1; }
    .img-preview-wrapper:hover .img-preview { filter: brightness(0.8); }

    .att-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 0.2rem; padding: 0 0.1rem;
    }
    .att-name { font-size: 0.72rem; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

    .file-att {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.5rem 0.65rem;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.2);
      min-width: 180px;
    }
    .file-icon { font-size: 1.4rem; flex-shrink: 0; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { display: block; font-size: 0.78rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
    .file-size { font-size: 0.68rem; opacity: 0.7; }

    .att-dl-btn {
      background: rgba(255,255,255,0.2); border: none; border-radius: 6px;
      cursor: pointer; padding: 0.25rem 0.4rem;
      font-size: 0.85rem; transition: background 0.2s; flex-shrink: 0;
    }
    .att-dl-btn:hover { background: rgba(255,255,255,0.4); }

    /* ─── Input Area ─── */
    .message-input-area {
      padding: 0.75rem 1.5rem;
      background: white;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    /* Aperçu fichiers */
    .files-preview {
      margin-bottom: 0.6rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 0.6rem 0.8rem;
    }
    .files-preview-header {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: #2563eb; font-weight: 600; margin-bottom: 0.4rem;
    }
    .clear-files-btn {
      background: none; border: none; color: #ef4444;
      cursor: pointer; font-size: 0.72rem; font-weight: 600;
      padding: 0.1rem 0.35rem; border-radius: 4px; transition: background 0.15s;
    }
    .clear-files-btn:hover { background: #fee2e2; }
    .files-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .file-chip {
      display: flex; align-items: center; gap: 0.3rem;
      background: white; border: 1px solid #bfdbfe;
      border-radius: 20px; padding: 0.2rem 0.6rem;
      font-size: 0.75rem; color: #374151;
    }
    .chip-icon { font-size: 0.9rem; }
    .chip-name { font-weight: 500; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chip-size { color: #94a3b8; }
    .chip-remove {
      background: none; border: none; cursor: pointer;
      color: #94a3b8; font-size: 0.8rem; padding: 0; transition: color 0.15s;
    }
    .chip-remove:hover { color: #ef4444; }

    .input-row {
      display: flex; gap: 0.75rem; align-items: flex-end;
    }

    /* Bouton pièce jointe */
    .attach-btn {
      width: 44px; height: 44px; flex-shrink: 0;
      background: #f1f5f9; border: 1.5px solid #e2e8f0;
      border-radius: 12px; cursor: pointer;
      font-size: 1.1rem; position: relative;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .attach-btn:hover { background: #dbeafe; border-color: #2563eb; }
    .attach-btn.has-files { background: #dbeafe; border-color: #2563eb; }
    .attach-badge {
      position: absolute; top: -5px; right: -5px;
      background: #2563eb; color: white;
      border-radius: 50%; width: 18px; height: 18px;
      font-size: 0.62rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
    }

    .input-row textarea {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      resize: none;
      font-family: inherit;
      font-size: 0.9rem;
      max-height: 120px;
      outline: none;
      transition: border-color 0.2s;
      line-height: 1.4;
    }
    .input-row textarea:focus { border-color: #2563eb; }

    .send-btn {
      padding: 0.75rem 1.4rem;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white; border: none;
      border-radius: 12px;
      font-weight: 600; font-size: 0.9rem;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap; height: 44px;
    }
    .send-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(37,99,235,0.3);
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ─── Modal image ─── */
    .img-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .img-modal-content {
      position: relative; background: #1e293b;
      border-radius: 16px; overflow: hidden;
      max-width: 90vw; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 25px 80px rgba(0,0,0,0.6);
    }
    .modal-close {
      position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
      background: rgba(0,0,0,0.5); color: white; border: none;
      border-radius: 50%; width: 32px; height: 32px;
      cursor: pointer; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .modal-close:hover { background: rgba(0,0,0,0.8); }
    .modal-img { max-width: 85vw; max-height: 78vh; object-fit: contain; display: block; }
    .modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: #0f172a;
      color: #94a3b8; font-size: 0.82rem;
    }
    .modal-dl-btn {
      background: #2563eb; color: white; border: none;
      border-radius: 8px; padding: 0.4rem 0.9rem;
      cursor: pointer; font-size: 0.82rem; font-weight: 600;
      transition: background 0.2s;
    }
    .modal-dl-btn:hover { background: #1d4ed8; }

    /* ─── Responsive ─── */
    @media (max-width: 900px) {
      app-navbar { width: 100%; height: auto; position: relative; }
      .page-layout { flex-direction: column; }
      .page-main { padding: 0; }
      .inbox-container { border-radius: 0; height: calc(100vh - 60px); }
      .conversations-sidebar { width: 100%; }
      .conversations-sidebar.mobile-hidden { display: none; }
      .chat-area { display: none; }
      .chat-area.mobile-visible { display: flex; }
      .back-btn { display: block; }
      .message-bubble { max-width: 80%; }
    }
  `]
})
export class InboxComponent implements OnInit, OnDestroy, AfterViewChecked {

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  searchQuery = '';
  myEmail = '';
  myRole: Role | null = null;
  loading = false;
  sending = false;
  mobileShowChat = false;
  private shouldScroll = false;

  // ── Pièces jointes ──
  selectedFiles: File[] = [];
  previewAtt: MessageAttachment | null = null;
  private blobUrlCache = new Map<number, string>();

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  private refreshSubscription?: Subscription;
  private readonly API = 'http://localhost:8089/api/messagerie';

  constructor(
    private messagerieService: MessagerieService,
    private authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {
    const currentUser = this.authService.getCurrentUser();
    console.log('👤 Current user complet:', currentUser);

    this.myEmail = currentUser?.email || '';
    console.log('📧 Email récupéré du currentUser:', this.myEmail);

    this.myRole = this.authService.getUserRole();
    console.log('👤 Rôle:', this.myRole);

    if (!this.myEmail) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔍 JWT payload:', payload);
          this.myEmail = payload.email ||
                         payload.sub ||
                         payload.preferred_username ||
                         payload.username ||
                         payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                         '';
          console.log('📧 Email extrait du token:', this.myEmail);
          const roles = payload.realm_access?.roles || payload.roles || [];
          console.log('👤 Rôles du token:', roles);
        } catch (e) {
          console.error('❌ Erreur parsing token:', e);
        }
      }
    }
  }

  ngOnInit(): void {
    this.loadConversations();

    this.route.queryParams.subscribe(params => {
      if (params['contact']) {
        const contactEmail = params['contact'];
        const contactName = params['name'] || contactEmail;
        setTimeout(() => this.openOrCreateConversation(contactEmail, contactName), 600);
      }
    });

    this.refreshSubscription = interval(10000).pipe(
      switchMap(() => this.messagerieService.getMyConversations())
    ).subscribe({
      next: (data) => {
        this.conversations = data;
        this.filterConversations();
      },
      error: (err) => console.error('Refresh error:', err)
    });

    setTimeout(() => this.verifierEmailDansBase(), 2000);
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    // Libérer les blob URLs
    this.blobUrlCache.forEach(url => window.URL.revokeObjectURL(url));
    this.blobUrlCache.clear();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ────────── Conversations ──────────

loadConversations(): void {
  this.loading = true;
  this.messagerieService.getMyConversations().subscribe({
    next: (data) => {
      this.conversations = data;
      
      // Compter les messages non lus pour chaque conversation
      let completedRequests = 0;
      const totalRequests = data.length;
      
      if (totalRequests === 0) {
        this.filterConversations();
        this.loading = false;
        return;
      }
      
      data.forEach(conv => {
        const otherEmail = this.getOtherEmail(conv);
        
        this.messagerieService.getConversation(otherEmail).subscribe({
          next: (messages) => {
            const unreadMessages = messages.filter(m => 
              m.senderEmail === otherEmail && !m.read
            );
            conv.unreadCount = unreadMessages.length;
            
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.loading = false;
            }
          },
          error: () => {
            conv.unreadCount = 0;
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.filterConversations();
              this.loading = false;
            }
          }
        });
      });
    },
    error: (err) => {
      console.error('Error loading conversations:', err);
      this.loading = false;
    }
  });
}

  verifierEmailDansBase(): void {
    if (!this.myEmail) { console.error('❌ Pas d\'email à vérifier'); return; }
    this.messagerieService.searchLocalPartners(this.myEmail).subscribe({
      next: (results) => {
        const existe = results?.some((r: any) =>
          r.email?.toLowerCase() === this.myEmail.toLowerCase()
        );
        console.log(existe ? '✅ Email EXISTE dans la base' : '❌ Email INTROUVABLE dans la base');
      },
      error: (err) => console.error('Erreur vérification email:', err)
    });
  }

  openOrCreateConversation(contactEmail: string, contactName?: string): void {
    const existing = this.conversations.find(c =>
      c.senderEmail === contactEmail || c.recipientEmail === contactEmail
    );
    if (existing) {
      this.selectConversation(existing);
    } else {
      const fakeConv: Conversation = {
        id: -1,
        senderRole: this.myRole?.toString() || '',
        senderEmail: this.myEmail,
        recipientEmail: contactEmail,
        recipientRole: 'LOCAL_PARTNER',
        lastMessage: '',
        lastMessageDate: new Date().toISOString(),
        senderViewed: true,
        partnerViewed: false,
        recipientName: contactName || contactEmail,
        senderName: this.myEmail
      };
      this.selectedConversation = fakeConv;
      this.messages = [];
      this.mobileShowChat = true;
    }
  }

  filterConversations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = this.conversations;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredConversations = this.conversations.filter(conv => {
      const name = this.getContactName(conv).toLowerCase();
      return name.includes(q) || (conv.lastMessage?.toLowerCase().includes(q) ?? false);
    });
  }

  searchConversations(): void { this.filterConversations(); }

 selectConversation(conv: Conversation): void {
  this.selectedConversation = conv;
  this.mobileShowChat = true;
  const otherEmail = this.getOtherEmail(conv);

  this.messagerieService.getConversation(otherEmail).subscribe({
    next: (msgs) => {
      this.messages = msgs.map(m => ({ ...m, attachments: m.attachments || [] }));
      this.shouldScroll = true;
    },
    error: (err) => console.error('Error loading conversation:', err)
  });
  
  // ✅ Marquer les messages comme lus quand on ouvre la conversation
  this.messagerieService.markConversationAsRead(otherEmail).subscribe({
    next: () => {
      conv.unreadCount = 0;
      setTimeout(() => this.loadConversations(), 500);
    },
    error: (err) => console.error('Erreur marquage lecture:', err)
  });
}

  // ────────── Gestion fichiers ──────────

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

  // ────────── Envoi message ──────────

  sendMessage(): void {
    const hasText = this.newMessage.trim().length > 0;
    const hasFiles = this.selectedFiles.length > 0;

    if ((!hasText && !hasFiles) || !this.selectedConversation || this.sending) return;

    const otherEmail = this.getOtherEmail(this.selectedConversation);
    const content = this.newMessage.trim();

    console.log('📤 Envoi → destinataire:', otherEmail, '| fichiers:', this.selectedFiles.length);

    if (!this.myEmail) { alert('❌ Votre email n\'est pas défini. Reconnectez-vous.'); return; }
    if (!otherEmail) { alert('❌ Email du destinataire manquant'); return; }
    if (otherEmail.toLowerCase() === this.myEmail.toLowerCase()) {
      alert('❌ Vous ne pouvez pas vous envoyer un message à vous-même');
      return;
    }

    this.sending = true;
    this.newMessage = '';

    // ── Cas 1 : Pas de fichiers → JSON simple ──
    if (!hasFiles) {
      this.messagerieService.sendMessage(otherEmail, content).subscribe({
        next: (msg) => {
          this.messages.push({ ...msg, attachments: msg.attachments || [] });
          this.sending = false;
          this.shouldScroll = true;
          if (this.selectedConversation?.id === -1) {
            setTimeout(() => this.loadConversations(), 500);
          } else {
            this.loadConversations();
          }
        },
        error: (err) => {
          console.error('❌ Erreur envoi:', err);
          this.sending = false;
          this.newMessage = content;
          const msg = err.error?.error || err.error?.message || JSON.stringify(err.error) || 'Erreur inconnue';
          alert('❌ ' + msg);
        }
      });
      return;
    }

    // ── Cas 2 : Avec fichiers → XHR multipart (bypass intercepteur Angular) ──
    const formData = new FormData();
    formData.append('recipientEmail', otherEmail);
    // Le backend exige content non-null
    const finalContent = content || `📎 ${this.selectedFiles.length} fichier(s) joint(s)`;
    formData.append('content', finalContent);
    this.selectedFiles.forEach(file => formData.append('attachments', file, file.name));

    const token = localStorage.getItem('auth_token') || '';
    const filesToSend = [...this.selectedFiles];

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${this.API}/send-with-attachments`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // ⚠️ Pas de Content-Type : le browser génère la boundary automatiquement

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: { message: Message; attachmentCount: number } = JSON.parse(xhr.responseText);
          const msg = { ...data.message, attachments: data.message.attachments || [] };
          this.messages.push(msg);
          this.selectedFiles = [];
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(), 400);
        } catch (e) {
          console.error('Erreur parsing réponse:', e);
        }
      } else {
        console.error('Erreur serveur:', xhr.status, xhr.responseText);
        this.newMessage = content;
        this.selectedFiles = filesToSend;
        alert(`Erreur ${xhr.status} : ${xhr.responseText || 'Vérifiez le backend'}`);
      }
      this.sending = false;
    };

    xhr.onerror = () => {
      console.error('Erreur réseau XHR');
      this.sending = false;
      this.newMessage = content;
      this.selectedFiles = filesToSend;
      alert('Erreur réseau. Vérifiez que le serveur est accessible.');
    };

    xhr.send(formData);
  }

  // ────────── Blob URLs pour les images (évite le 401 du ?token=) ──────────

  getBlobUrl(attachmentId: number): string {
    if (this.blobUrlCache.has(attachmentId)) {
      return this.blobUrlCache.get(attachmentId)!;
    }
    this.blobUrlCache.set(attachmentId, ''); // placeholder
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

  // ────────── Téléchargement ──────────

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

  // ────────── Modal image ──────────

  openImagePreview(att: MessageAttachment): void { this.previewAtt = att; }
  closeImagePreview(): void { this.previewAtt = null; }

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
    if (conv.senderEmail === this.myEmail) {
      return conv.recipientName || conv.recipientEmail || 'Contact';
    }
    return conv.senderName || conv.senderEmail || 'Contact';
  }

  getInitials(conv: Conversation): string {
    const name = this.getContactName(conv);
    if (!name || name === 'Contact') return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  getContactRoleLabel(conv: Conversation): string {
    const role = conv.senderEmail === this.myEmail ? conv.recipientRole : conv.senderRole;
    const labels: Record<string, string> = {
      'LOCAL_PARTNER': 'Local Partner',
      'INVESTOR': 'Investor',
      'PARTNER': 'Economic Partner',
      'TOURIST': 'Tourist',
      'ADMIN': 'Administrator'
    };
    return labels[role] || role || '';
  }

  getLastMessagePreview(conv: Conversation): string {
    if (!conv.lastMessage) return 'Start a conversation';
    return conv.lastMessage.length > 35
      ? conv.lastMessage.substring(0, 35) + '...'
      : conv.lastMessage;
  }

  isViewed(conv: Conversation): boolean {
    return conv.senderEmail === this.myEmail ? conv.senderViewed : conv.partnerViewed;
  }

  isImageFile(fileType: string): boolean {
    return fileType?.startsWith('image/') ?? false;
  }

  /** Masquer le label auto-généré "📎 N fichier(s)" dans la bulle si des attachments existent */
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

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  formatMessageTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}