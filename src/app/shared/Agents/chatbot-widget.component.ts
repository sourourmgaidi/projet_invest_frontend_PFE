import {
  Component, OnDestroy, OnInit,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { Role } from '../models/user.model';
import { RecommendationAgentComponent } from './recommendation-agent/recommendation-agent.component';

interface ChatMessage {
  id: number;
  role: 'user' | 'bot' | 'system';
  text: string;
  sources?: string[];
  loading?: boolean;
  timestamp: Date;
  quickReplies?: string[];
}

interface QuickAnswer {
  keywords: string[];
  answer: string;
  category: string;
  label: string;
  icon: string;
}

const QUICK_ANSWERS: QuickAnswer[] = [
  {
    label: 'Investment incentives', icon: '💰',
    keywords: ['incentive', 'advantage', 'benefit', 'avantage', 'incentives'],
    category: 'Incentives',
    answer: `**Investment Incentives in Tunisia**\n\nTunisia offers several key incentives:\n• **Tax exemption** on profits for the first 10 years in development zones\n• **Customs duty exemption** on imported equipment\n• **Full profit repatriation** guaranteed for foreign investors\n• **VAT suspension** on locally purchased equipment\n• **Reduced corporate tax** (10%) for exporting companies`
  },
  {
    label: 'Free economic zones', icon: '🏭',
    keywords: ['free zone', 'zone franche', 'economic zone', 'export zone'],
    category: 'Free Zones',
    answer: `**Free Economic Zones in Tunisia**\n\nMain free zones:\n• **Bizerte Economic Activity Zone** — industrial & logistics\n• **Zarzis** — export-oriented manufacturing\n• **Tunis Financial Harbour** — financial services\n\n**Key benefits:**\n• 0% corporate tax for 10 years\n• Full customs exemption\n• No restrictions on profit transfer\n• Simplified administrative procedures`
  },
  {
    label: 'Company registration', icon: '📋',
    keywords: ['register', 'registration', 'create company', 'set up', 'incorporate'],
    category: 'Company Registration',
    answer: `**Registering a Company in Tunisia**\n\n**Required steps:**\n1. Choose legal form (SARL, SA, Branch...)\n2. Deposit minimum capital at a Tunisian bank\n3. Register at the **Commercial Registry (RNE)**\n4. Obtain tax identification number\n5. Register with social security (CNSS)\n\n**One-Stop Shop:** The API offers a single window to complete all steps.\n\n⏱ Average time: **5–10 business days**`
  },
  {
    label: 'Taxation & rates', icon: '📊',
    keywords: ['tax', 'taxation', 'corporate tax', 'impôt', 'fiscal'],
    category: 'Taxation',
    answer: `**Taxation for Foreign Investors in Tunisia**\n\n| Type | Rate |\n|------|------|\n| Corporate tax (standard) | 25% |\n| Exporting companies | 10% |\n| Liberal professions | 25% |\n| New startups (5 yrs) | 0% |\n\n**Tax treaties:** Tunisia has signed treaties with 50+ countries to avoid double taxation.`
  },
  {
    label: 'Profit repatriation', icon: '💸',
    keywords: ['repatriate', 'repatriation', 'transfer profit', 'transfer funds'],
    category: 'Capital Repatriation',
    answer: `**Profit & Capital Repatriation in Tunisia**\n\nForeign investors are **guaranteed by law** (Investment Law 2016-71) the right to:\n• Freely transfer **dividends and profits**\n• Repatriate **initial capital** upon divestment\n• Transfer **proceeds from asset sales**\n\n**Condition:** Investment must be funded through foreign currency declared to the Central Bank.\n\n✅ No restriction on the amount transferred.`
  },
  {
    label: 'Restricted sectors', icon: '🚫',
    keywords: ['sector', 'restricted', 'prohibited', 'forbidden'],
    category: 'Restricted Sectors',
    answer: `**Restricted Sectors for Foreign Investment**\n\n**Fully restricted (100% local ownership):**\n• Coastal fishing\n• Domestic air & maritime transport\n• Some agricultural land activities\n\n**Partially restricted (requires authorization):**\n• Banking & financial services\n• Telecommunications\n• Energy distribution\n• Healthcare\n\n**Fully open:** Manufacturing, tourism, IT, services, free zones.`
  },
  {
    label: 'Investment protection', icon: '🛡️',
    keywords: ['guarantee', 'protection', 'nationalization', 'expropriation'],
    category: 'Investment Protection',
    answer: `**Investment Guarantees in Tunisia**\n\nThe 2016 Investment Law provides strong protections:\n\n• **Anti-expropriation clause** — no nationalization without fair compensation\n• **Most-favored-nation treatment** for foreign investors\n• **International arbitration** access (ICSID, ICC)\n• **Bilateral Investment Treaties** with 55+ countries\n• **Stability clause** — tax rules frozen for 10 years after approval`
  },
  {
    label: 'Development zones', icon: '🗺️',
    keywords: ['development zone', 'regional', 'underdeveloped'],
    category: 'Regional Development',
    answer: `**Regional Development Zone Advantages**\n\n**Category A zones** (most disadvantaged):\n• 10-year full tax exemption\n• 25% investment subsidy from the state\n\n**Category B zones:**\n• 5-year tax exemption\n• 15% investment subsidy\n\n**Common benefits:**\n• Social contributions paid by the state (5 years)\n• Priority access to public land\n• Fast-track administrative processing`
  },
  {
    label: 'API one-stop shop', icon: '🏛️',
    keywords: ['api', 'investment promotion', 'one stop shop', 'guichet unique'],
    category: 'API & One-Stop Shop',
    answer: `**Investment Promotion Agency (API)**\n\nThe API is Tunisia's main body for foreign investment:\n\n**Services offered:**\n• One-stop shop for company registration\n• Investment project assistance\n• Legal & administrative guidance\n• Connection with local partners\n\n**Contact:**\n📍 63, Rue de Syrie, 1002 Tunis\n📞 +216 71 846 000\n🌐 www.investintunisia.tn`
  },
  {
    label: 'Exporting companies', icon: '📦',
    keywords: ['exporting company', 'totally exporting', 'offshore'],
    category: 'Exporting Companies',
    answer: `**Totally vs Partially Exporting Companies**\n\n**Totally Exporting (Offshore):**\n• 100% of production exported\n• Full customs & tax exemptions\n• Free profit repatriation\n\n**Partially Exporting (Onshore):**\n• At least 10% of turnover exported\n• Reduced corporate tax (10%)\n• Partial customs advantages`
  }
];

const FOLLOW_UPS: Record<string, string[]> = {
  'Incentives':            ['Tell me about free zones', 'What are tax rates?', 'How to repatriate profits?'],
  'Free Zones':            ['Which zone is best for manufacturing?', 'How to register in a free zone?', 'What are tax benefits?'],
  'Company Registration':  ['What documents are needed?', 'What is the minimum capital?', 'How long does it take?'],
  'Taxation':              ['Are there tax treaties?', 'What about VAT?', 'Incentives for startups?'],
  'Capital Repatriation':  ['What about dividends?', 'How is capital guaranteed?', 'Any restrictions on amounts?'],
  'Restricted Sectors':    ['What sectors are fully open?', 'How to get authorization?', 'Tell me about free zones'],
  'Exporting Companies':   ['What are the tax benefits?', 'How to qualify as offshore?', 'Tell me about free zones'],
  'API & One-Stop Shop':   ['How long does registration take?', 'What documents are needed?', 'What is minimum capital?'],
  'Investment Protection': ['Which countries have treaties?', 'How does arbitration work?', 'What about expropriation?'],
  'Regional Development':  ['Which are Category A zones?', 'What subsidies are available?', 'How to apply for benefits?'],
  'default':               ['What are investment incentives?', 'How to register a company?', 'What are the free zones?']
};

const RECO_ALLOWED: Role[] = [
  Role.INVESTOR,
  Role.TOURIST,
  Role.PARTNER,
  Role.INTERNATIONAL_COMPANY
];

// Roles that can use the Legal Assistant (everyone EXCEPT tourists)
const LEGAL_ALLOWED: Role[] = [
  Role.INVESTOR,
  Role.PARTNER,
  Role.INTERNATIONAL_COMPANY,
  Role.ADMIN,
  Role.LOCAL_PARTNER
];

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RecommendationAgentComponent],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css']
})
export class ChatbotWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesEl') messagesEl!: ElementRef;
  @ViewChild('inputEl')    inputEl!: ElementRef;

  isOpen       = false;
  activeTab: 'legal' | 'reco' = 'legal';
  canUseReco   = false;
  canUseLegal  = true;   // ← NEW: tourists cannot use this tab
  isLoading    = false;
  userInput    = '';
  showFaqPanel = false;
  messages: ChatMessage[]   = [];
  contextualSuggestions: string[] = [];
  unreadCount  = 0;

  readonly quickAnswers = QUICK_ANSWERS;

  private msgIdCounter = 0;
  private shouldScroll = false;
  private readonly API_URL = 'http://localhost:8089/api/chatbot/ask';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.canUseReco  = role ? RECO_ALLOWED.includes(role) : false;
    this.canUseLegal = role ? LEGAL_ALLOWED.includes(role) : true;

    // If tourist: start directly on reco tab, skip legal tab
    if (role === Role.TOURIST) {
      this.activeTab = 'reco';
    }

    this.loadHistory();
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.activeTab === 'legal') {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  setTab(tab: 'legal' | 'reco'): void {
    this.activeTab = tab;
    if (tab === 'legal') {
      this.showFaqPanel = false;
      this.shouldScroll = true;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      // Only show FAQ panel on legal tab, and only if user can use legal
      if (this.activeTab === 'legal' && this.messages.length > 0 && this.canUseLegal) {
        this.showFaqPanel = true;
      }
      this.shouldScroll = true;
      setTimeout(() => this.inputEl?.nativeElement?.focus(), 350);
    } else {
      this.showFaqPanel = false;
    }
  }

  closeFaqPanel(): void {
    this.showFaqPanel = false;
    this.shouldScroll = true;
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 200);
  }

  private loadHistory(): void {
    // Only load chat history if user can use the legal assistant
    if (!this.canUseLegal) return;

    const token = this.authService.getToken() || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8089/api/chatbot/history', { headers }).subscribe({
      next: (data) => {
        this.messages = data.map(msg => ({
          id: msg.id,
          role: msg.sender === 'USER' ? 'user' : 'bot',
          text: msg.message,
          timestamp: new Date(msg.timestamp)
        }));
        this.shouldScroll = true;
      },
      error: () => {}
    });
  }

  clearHistory(): void {
    this.messages = [];
    this.contextualSuggestions = [];
    this.unreadCount = 0;
    this.showFaqPanel = false;
  }

  selectFaq(qa: QuickAnswer): void {
    this.showFaqPanel = false;
    this.dispatchMessage(qa.label);
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;
    this.userInput = '';
    this.resetInputHeight();
    this.dispatchMessage(text);
  }

  sendQuickReply(text: string): void { this.dispatchMessage(text); }
  useSuggestion(text: string): void  { this.dispatchMessage(text); }

  private dispatchMessage(text: string): void {
    if (this.isLoading) return;
    this.showFaqPanel = false;
    this.maybeAddDateSeparator();
    this.addMessage({ role: 'user', text });
    const quick = this.matchQuickAnswer(text);
    if (quick) {
      setTimeout(() => this.addBotAnswer(quick.answer, [], quick.category), 300);
      return;
    }
    this.callBackendAI(text);
  }

  private matchQuickAnswer(text: string): QuickAnswer | null {
    const lower = text.toLowerCase();
    return QUICK_ANSWERS.find(qa =>
      qa.keywords.some(kw => lower.includes(kw)) ||
      lower.includes(qa.label.toLowerCase())
    ) || null;
  }

  private callBackendAI(text: string): void {
    this.isLoading = true;
    const placeholder = this.addMessage({ role: 'bot', text: '', loading: true });
    this.shouldScroll = true;
    const token = this.authService.getToken() || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post<{ answer: string; sources: string[] }>(
      this.API_URL, { question: text }, { headers }
    ).subscribe({
      next: (res) => {
        this.replaceLoadingMsg(placeholder, res.answer, res.sources || [], 'default');
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.replaceLoadingMsg(
          placeholder,
          'I\'m sorry, the AI service is temporarily unavailable. Please try again or choose a topic from the FAQ.',
          [], 'default'
        );
        this.isLoading = false;
        this.shouldScroll = true;
      }
    });
  }

  private addMessage(partial: Partial<ChatMessage>): ChatMessage {
    const msg: ChatMessage = {
      id: ++this.msgIdCounter, role: 'user',
      text: '', timestamp: new Date(), ...partial
    };
    this.messages.push(msg);
    this.shouldScroll = true;
    return msg;
  }

  private addBotAnswer(text: string, sources: string[], category: string): void {
    const followUps = FOLLOW_UPS[category] || FOLLOW_UPS['default'];
    this.addMessage({ role: 'bot', text, sources, loading: false, quickReplies: followUps.slice(0, 3) });
    this.contextualSuggestions = followUps;
    if (!this.isOpen) this.unreadCount++;
    this.shouldScroll = true;
  }

  private replaceLoadingMsg(placeholder: ChatMessage, text: string, sources: string[], category: string): void {
    const idx = this.messages.indexOf(placeholder);
    if (idx === -1) return;
    const followUps = FOLLOW_UPS[category] || FOLLOW_UPS['default'];
    this.messages[idx] = { ...placeholder, text, sources, loading: false, quickReplies: followUps.slice(0, 3) };
    this.contextualSuggestions = followUps;
    if (!this.isOpen) this.unreadCount++;
  }

  private maybeAddDateSeparator(): void {
    const today   = new Date();
    const lastMsg = this.messages.filter(m => m.role !== 'system').slice(-1)[0];
    if (!lastMsg || !this.sameDay(lastMsg.timestamp, today)) {
      this.addMessage({ role: 'system', text: this.formatDate(today) });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputChange(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 90) + 'px';
  }

  private resetInputHeight(): void {
    setTimeout(() => {
      if (this.inputEl?.nativeElement) this.inputEl.nativeElement.style.height = 'auto';
    }, 0);
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^\|(.+)\|$/gm, (_: string, row: string) => {
        const cells = row.split('|').map((c: string) => c.trim());
        return '<tr>' + cells.map((c: string) => `<td>${c}</td>`).join('') + '</tr>';
      });
    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m: string) => `<ul>${m}</ul>`);
    html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (m: string) => `<table>${m}</table>`);
    html = html.split('\n\n')
      .map((p: string) => p.trim()).filter((p: string) => p)
      .map((p: string) => (p.startsWith('<ul') || p.startsWith('<table') || p.startsWith('<li')) ? p : `<p>${p}</p>`)
      .join('');
    return html;
  }

  getUserMsgCount(): number { return this.messages.filter(m => m.role === 'user').length; }
  formatTime(d: Date): string { return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }); }
  formatDate(d: Date): string { return new Date(d).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' }); }
  sameDay(a: Date, b: Date): boolean { return new Date(a).toDateString() === new Date(b).toDateString(); }
  shortSrc(src: string): string { return src.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || src; }

  private scrollToBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}