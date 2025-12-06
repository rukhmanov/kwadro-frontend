import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../services/auth.service';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { NewsService } from '../services/news.service';
import { ApiService } from '../services/api.service';
import { EditDrawerService } from '../services/edit-drawer.service';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessagesView') chatMessagesView?: ElementRef;
  
  activeTab: 'categories' | 'settings' | 'chats' = 'categories';
  products: any[] = [];
  news: any[] = [];
  categories: any[] = [];
  chatSessions: any[] = [];
  selectedChatSession: any = null;
  chatMessages: any[] = [];
  adminMessage = '';
  
  productForm: any = {
    images: [], // Массив объектов {url: string, file: File | null, isNew: boolean, isRemoved: boolean}
    videoFile: null,
    videoPreview: null,
    removedVideo: false,
    specifications: []
  };
  categorySpecifications: string[] = [];
  newsForm: any = {
    imageFile: null,
    imagePreview: null
  };
  categoryForm: any = {
    imageFile: null,
    imagePreview: null
  };
  backgroundImageFile: File | null = null;
  backgroundImagePreview: string | null = null;
  currentBackgroundImage: string | null = null;
  
  editingProduct: any = null;
  editingNews: any = null;
  editingCategory: any = null;
  
  private socket?: Socket;
  private shouldScrollToBottom = false;
  private _cachedImages: any[] = [];

  constructor(
    private authService: AuthService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private newsService: NewsService,
    private apiService: ApiService,
    private editDrawerService: EditDrawerService,
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
    
    // Подписка на изменения роута для обновления данных после сохранения через drawer
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.router.url === '/admin') {
        this.loadData();
      }
    });
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
    this.socket = io(environment.apiUrl);
    
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
    // Товары и новости больше не загружаются в админ-панели
    // Они управляются через карточки на страницах каталога и новостей
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

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : '';
  }

  getPlaceholderImage(): string {
    // Используем data URI для placeholder, чтобы избежать 404 ошибок
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('data:image')) {
      // Находим соответствующий объект изображения в массиве
      const originalSrc = img.getAttribute('data-original-src') || img.src;
      const imageObj = this.productForm.images?.find((i: any) => i.url === originalSrc);
      
      if (imageObj) {
        // Помечаем изображение как удаленное, если оно битое
        imageObj.isRemoved = true;
        // Скрываем элемент
        const imageItem = img.closest('.image-item');
        if (imageItem) {
          (imageItem as HTMLElement).style.display = 'none';
        }
      } else {
        // Если не нашли в массиве, просто заменяем на placeholder для отображения
        img.src = this.getPlaceholderImage();
      }
    }
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

  setTab(tab: 'categories' | 'settings' | 'chats') {
    this.activeTab = tab;
    this.resetForms();
    if (tab === 'chats') {
      this.loadChatSessions();
    } else if (tab === 'settings') {
      this.loadBackgroundImage();
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
      images: [],
      videoFile: null,
      videoPreview: null,
      removedVideo: false,
      specifications: []
    };
    this.categorySpecifications = [];
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
  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      // Инициализируем массив, если его нет
      if (!this.productForm.images) {
        this.productForm.images = [];
      }
      
      files.forEach((file) => {
        // Проверяем, что это изображение
        if (!file.type.startsWith('image/')) {
          console.warn('Выбранный файл не является изображением:', file.name);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const result = e.target.result;
          if (result) {
            // Создаем объект изображения с сохранением ссылки на файл
            const imageObj: any = {
              url: result,
              file: file, // Сохраняем ссылку на файл - важно для загрузки
              isNew: true,
              isRemoved: false
            };
            this.productForm.images.push(imageObj);
            // Обновляем кэш после добавления нового изображения
            this.getAllImages();
          }
        };
        reader.onerror = (error) => {
          console.error('Ошибка при чтении файла:', error);
        };
        reader.readAsDataURL(file);
      });
    }
    // Очищаем input для возможности повторной загрузки тех же файлов
    event.target.value = '';
  }

  getAllImages(): any[] {
    if (!this.productForm.images) {
      this._cachedImages = [];
      return [];
    }
    const placeholderImage = this.getPlaceholderImage();
    const filtered = this.productForm.images.filter((img: any) => {
      // Исключаем удаленные изображения
      if (img.isRemoved) return false;
      // Исключаем пустые URL
      if (!img.url || img.url.trim() === '') return false;
      // Исключаем только placeholder SVG изображения, но НЕ исключаем data:image/jpeg, data:image/png (это preview новых файлов)
      if (img.url === placeholderImage || img.url.includes('data:image/svg+xml')) {
        return false;
      }
      // Разрешаем data:image/jpeg, data:image/png и т.д. (это preview новых загруженных файлов)
      return true;
    });
    // Кэшируем результат для стабильности drag and drop (это ссылки на объекты из productForm.images)
    this._cachedImages = filtered;
    return filtered;
  }

  removeImage(index: number) {
    if (confirm('Удалить это изображение?')) {
      // Получаем видимые изображения
      const visibleImages = this.getAllImages();
      const imageToRemove = visibleImages[index];
      
      if (imageToRemove.isNew) {
        // Если это новое изображение, удаляем из массива
        const realIndex = this.productForm.images.indexOf(imageToRemove);
        if (realIndex !== -1) {
          this.productForm.images.splice(realIndex, 1);
        }
      } else {
        // Если это существующее изображение, помечаем как удаленное
        imageToRemove.isRemoved = true;
      }
      // Обновляем кэш после удаления
      this.getAllImages();
    }
  }

  onImagesDrop(event: CdkDragDrop<any[]>) {
    if (!this.productForm.images || event.previousIndex === event.currentIndex) return;
    
    // Получаем видимые изображения (это ссылки на объекты из productForm.images)
    const visibleImages = this.getAllImages();
    
    // Перемещаем элемент в видимом списке (перемещаем ссылки на объекты)
    moveItemInArray(visibleImages, event.previousIndex, event.currentIndex);
    
    // Обновляем исходный массив: заменяем видимые изображения на новые в правильном порядке
    // Сохраняем удаленные изображения в конце
    const removedImages = this.productForm.images.filter((img: any) => img.isRemoved);
    // Важно: сохраняем все свойства объектов (включая file и isNew) - это ссылки, так что свойства сохраняются
    this.productForm.images = [...visibleImages, ...removedImages];
    
    // Обновляем кэш
    this._cachedImages = visibleImages;
  }

  // TrackBy функция для оптимизации рендеринга
  trackByImage(index: number, item: any): any {
    return item.url || index;
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

  removeCurrentVideo() {
    if (confirm('Удалить видео?')) {
      this.productForm.video = null;
      this.productForm.removedVideo = true;
    }
  }

  // Функция для извлечения ключа из URL (убирает query string и нормализует)
  private extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    // Если это уже ключ (не начинается с http), возвращаем как есть
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }
    
    try {
      // Декодируем URL и убираем query string
      const decodedUrl = decodeURIComponent(url);
      const urlWithoutQuery = decodedUrl.split('?')[0].split('%3F')[0]; // Убираем ? и %3F (закодированный ?)
      
      // Извлекаем ключ из URL
      // Формат: https://s3.twcstorage.ru/1f48199c-parsifal-files/1f48199c-parsifal-files/products/file.ext
      // Нужно получить: products/file.ext
      const parts = urlWithoutQuery.split('/');
      
      // Ищем индекс части с bucket name (parsifal-files или twcstorage)
      const bucketIndex = parts.findIndex((part: string) => 
        part.includes('parsifal-files') || part.includes('twcstorage')
      );
      
      if (bucketIndex >= 0) {
        // Если нашли bucket, берем все после него
        // Но нужно пропустить дублирующуюся часть bucket name
        let startIndex = bucketIndex + 1;
        // Если следующая часть тоже содержит bucket name, пропускаем её
        if (parts[startIndex] && (parts[startIndex].includes('parsifal-files') || parts[startIndex].includes('twcstorage'))) {
          startIndex++;
        }
        if (startIndex < parts.length) {
          return parts.slice(startIndex).join('/');
        }
      }
      
      // Fallback: берем последние 2 части (обычно это folder/file.ext)
      if (parts.length >= 2) {
        return parts.slice(-2).join('/');
      }
      
      return null;
    } catch (e) {
      // Если декодирование не удалось, пробуем без декодирования
      const urlWithoutQuery = url.split('?')[0].split('%3F')[0];
      const parts = urlWithoutQuery.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        let startIndex = bucketIndex + 1;
        if (parts[startIndex] && (parts[startIndex].includes('parsifal-files') || parts[startIndex].includes('twcstorage'))) {
          startIndex++;
        }
        if (startIndex < parts.length) {
          return parts.slice(startIndex).join('/');
        }
      }
      if (parts.length >= 2) {
        return parts.slice(-2).join('/');
      }
      return null;
    }
  }

  // Функция для нормализации URL (для сравнения)
  private normalizeUrl(url: string): string {
    if (!url) return '';
    try {
      const decodedUrl = decodeURIComponent(url);
      return decodedUrl.split('?')[0].split('%3F')[0];
    } catch (e) {
      return url.split('?')[0].split('%3F')[0];
    }
  }

  // Products
  saveProduct() {
    const formData = new FormData();
    
    // Получаем все изображения (не удаленные) в правильном порядке после drag and drop
    const allImages = this.getAllImages();
    
    // Разделяем на существующие (с ключами) и новые (с файлами)
    // Важно: сохраняем порядок, установленный пользователем через drag and drop
    const existingImages: string[] = [];
    const newImageFiles: File[] = [];
    
    allImages.forEach((img: any) => {
      if (!img || img.isRemoved) {
        // Пропускаем удаленные изображения
        return;
      }
      
      // Проверяем, является ли изображение новым
      // Новое изображение имеет флаг isNew=true И файл
      // ИЛИ имеет data URI (preview нового файла) И файл
      const hasDataUri = img.url && img.url.startsWith('data:image/') && !img.url.includes('data:image/svg+xml');
      const isNewImage = (img.isNew === true) || (hasDataUri && img.file);
      
      if (isNewImage && img.file && img.file instanceof File) {
        // Новое изображение - добавляем файл (будет загружено и добавлено в конец)
        newImageFiles.push(img.file);
      } else if (img.url && !isNewImage) {
        // Существующее изображение - извлекаем ключ из URL
        const key = this.extractKeyFromUrl(img.url);
        if (key) {
          existingImages.push(key); // Сохраняем в правильном порядке
        }
      }
    });

    // Извлекаем ключ видео
    let videoKey = this.productForm.video;
    if (this.productForm.removedVideo) {
      videoKey = null;
    } else if (videoKey) {
      videoKey = this.extractKeyFromUrl(videoKey);
    }
    
    // Фильтруем характеристики - убираем пустые
    const validSpecifications = (this.productForm.specifications || []).filter(
      (spec: { name: string; value: string }) => spec.name && spec.value
    );

    // Добавляем текстовые поля
    // Важно: существующие изображения уже в правильном порядке (после drag and drop)
    // Новые изображения будут добавлены в конец после существующих
    formData.append('product', JSON.stringify({
      name: this.productForm.name,
      description: this.productForm.description,
      price: this.productForm.price,
      oldPrice: this.productForm.oldPrice,
      stock: this.productForm.stock,
      categoryId: this.productForm.categoryId,
      images: existingImages, // Ключи существующих изображений (в правильном порядке)
      video: videoKey,
      specifications: validSpecifications
    }));

    // Добавляем новые изображения как файлы (они будут добавлены в конец массива)
    if (newImageFiles.length > 0) {
      newImageFiles.forEach((file: File) => {
        // Проверяем, что это действительно File объект
        if (file instanceof File) {
          formData.append('images', file, file.name);
        } else {
          console.error('Ошибка: объект не является File:', file);
        }
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

  onCategoryChange() {
    if (this.productForm.categoryId) {
      this.loadCategorySpecifications(this.productForm.categoryId);
    } else {
      this.categorySpecifications = [];
    }
  }

  loadCategorySpecifications(categoryId: number) {
    this.productsService.getCategorySpecifications(categoryId).subscribe((specs: string[]) => {
      this.categorySpecifications = specs;
    });
  }

  addSpecification() {
    if (!this.productForm.specifications) {
      this.productForm.specifications = [];
    }
    this.productForm.specifications.push({ name: '', value: '' });
  }

  removeSpecification(index: number) {
    this.productForm.specifications.splice(index, 1);
  }

  onSpecNameChange(index: number) {
    // Можно добавить логику автодополнения при вводе
  }

  editProduct(product: any) {
    this.editingProduct = product;
    
    // Объединяем главное изображение (image) и дополнительные (images) в один массив
    const allImages: any[] = [];
    const addedUrls = new Set<string>(); // Для отслеживания уже добавленных URL
    const placeholderImage = this.getPlaceholderImage();
    
    // Функция для проверки валидности изображения
    const isValidImage = (imgUrl: string): boolean => {
      if (!imgUrl || imgUrl.trim() === '') return false;
      // Исключаем placeholder изображения
      if (imgUrl === placeholderImage || imgUrl.includes('data:image/svg+xml')) return false;
      return true;
    };
    
    // Если есть массив images, используем его
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img: string) => {
        if (isValidImage(img) && !addedUrls.has(img)) {
          allImages.push({
            url: img,
            file: null,
            isNew: false,
            isRemoved: false
          });
          addedUrls.add(img);
        }
      });
    } else if (product.image && isValidImage(product.image)) {
      // Если массива images нет, но есть старое поле image, используем его (только если валидное)
      if (!addedUrls.has(product.image)) {
        allImages.push({
          url: product.image,
          file: null,
          isNew: false,
          isRemoved: false
        });
        addedUrls.add(product.image);
      }
    }
    
    this.productForm = { 
      ...product,
      images: allImages,
      videoFile: null,
      videoPreview: null,
      removedVideo: false,
      specifications: product.specifications ? [...product.specifications] : []
    };
    if (product.categoryId) {
      this.loadCategorySpecifications(product.categoryId);
    }
  }

  addNew(type: 'product' | 'news' | 'category') {
    this.editDrawerService.open(null, type);
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
    this.editDrawerService.open(category, 'category');
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

  // Background Image handlers
  onBackgroundImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.backgroundImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.backgroundImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearBackgroundImage() {
    this.backgroundImageFile = null;
    this.backgroundImagePreview = null;
  }

  loadBackgroundImage() {
    this.apiService.get<{ url: string | null }>('/settings/background-image').subscribe(response => {
      this.currentBackgroundImage = response.url;
    });
  }

  saveBackgroundImage() {
    if (!this.backgroundImageFile) return;

    const formData = new FormData();
    formData.append('image', this.backgroundImageFile);

    this.apiService.postFormData('/settings/background-image', formData).subscribe(() => {
      this.loadBackgroundImage();
      this.clearBackgroundImage();
      alert('Фоновое изображение сохранено');
      // Обновляем фон на всех страницах
      window.location.reload();
    });
  }

  removeBackgroundImage() {
    if (confirm('Удалить фоновое изображение?')) {
      this.apiService.post('/settings/background-image/remove', {}).subscribe(() => {
        this.currentBackgroundImage = null;
        alert('Фоновое изображение удалено');
        // Обновляем фон на всех страницах
        window.location.reload();
      });
    }
  }
}
