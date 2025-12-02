import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { NewsService } from '../services/news.service';
import { ApiService } from '../services/api.service';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessagesView') chatMessagesView?: ElementRef;
  
  activeTab: 'products' | 'news' | 'categories' | 'chats' = 'products';
  products: any[] = [];
  news: any[] = [];
  categories: any[] = [];
  chatSessions: any[] = [];
  selectedChatSession: any = null;
  chatMessages: any[] = [];
  adminMessage = '';
  
  productForm: any = {};
  newsForm: any = {};
  categoryForm: any = {};
  
  editingProduct: any = null;
  editingNews: any = null;
  editingCategory: any = null;
  
  private socket?: Socket;
  private shouldScrollToBottom = false;

  constructor(
    private authService: AuthService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private newsService: NewsService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
    this.initChatSocket();
    // Закрытие чата по Escape
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.selectedChatSession) {
      this.closeChatSession();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom() {
    if (this.chatMessagesView) {
      const element = this.chatMessagesView.nativeElement;
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 0);
    }
  }

  initChatSocket() {
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      console.log('Admin connected to chat');
    });

    this.socket.on('new-chat-session', (data: any) => {
      // Обновляем список сессий
      this.loadChatSessions();
      // Если это сообщение для текущей выбранной сессии, добавляем его
      if (this.selectedChatSession && data.sessionId === this.selectedChatSession.sessionId && data.message) {
        this.chatMessages.push(data.message);
        this.shouldScrollToBottom = true;
      }
    });

    this.socket.on('message', (message: any) => {
      if (this.selectedChatSession) {
        // Проверяем, относится ли сообщение к выбранной сессии
        // Сообщение содержит sessionId в payload или в session
        const messageSessionId = message.sessionId || message.session?.sessionId;
        if (messageSessionId === this.selectedChatSession.sessionId) {
          // Проверяем, нет ли уже этого сообщения (чтобы избежать дубликатов)
          const exists = this.chatMessages.some(m => 
            m.id === message.id || 
            (m.id === message.id && m.message === message.message && m.createdAt === message.createdAt)
          );
          if (!exists) {
            // Если есть временное сообщение с таким же текстом, заменяем его
            const tempIndex = this.chatMessages.findIndex(m => 
              m.id && m.id > 1000000000000 && // Временные ID - timestamp
              m.message === message.message &&
              m.username === 'Администратор'
            );
            if (tempIndex !== -1) {
              this.chatMessages[tempIndex] = message;
            } else {
              this.chatMessages.push(message);
            }
            // Прокручиваем вниз при получении нового сообщения
            this.shouldScrollToBottom = true;
          }
        }
      }
    });
  }

  loadData() {
    this.productsService.getProducts().subscribe(products => {
      this.products = products;
    });
    this.newsService.getNews().subscribe(news => {
      this.news = news;
    });
    this.categoriesService.getCategories().subscribe(categories => {
      this.categories = categories;
    });
    if (this.activeTab === 'chats') {
      this.loadChatSessions();
    }
  }

  get unreadChatsCount(): number {
    return this.chatSessions.filter(s => s.hasUnreadMessages).length;
  }

  getChatTitle(session: any): string {
    const index = this.chatSessions.findIndex(s => s.id === session.id || s.sessionId === session.sessionId);
    return index !== -1 ? `Чат #${this.chatSessions.length - index}` : 'Чат';
  }

  loadChatSessions() {
    this.apiService.get<any[]>('/chat/sessions').subscribe((sessions) => {
      // Сортируем по дате обновления: новые вверху, старые внизу
      this.chatSessions = (sessions || []).sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA; // Обратная сортировка - новые вверху
      });
    });
  }

  setTab(tab: 'products' | 'news' | 'categories' | 'chats') {
    this.activeTab = tab;
    this.resetForms();
    if (tab === 'chats') {
      this.loadChatSessions();
    }
  }

  selectChatSession(session: any) {
    this.selectedChatSession = session;
    this.chatMessages = [];
    this.apiService.get<any[]>(`/chat/sessions/${session.sessionId}/messages`).subscribe((messages) => {
      this.chatMessages = messages || [];
      // Помечаем как прочитанную
      this.apiService.put(`/chat/sessions/${session.sessionId}/read`, {}).subscribe(() => {
        session.hasUnreadMessages = false;
      });
      // Прокручиваем вниз после загрузки сообщений
      this.shouldScrollToBottom = true;
    });
  }

  closeChatSession() {
    this.selectedChatSession = null;
    this.chatMessages = [];
    this.adminMessage = '';
  }

  sendAdminMessage() {
    if (this.adminMessage.trim() && this.selectedChatSession) {
      const messageText = this.adminMessage.trim();
      
      // Оптимистичное обновление - добавляем сообщение сразу
      const tempMessage = {
        id: Date.now(), // Временный ID
        username: 'Администратор',
        message: messageText,
        isAdmin: true,
        createdAt: new Date().toISOString(),
        sessionId: this.selectedChatSession.sessionId
      };
      this.chatMessages.push(tempMessage);
      
      // Очищаем поле ввода
      this.adminMessage = '';
      
      // Прокручиваем вниз после добавления сообщения
      this.shouldScrollToBottom = true;
      
      // Отправляем на сервер
      this.socket?.emit('admin-message', {
        sessionId: this.selectedChatSession.sessionId,
        message: messageText
      });
    }
  }

  resetForms() {
    this.productForm = {};
    this.newsForm = {};
    this.categoryForm = {};
    this.editingProduct = null;
    this.editingNews = null;
    this.editingCategory = null;
  }

  // Products
  saveProduct() {
    if (this.editingProduct) {
      this.productsService.updateProduct(this.editingProduct.id, this.productForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.productsService.createProduct(this.productForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editProduct(product: any) {
    this.editingProduct = product;
    this.productForm = { ...product };
  }

  deleteProduct(id: number) {
    if (confirm('Удалить товар?')) {
      this.productsService.deleteProduct(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  // News
  saveNews() {
    if (this.editingNews) {
      this.newsService.updateNews(this.editingNews.id, this.newsForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.newsService.createNews(this.newsForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editNews(news: any) {
    this.editingNews = news;
    this.newsForm = { ...news };
  }

  deleteNews(id: number) {
    if (confirm('Удалить новость?')) {
      this.newsService.deleteNews(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  // Categories
  saveCategory() {
    if (this.editingCategory) {
      this.categoriesService.updateCategory(this.editingCategory.id, this.categoryForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.categoriesService.createCategory(this.categoryForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editCategory(category: any) {
    this.editingCategory = category;
    this.categoryForm = { ...category };
  }

  deleteCategory(id: number) {
    if (confirm('Удалить категорию?')) {
      this.categoriesService.deleteCategory(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
