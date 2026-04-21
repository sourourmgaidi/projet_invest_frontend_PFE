import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { NotificationBellComponent } from '../../../shared/notification-bell/notification-bell.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessagerieService } from '../../../core/services/messagerie.service';
import { ChatbotWidgetComponent } from '../../../shared/Agents/chatbot-widget.component';

@Component({
  selector: 'app-economic-partner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, NotificationBellComponent,ChatbotWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  collaborationCount = 0;
  unreadCount = 0;

  private http = inject(HttpClient);
  private messagerieService = inject(MessagerieService);

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadCollaborationCount();
    this.loadUnreadCount();
  }

  loadCollaborationCount(): void {
    this.http.get<any[]>('http://localhost:8089/api/collaboration-services/approved',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        this.collaborationCount = data.length;
      },
      error: () => {
        this.collaborationCount = 0;
      }
    });
  }

  loadUnreadCount(): void {
    this.messagerieService.getUnreadMessages().subscribe({
      next: (res) => {
        this.unreadCount = res.unreadCount;
      },
      error: () => {
        this.unreadCount = 0;
      }
    });
  }
}