import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MessagerieService, Conversation, Message, MessageAttachment } from '../../core/services/messagerie.service';
import { AuthService } from '../../core/services/auth';
import { SubscriptionService } from '../../core/services/subscription.service';
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

            <!-- Subscription banner -->
            <div class="subscription-banner" *ngIf="showSubscriptionBanner">
              <div class="banner-content">
                <span class="banner-icon">🔔</span>
                <div class="banner-text">
                  <strong>Subscription Required</strong>
                  <p>Subscribe to contact local partners (monthly plan)</p>
                </div>
                <button class="banner-btn" (click)="initiateSubscriptionPayment(pendingContactEmail, pendingContactName)" [disabled]="initiatingPayment">
                  <span *ngIf="!initiatingPayment">Subscribe Now</span>
                  <span *ngIf="initiatingPayment">Redirecting...</span>
                </button>
                <button class="banner-close" (click)="showSubscriptionBanner = false">✕</button>
              </div>
            </div>

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

            <div class="chat-header empty-header" *ngIf="!selectedConversation && !showSubscriptionBanner">
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
                    <p *ngIf="msg.content && !isAutoAttachLabel(msg.content)">{{ msg.content }}</p>

                    <div class="attachments-list" *ngIf="msg.attachments && msg.attachments.length > 0">
                      <div class="attachment-item" *ngFor="let att of msg.attachments">
                        <ng-container *ngIf="isImageFile(att.fileType)">
                          <div class="img-preview-wrapper" (click)="openImagePreview(att)">
                            <img [src]="getBlobUrl(att.id)" [alt]="att.fileName" class="img-preview" loading="lazy" />
                            <div class="img-zoom-hint">🔍</div>
                          </div>
                          <div class="att-footer">
                            <span class="att-name">{{ att.fileName }}</span>
                            <button class="att-dl-btn" (click)="downloadFile(att)" title="Download">⬇</button>
                          </div>
                        </ng-container>
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

            <!-- Input Area -->
            <div class="message-input-area" *ngIf="selectedConversation">
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
                <button class="attach-btn" (click)="fileInput.click()" [class.has-files]="selectedFiles.length > 0" title="Attach file">
                  📎
                  <span class="attach-badge" *ngIf="selectedFiles.length > 0">{{ selectedFiles.length }}</span>
                </button>

                <input #fileInput type="file" multiple
                       accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                       style="display:none" (change)="onFilesSelected($event)" />

                <textarea
                  [(ngModel)]="newMessage"
                  placeholder="Type your message..."
                  (keydown.enter)="$event.preventDefault(); sendMessage()"
                  (input)="autoResize($event)"
                  rows="1"
                ></textarea>

                <button class="send-btn"
                        [disabled]="(!newMessage.trim() && selectedFiles.length === 0) || sending"
                        (click)="sendMessage()">
                  <span *ngIf="!sending">Send ➤</span>
                  <span *ngIf="sending">...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal prévisualisation image -->
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
    /* ── Variables (login design system) ── */
    :host {
    --primary: #2f4f7f;
    --primary-dark: #1e3a5f;
    --accent: #ffd700;
    --secondary: #f2f2f2;
    --font: 'Inter', sans-serif;
  }

  /* ── Layout principal ── */
  .page-layout {
    min-height: 100vh;
    background: var(--secondary);
    font-family: var(--font);
  }

  /* Ajustement pour le navbar flottant */
  app-navbar {
    display: block;
    position: relative;
    z-index: 1000;
  }

  .page-main {
    /* Ajoute un padding-top pour éviter que le contenu ne soit caché derrière le navbar flottant */
    padding-top: 100px; /* Hauteur du navbar (70px) + marge */
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
   .inbox-container {
    display: flex;
    height: calc(100vh - 120px);
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border-radius: 25px;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
    border: 1px solid rgba(255, 215, 0, 0.4);
    margin: 0 2rem;
  }

    /* ── Subscription Banner ── */
    .subscription-banner {
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border-bottom: 1px solid #fcd34d;
      padding: 0.75rem 1.25rem;
      flex-shrink: 0;
    }
    .banner-content { display: flex; align-items: center; gap: 0.75rem; }
    .banner-icon { font-size: 1.3rem; flex-shrink: 0; }
    .banner-text { flex: 1; }
    .banner-text strong { font-size: 0.9rem; color: #92400e; display: block; }
    .banner-text p { font-size: 0.78rem; color: #78350f; margin: 0; }
    .banner-btn {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; border: none; border-radius: 999px;
      font-weight: 700; font-size: 0.82rem;
      cursor: pointer; transition: all 0.25s; white-space: nowrap; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(47, 79, 127, 0.25);
    }
    .banner-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47, 79, 127, 0.38); }
    .banner-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .banner-close { background: none; border: none; color: #92400e; cursor: pointer; font-size: 1rem; padding: 0.25rem; flex-shrink: 0; }
    .banner-close:hover { color: #dc2626; }

    /* ── Sidebar ── */
    .conversations-sidebar {
      width: 320px; flex-shrink: 0;
      border-right: 1px solid rgba(255, 215, 0, 0.25);
      display: flex; flex-direction: column;
      background: rgba(255, 255, 255, 0.5);
    }
    .sidebar-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(47, 79, 127, 0.08);
    }
    .sidebar-header h2 {
      margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--primary);
      position: relative; display: inline-block; padding-bottom: 0.4rem;
    }
    .sidebar-header h2::after {
      content: '';
      position: absolute; bottom: 0; left: 0;
      width: 32px; height: 3px;
      background: var(--accent); border-radius: 999px;
    }
    .search-box {
      padding: 0.75rem 1rem; position: relative;
      border-bottom: 1px solid rgba(47, 79, 127, 0.08);
    }
    .search-box input {
      width: 100%; padding: 0.65rem 0.75rem 0.65rem 2.2rem;
      border: 2px solid #e2e8f0; border-radius: 12px;
      font-size: 0.85rem; font-family: var(--font);
      background: white; outline: none;
      box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s;
      color: #1e293b;
    }
    .search-box input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.08);
    }
    .search-icon { position: absolute; left: 1.65rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; pointer-events: none; }
    .conversations-list { flex: 1; overflow-y: auto; }
    .conversation-item {
      display: flex; padding: 0.9rem 1.25rem; gap: 0.75rem;
      cursor: pointer; transition: background 0.15s;
      border-bottom: 1px solid rgba(47, 79, 127, 0.05);
    }
    .conversation-item:hover { background: rgba(47, 79, 127, 0.06); }
    .conversation-item.active {
      background: rgba(47, 79, 127, 0.08);
      border-left: 3px solid var(--primary);
    }
    .conversation-item.unread { background: rgba(255, 215, 0, 0.08); }
    .conv-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
    }
    .conv-details { flex: 1; min-width: 0; }
    .conv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
    .conv-name { font-weight: 600; font-size: 0.9rem; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    .conv-time { font-size: 0.7rem; color: #94a3b8; flex-shrink: 0; }
    .conv-last-message { display: flex; justify-content: space-between; align-items: center; }
    .last-msg { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
    .conv-badges { display: flex; align-items: center; gap: 0.3rem; }
    .unread-dot { color: var(--primary); font-size: 0.9rem; flex-shrink: 0; }
    .conv-unread-count {
      background: var(--primary); color: white; border-radius: 20px;
      padding: 0.1rem 0.45rem; font-size: 0.65rem; font-weight: 700;
      min-width: 18px; text-align: center;
    }
    .empty-conversations { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-conversations p { font-size: 0.9rem; }
    .loading-conv { display: flex; justify-content: center; padding: 2rem; }
    .spinner-small {
      width: 28px; height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--primary);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Chat Area ── */
    .chat-area { flex: 1; display: flex; flex-direction: column; background: rgba(242, 242, 242, 0.4); min-width: 0; }
    .chat-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(47, 79, 127, 0.08);
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; gap: 1rem; flex-shrink: 0;
    }
    .empty-header { justify-content: center; color: #94a3b8; }
    .empty-header h3 { margin: 0; font-size: 0.95rem; font-weight: 500; }
    .back-btn { display: none; background: none; border: none; font-size: 1.3rem; cursor: pointer; color: var(--primary); padding: 0 0.5rem 0 0; }
    .contact-info { display: flex; align-items: center; gap: 0.75rem; }
    .contact-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
    }
    .contact-info h3 {
      margin: 0; font-size: 1rem; font-weight: 700; color: var(--primary);
      position: relative; display: inline-block; padding-bottom: 0.35rem;
    }
    .contact-info h3::after {
      content: '';
      position: absolute; bottom: 0; left: 0;
      width: 24px; height: 3px;
      background: var(--accent); border-radius: 999px;
    }
    .contact-role { margin: 0; font-size: 0.78rem; color: #64748b; }

    /* ── Messages ── */
    .messages-container { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; }
    .messages-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .message-item { display: flex; }
    .message-item.my-message { justify-content: flex-end; }
    .message-bubble {
      max-width: 65%; padding: 0.7rem 1rem; border-radius: 18px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 2px 8px rgba(47, 79, 127, 0.07);
      border: 1px solid rgba(255, 215, 0, 0.25);
    }
    .my-message .message-bubble {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; border-color: transparent;
      box-shadow: 0 4px 14px rgba(47, 79, 127, 0.3);
    }
    .message-bubble p { margin: 0 0 0.2rem; font-size: 0.9rem; line-height: 1.5; word-wrap: break-word; }
    .msg-meta { display: flex; justify-content: flex-end; align-items: center; gap: 0.4rem; margin-top: 0.25rem; }
    .message-time { font-size: 0.65rem; opacity: 0.65; }
    .attach-indicator { font-size: 0.65rem; opacity: 0.75; }
    .no-messages { text-align: center; margin: auto; color: #94a3b8; }
    .no-msg-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .no-messages p { font-size: 0.9rem; }

    /* ── Pièces jointes ── */
    .attachments-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.35rem; }
    .img-preview-wrapper { position: relative; border-radius: 12px; overflow: hidden; cursor: pointer; max-width: 200px; }
    .img-preview { width: 100%; display: block; border-radius: 12px; transition: filter 0.2s; }
    .img-zoom-hint { position: absolute; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; opacity: 0; transition: opacity 0.2s; }
    .img-preview-wrapper:hover .img-zoom-hint { opacity: 1; }
    .img-preview-wrapper:hover .img-preview { filter: brightness(0.8); }
    .att-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 0.2rem; padding: 0 0.1rem; }
    .att-name { font-size: 0.72rem; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
    .file-att { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.65rem; background: rgba(255,255,255,0.15); border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); min-width: 180px; }
    .file-icon { font-size: 1.4rem; flex-shrink: 0; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { display: block; font-size: 0.78rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
    .file-size { font-size: 0.68rem; opacity: 0.7; }
    .att-dl-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 8px; cursor: pointer; padding: 0.25rem 0.4rem; font-size: 0.85rem; transition: background 0.2s; flex-shrink: 0; }
    .att-dl-btn:hover { background: rgba(255,255,255,0.4); }

    /* ── Input Area ── */
    .message-input-area {
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255, 215, 0, 0.3);
      flex-shrink: 0;
    }
    .files-preview {
      margin-bottom: 0.6rem;
      background: rgba(47, 79, 127, 0.06);
      border: 1px solid rgba(47, 79, 127, 0.15);
      border-radius: 15px; padding: 0.6rem 0.8rem;
    }
    .files-preview-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--primary); font-weight: 600; margin-bottom: 0.4rem; }
    .clear-files-btn { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.72rem; font-weight: 600; padding: 0.1rem 0.35rem; border-radius: 4px; }
    .clear-files-btn:hover { background: #fee2e2; }
    .files-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .file-chip { display: flex; align-items: center; gap: 0.3rem; background: white; border: 1px solid rgba(47, 79, 127, 0.2); border-radius: 20px; padding: 0.2rem 0.6rem; font-size: 0.75rem; color: #374151; }
    .chip-icon { font-size: 0.9rem; }
    .chip-name { font-weight: 500; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chip-size { color: #94a3b8; }
    .chip-remove { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 0.8rem; padding: 0; }
    .chip-remove:hover { color: #ef4444; }
    .input-row { display: flex; gap: 0.75rem; align-items: flex-end; }
    .attach-btn {
      width: 44px; height: 44px; flex-shrink: 0;
      background: white; border: 2px solid #e2e8f0;
      border-radius: 12px; cursor: pointer; font-size: 1.1rem;
      position: relative; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .attach-btn:hover { background: rgba(47, 79, 127, 0.06); border-color: var(--primary); }
    .attach-btn.has-files { background: rgba(47, 79, 127, 0.08); border-color: var(--primary); }
    .attach-badge {
      position: absolute; top: -5px; right: -5px;
      background: var(--primary); color: white;
      border-radius: 50%; width: 18px; height: 18px;
      font-size: 0.62rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
    }
    .input-row textarea {
      flex: 1; padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0; border-radius: 12px;
      resize: none; font-family: var(--font); font-size: 0.9rem;
      max-height: 120px; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      line-height: 1.4; background: white; color: #1e293b;
    }
    .input-row textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(47, 79, 127, 0.08);
    }
    .send-btn {
      padding: 0.75rem 1.4rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; border: none; border-radius: 999px;
      font-weight: 700; font-size: 0.9rem; font-family: var(--font);
      cursor: pointer; transition: all 0.25s; white-space: nowrap; height: 44px;
      box-shadow: 0 2px 8px rgba(47, 79, 127, 0.25);
    }
    .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47, 79, 127, 0.38); }
    .send-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    /* ── Modal image ── */
    .img-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .img-modal-content {
      position: relative; background: var(--primary-dark);
      border-radius: 25px; overflow: hidden;
      max-width: 90vw; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 25px 80px rgba(0,0,0,0.6);
      border: 1px solid rgba(255, 215, 0, 0.3);
    }
    .modal-close {
      position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
      background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%;
      width: 32px; height: 32px; cursor: pointer; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-close:hover { background: rgba(0,0,0,0.8); }
    .modal-img { max-width: 85vw; max-height: 78vh; object-fit: contain; display: block; }
    .modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: rgba(0,0,0,0.3);
      color: #94a3b8; font-size: 0.82rem;
    }
    .modal-dl-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; border: none; border-radius: 999px;
      padding: 0.4rem 0.9rem; cursor: pointer; font-size: 0.82rem; font-weight: 700;
      box-shadow: 0 2px 8px rgba(47, 79, 127, 0.25); transition: all 0.25s;
    }
    .modal-dl-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(47, 79, 127, 0.38); }

    /* ── Responsive ── */
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

  // ── Subscription / Paiement ──
  showSubscriptionBanner = false;
  initiatingPayment = false;
  pendingContactEmail = '';
  pendingContactName = '';

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  private refreshSubscription?: Subscription;
  private readonly API = 'http://localhost:8089/api/messagerie';

  constructor(
    private messagerieService: MessagerieService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {
    const currentUser = this.authService.getCurrentUser();
    this.myEmail = currentUser?.email || '';
    this.myRole = this.authService.getUserRole();

    if (!this.myEmail) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.myEmail = payload.email || payload.sub || payload.preferred_username || payload.username || '';
        } catch (e) {
          console.error('❌ Erreur parsing token:', e);
        }
      }
    }
  }

  ngOnInit(): void {
    this.loadConversations();

    this.route.queryParams.subscribe(params => {
      // ✅ Retour Konnect après paiement réussi
      if (params['paymentId'] && params['paymentRef']) {
        this.handleSubscriptionReturn(
          params['paymentId'],
          params['paymentRef'],
          params['transaction_id']
        );
        return;
      }

      // Navigation normale depuis Contact Provider
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
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    this.blobUrlCache.forEach(url => window.URL.revokeObjectURL(url));
    this.blobUrlCache.clear();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ══════════════════════════════════════════
  // GESTION ABONNEMENT KONNECT
  // ══════════════════════════════════════════

  openOrCreateConversation(contactEmail: string, contactName?: string): void {
    this.subscriptionService.checkSubscription().subscribe({
      next: (res) => {
        if (res.hasActiveSubscription) {
          this._openConversation(contactEmail, contactName);
        } else {
          this.pendingContactEmail = contactEmail;
          this.pendingContactName = contactName || contactEmail;
          this.showSubscriptionBanner = true;
        }
      },
      error: () => {
        this._openConversation(contactEmail, contactName);
      }
    });
  }

  private _openConversation(contactEmail: string, contactName?: string): void {
    this.showSubscriptionBanner = false;
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

  initiateSubscriptionPayment(contactEmail: string, contactName?: string): void {
    this.initiatingPayment = true;
    this.subscriptionService.initiateSubscription().subscribe({
      next: (res) => {
        localStorage.setItem('pending_contact_email', contactEmail);
        localStorage.setItem('pending_contact_name', contactName || contactEmail);
        localStorage.setItem('pending_payment_id', res.paymentId);
        localStorage.setItem('pending_payment_ref', res.paymentRef);
        window.location.href = res.payUrl;
      },
      error: (err) => {
        this.initiatingPayment = false;
        console.error('Erreur initiation paiement:', err);
        alert('Error initiating subscription. Please try again.');
      }
    });
  }

  private handleSubscriptionReturn(
    paymentId: string,
    paymentRef: string,
    transactionId?: string
  ): void {
    this.subscriptionService.confirmPayment(paymentId, paymentRef, transactionId).subscribe({
      next: (res) => {
        if (res.success) {
          const contactEmail = localStorage.getItem('pending_contact_email') || '';
          const contactName  = localStorage.getItem('pending_contact_name') || contactEmail;

          localStorage.removeItem('pending_contact_email');
          localStorage.removeItem('pending_contact_name');
          localStorage.removeItem('pending_payment_id');
          localStorage.removeItem('pending_payment_ref');

          alert(`✅ Subscription activated! ${res.daysRemaining ?? ''} days remaining.`);

          if (contactEmail) {
            setTimeout(() => this._openConversation(contactEmail, contactName), 500);
          }
        }
      },
      error: (err) => {
        console.error('Subscription confirmation error:', err);
        alert('❌ Payment could not be confirmed. Please contact support.');
      }
    });
  }

  // ══════════════════════════════════════════
  // CONVERSATIONS
  // ══════════════════════════════════════════

  loadConversations(): void {
    this.loading = true;
    this.messagerieService.getMyConversations().subscribe({
      next: (data) => {
        this.conversations = data;
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
              conv.unreadCount = messages.filter(m => m.senderEmail === otherEmail && !m.read).length;
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

    this.messagerieService.markConversationAsRead(otherEmail).subscribe({
      next: () => {
        conv.unreadCount = 0;
        setTimeout(() => this.loadConversations(), 500);
      },
      error: (err) => console.error('Erreur marquage lecture:', err)
    });
  }

  // ══════════════════════════════════════════
  // FICHIERS
  // ══════════════════════════════════════════

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

  // ══════════════════════════════════════════
  // ENVOI MESSAGE
  // ══════════════════════════════════════════

  sendMessage(): void {
    const hasText = this.newMessage.trim().length > 0;
    const hasFiles = this.selectedFiles.length > 0;

    if ((!hasText && !hasFiles) || !this.selectedConversation || this.sending) return;

    const otherEmail = this.getOtherEmail(this.selectedConversation);
    const content = this.newMessage.trim();

    if (!this.myEmail) { alert('❌ Your email is not defined. Please log in again.'); return; }
    if (!otherEmail) { alert('❌ Recipient email missing'); return; }
    if (otherEmail.toLowerCase() === this.myEmail.toLowerCase()) {
      alert('❌ You cannot send a message to yourself');
      return;
    }

    this.sending = true;
    this.newMessage = '';

    if (!hasFiles) {
      this.messagerieService.sendMessage(otherEmail, content).subscribe({
        next: (msg) => {
          this.messages.push({ ...msg, attachments: msg.attachments || [] });
          this.sending = false;
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(), 500);
        },
        error: (err) => {
          console.error('❌ Erreur envoi:', err);
          this.sending = false;
          this.newMessage = content;
          alert('❌ ' + (err.error?.error || err.error?.message || 'Unknown error'));
        }
      });
      return;
    }

    const formData = new FormData();
    formData.append('recipientEmail', otherEmail);
    formData.append('content', content || `📎 ${this.selectedFiles.length} fichier(s) joint(s)`);
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
          this.messages.push({ ...data.message, attachments: data.message.attachments || [] });
          this.selectedFiles = [];
          this.shouldScroll = true;
          setTimeout(() => this.loadConversations(), 400);
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
      alert('Network error. Please check your connection.');
    };

    xhr.send(formData);
  }

  // ══════════════════════════════════════════
  // IMAGES / FICHIERS
  // ══════════════════════════════════════════

  getBlobUrl(attachmentId: number): string {
    if (this.blobUrlCache.has(attachmentId)) return this.blobUrlCache.get(attachmentId)!;
    this.blobUrlCache.set(attachmentId, '');
    const token = localStorage.getItem('auth_token') || '';
    this.http.get(`${this.API}/attachment/${attachmentId}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => { this.blobUrlCache.set(attachmentId, window.URL.createObjectURL(blob)); },
      error: () => this.blobUrlCache.delete(attachmentId)
    });
    return '';
  }

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

  openImagePreview(att: MessageAttachment): void { this.previewAtt = att; }
  closeImagePreview(): void { this.previewAtt = null; }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

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
    return conv.lastMessage.length > 35 ? conv.lastMessage.substring(0, 35) + '...' : conv.lastMessage;
  }

  isViewed(conv: Conversation): boolean {
    return conv.senderEmail === this.myEmail ? conv.senderViewed : conv.partnerViewed;
  }

  isImageFile(fileType: string): boolean { return fileType?.startsWith('image/') ?? false; }

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
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}