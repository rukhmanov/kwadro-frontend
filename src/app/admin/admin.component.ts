import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class AdminComponent implements OnInit, OnDestroy {
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
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
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
      }
    });

    this.socket.on('message', (message: any) => {
      if (this.selectedChatSession) {
        // Проверяем, относится ли сообщение к выбранной сессии
        // Сообщение содержит sessionId в payload или в session
        const messageSessionId = message.sessionId || message.session?.sessionId;
        if (messageSessionId === this.selectedChatSession.sessionId) {
          this.chatMessages.push(message);
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

  loadChatSessions() {
    this.apiService.get<any[]>('/chat/sessions').subscribe((sessions) => {
      this.chatSessions = sessions || [];
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
    });
  }

  sendAdminMessage() {
    if (this.adminMessage.trim() && this.selectedChatSession) {
      this.socket?.emit('admin-message', {
        sessionId: this.selectedChatSession.sessionId,
        message: this.adminMessage
      });
      this.adminMessage = '';
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
