import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../services/auth.service';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { NewsService } from '../services/news.service';
import { ApiService } from '../services/api.service';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
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
  
  productForm: any = {
    mainImageFile: null,
    additionalImagesFiles: [],
    mainImagePreview: null,
    additionalImagesPreview: [],
    videoFile: null,
    videoPreview: null
  };
  newsForm: any = {
    imageFile: null,
    imagePreview: null
  };
  categoryForm: any = {
    imageFile: null,
    imagePreview: null
  };
  
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
    this.productForm = {
      mainImageFile: null,
      additionalImagesFiles: [],
      mainImagePreview: null,
      additionalImagesPreview: [],
      videoFile: null,
      videoPreview: null
    };
    this.newsForm = {
      imageFile: null,
      imagePreview: null
    };
    this.categoryForm = {
      imageFile: null,
      imagePreview: null
    };
    this.editingProduct = null;
    this.editingNews = null;
    this.editingCategory = null;
  }

  // Image handlers for products
  onMainImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.productForm.mainImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productForm.mainImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearMainImage() {
    this.productForm.mainImageFile = null;
    this.productForm.mainImagePreview = null;
  }

  onAdditionalImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.productForm.additionalImagesFiles = [...(this.productForm.additionalImagesFiles || []), ...files];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (!this.productForm.additionalImagesPreview) {
            this.productForm.additionalImagesPreview = [];
          }
          this.productForm.additionalImagesPreview.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeAdditionalImage(index: number) {
    this.productForm.additionalImagesFiles.splice(index, 1);
    this.productForm.additionalImagesPreview.splice(index, 1);
  }

  // Image handlers for news
  onNewsImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newsForm.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newsForm.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearNewsImage() {
    this.newsForm.imageFile = null;
    this.newsForm.imagePreview = null;
  }

  // Image handlers for categories
  onCategoryImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.categoryForm.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.categoryForm.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearCategoryImage() {
    this.categoryForm.imageFile = null;
    this.categoryForm.imagePreview = null;
  }

  // Video handler for products
  onVideoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.productForm.videoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productForm.videoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearVideo() {
    this.productForm.videoFile = null;
    this.productForm.videoPreview = null;
  }

  // Products
  saveProduct() {
    const formData = new FormData();
    
    // Извлекаем ключи из URL, если они есть (при редактировании)
    let imageKey = this.productForm.image;
    let imagesKeys = this.productForm.images;
    let videoKey = this.productForm.video;
    
    if (imageKey && (imageKey.startsWith('http://') || imageKey.startsWith('https://'))) {
      // Извлекаем ключ из URL: https://s3.twcstorage.ru/bucket/folder/file.ext -> folder/file.ext
      const parts = imageKey.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        imageKey = parts.slice(bucketIndex + 1).join('/');
      } else {
        imageKey = parts.slice(-2).join('/');
      }
    }
    
    if (imagesKeys && Array.isArray(imagesKeys)) {
      imagesKeys = imagesKeys.map((img: string) => {
        if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
          const parts = img.split('/');
          const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
          if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
            return parts.slice(bucketIndex + 1).join('/');
          } else {
            return parts.slice(-2).join('/');
          }
        }
        return img;
      });
    }

    if (videoKey && (videoKey.startsWith('http://') || videoKey.startsWith('https://'))) {
      const parts = videoKey.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        videoKey = parts.slice(bucketIndex + 1).join('/');
      } else {
        videoKey = parts.slice(-2).join('/');
      }
    }
    
    // Добавляем текстовые поля
    formData.append('product', JSON.stringify({
      name: this.productForm.name,
      description: this.productForm.description,
      price: this.productForm.price,
      oldPrice: this.productForm.oldPrice,
      engine: this.productForm.engine,
      power: this.productForm.power,
      stock: this.productForm.stock,
      categoryId: this.productForm.categoryId,
      image: imageKey, // Ключ изображения (или null, если новое загружается)
      images: imagesKeys, // Ключи дополнительных изображений
      video: videoKey // Ключ видео (или null, если новое загружается)
    }));

    // Добавляем главное изображение, если выбрано
    if (this.productForm.mainImageFile) {
      formData.append('images', this.productForm.mainImageFile);
    }

    // Добавляем дополнительные изображения
    if (this.productForm.additionalImagesFiles && this.productForm.additionalImagesFiles.length > 0) {
      this.productForm.additionalImagesFiles.forEach((file: File) => {
        formData.append('images', file);
      });
    }

    // Добавляем видео, если оно есть
    if (this.productForm.videoFile) {
      formData.append('video', this.productForm.videoFile);
    }

    if (this.editingProduct) {
      this.productsService.updateProduct(this.editingProduct.id, formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.productsService.createProduct(formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editProduct(product: any) {
    this.editingProduct = product;
    this.productForm = { 
      ...product,
      mainImageFile: null,
      additionalImagesFiles: [],
      mainImagePreview: null,
      additionalImagesPreview: [],
      videoFile: null,
      videoPreview: null
    };
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
    const formData = new FormData();
    
    // Извлекаем ключ из URL, если он есть (при редактировании)
    let imageKey = this.newsForm.image;
    if (imageKey && (imageKey.startsWith('http://') || imageKey.startsWith('https://'))) {
      const parts = imageKey.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        imageKey = parts.slice(bucketIndex + 1).join('/');
      } else {
        imageKey = parts.slice(-2).join('/');
      }
    }
    
    // Добавляем текстовые поля
    formData.append('news', JSON.stringify({
      title: this.newsForm.title,
      content: this.newsForm.content,
      image: imageKey // Ключ изображения (или null, если новое загружается)
    }));

    // Добавляем изображение, если выбрано
    if (this.newsForm.imageFile) {
      formData.append('image', this.newsForm.imageFile);
    }

    if (this.editingNews) {
      this.newsService.updateNews(this.editingNews.id, formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.newsService.createNews(formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editNews(news: any) {
    this.editingNews = news;
    this.newsForm = { 
      ...news,
      imageFile: null,
      imagePreview: null
    };
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
    const formData = new FormData();
    
    // Извлекаем ключ из URL, если он есть (при редактировании)
    let imageKey = this.categoryForm.image;
    if (imageKey && (imageKey.startsWith('http://') || imageKey.startsWith('https://'))) {
      const parts = imageKey.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        imageKey = parts.slice(bucketIndex + 1).join('/');
      } else {
        imageKey = parts.slice(-2).join('/');
      }
    }
    
    // Добавляем текстовые поля
    formData.append('category', JSON.stringify({
      name: this.categoryForm.name,
      description: this.categoryForm.description,
      image: imageKey // Ключ изображения (или null, если новое загружается)
    }));

    // Добавляем изображение, если выбрано
    if (this.categoryForm.imageFile) {
      formData.append('image', this.categoryForm.imageFile);
    }

    if (this.editingCategory) {
      this.categoriesService.updateCategory(this.editingCategory.id, formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.categoriesService.createCategory(formData).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editCategory(category: any) {
    this.editingCategory = category;
    this.categoryForm = { 
      ...category,
      imageFile: null,
      imagePreview: null
    };
  }

  deleteCategory(id: number) {
    if (confirm('Удалить категорию?')) {
      this.categoriesService.deleteCategory(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  onCategoryDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.categories, event.previousIndex, event.currentIndex);
    
    // Обновляем порядок категорий
    const categoryOrders = this.categories.map((category, index) => ({
      id: category.id,
      order: index
    }));
    
    this.categoriesService.updateCategoryOrder(categoryOrders).subscribe({
      next: () => {
        console.log('Порядок категорий обновлен');
      },
      error: (err) => {
        console.error('Ошибка при обновлении порядка категорий:', err);
        // Восстанавливаем исходный порядок при ошибке
        this.loadData();
      }
    });
  }
}
