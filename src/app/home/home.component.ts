import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { NewsService } from '../services/news.service';
import { CartService } from '../services/cart.service';
import { CategoriesService } from '../services/categories.service';
import { InstallmentModalService } from '../services/installment-modal.service';
import { SeoService } from '../services/seo.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  featuredProducts: any[] = [];
  searchResults: any[] = [];
  latestNews: any[] = [];
  cartItems: any[] = [];
  cartItemsMap: Map<number, any> = new Map();
  categories: any[] = [];
  categoryProducts: Map<number, any[]> = new Map();
  
  // Поиск и фильтры
  searchQuery: string = '';
  sortBy: string = 'createdAt';
  sortOrder: 'ASC' | 'DESC' = 'DESC';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  priceRangeMin: number = 0;
  priceRangeMax: number = 100000;
  priceRangeMinLimit: number = 0;
  priceRangeMaxLimit: number = 100000;
  inStock: boolean | null = null;
  showFilters: boolean = false;
  selectedCategory: number | null = null;
  loadingSearch: boolean = false;
  
  // Для drag & drop
  private isDragging: boolean = false;
  private dragType: 'min' | 'max' | null = null;
  
  // Поиск с задержкой
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Кэш состояний скролла
  private scrollStates: Map<string, { hasScroll: boolean; canScrollLeft: boolean; canScrollRight: boolean }> = new Map();
  
  // Слайдер
  slides = [
    {
      image: '/assets/slides/1.jpg',
      title: 'Мототехника',
      description: 'Широкий ассортимент мототехники для любых задач'
    },
    {
      image: '/assets/slides/2.jpg',
      title: 'MOTO MARKET',
      description: 'Ваш надежный партнер в мире мототехники'
    },
    {
      image: '/assets/slides/3.jpg',
      title: 'Сервисное обслуживание',
      description: 'Профессиональный сервис и ремонт вашей техники'
    }
  ];
  currentSlide = 0;
  private slideInterval: any;
  
  Math = Math;

  constructor(
    private productsService: ProductsService,
    private newsService: NewsService,
    private cartService: CartService,
    private categoriesService: CategoriesService,
    private installmentModalService: InstallmentModalService,
    private seoService: SeoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Настройка поиска с задержкой
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.loadSearchResults();
    });
  }

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateHomeSEO();
    
    // Загружаем популярные товары (независимо от поиска)
    this.loadFeaturedProducts();

    this.newsService.getNews().subscribe(news => {
      this.latestNews = news.slice(0, 10);
    });

    this.loadCartItems();

    // Подписываемся на изменения количества товаров в корзине для автоматического обновления
    this.cartService.cartCount$.subscribe(() => {
      this.loadCartItems();
    });

    // Загружаем категории и товары по категориям
    this.loadCategoriesAndProducts();

    // Запускаем автоматическую прокрутку слайдера
    this.startSlider();
  }

  ngAfterViewInit() {
    // Сбрасываем горизонтальные скроллы после инициализации представления
    setTimeout(() => {
      this.resetHorizontalScrolls();
      // Инициализируем состояния всех скроллов
      this.updateAllScrollStates();
    }, 0);
  }

  private updateAllScrollStates() {
    // Обновляем состояния всех известных скроллов
    const selectors = ['category-nav', 'featured-products-grid', 'search-results-grid'];
    selectors.forEach(selector => {
      this.updateScrollState(selector);
    });
    
    // Обновляем состояния для категорий
    this.categories.forEach(category => {
      this.updateScrollState(`category-${category.id}`);
    });
    
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopSlider();
  }

  // Методы слайдера
  startSlider() {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Переключение каждые 5 секунд
  }

  stopSlider() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  previousSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    // Перезапускаем таймер при ручном переключении
    this.stopSlider();
    this.startSlider();
  }

  loadCategoriesAndProducts() {
    this.categoriesService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        // Загружаем по 10 товаров для каждой категории
        categories.forEach(category => {
          this.productsService.getProductsPaginated({
            categoryId: category.id,
            limit: 10,
            page: 1,
            sortBy: 'createdAt',
            sortOrder: 'DESC'
          }).subscribe(response => {
            this.categoryProducts.set(category.id, response.products || []);
            // Обновляем состояние скролла после загрузки товаров
            setTimeout(() => {
              this.updateScrollState(`category-${category.id}`);
              this.cdr.detectChanges();
            }, 0);
          });
        });
        // Обновляем состояние скролла после загрузки категорий
        setTimeout(() => {
          this.updateScrollState('category-nav');
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Ошибка загрузки категорий:', err);
      }
    });
  }

  loadFeaturedProducts() {
    // Загружаем популярные товары независимо от поиска
    this.productsService.getProductsPaginated({
      isFeatured: true,
      limit: 10,
      page: 1,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    }).subscribe({
      next: (response) => {
        this.featuredProducts = response.products || [];
        // Обновляем состояние скролла после загрузки товаров
        setTimeout(() => {
          this.updateScrollState('featured-products-grid');
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Ошибка загрузки популярных товаров:', err);
        this.featuredProducts = [];
      }
    });
  }

  loadSearchResults() {
    // Если поисковая строка пуста, очищаем результаты
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.loadingSearch = true;
    const params: any = {
      page: 1,
      limit: 50,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      search: this.searchQuery.trim() // Регистронезависимый поиск на бэкенде
    };

    if (this.selectedCategory) {
      params.categoryId = this.selectedCategory;
    }
    if (this.minPrice !== null) {
      params.minPrice = this.minPrice;
    }
    if (this.maxPrice !== null) {
      params.maxPrice = this.maxPrice;
    }
    if (this.inStock !== null) {
      params.inStock = this.inStock;
    }

    this.productsService.getProductsPaginated(params).subscribe({
      next: (response) => {
        this.searchResults = response.products || [];
        // Инициализируем диапазон цен на основе загруженных товаров
        if (this.searchResults.length > 0 && (this.priceRangeMinLimit === 0 && this.priceRangeMaxLimit === 100000)) {
          const prices = this.searchResults.map(p => p.price).filter(p => p != null);
          if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            this.priceRangeMinLimit = 0;
            this.priceRangeMaxLimit = Math.ceil(max * 1.1);
            if (this.minPrice === null && this.maxPrice === null) {
              this.priceRangeMin = 0;
              this.priceRangeMax = this.priceRangeMaxLimit;
              this.onPriceRangeChange();
            } else {
              this.priceRangeMin = this.minPrice || 0;
              this.priceRangeMax = this.maxPrice || this.priceRangeMaxLimit;
            }
          }
        }
        this.loadingSearch = false;
        // Обновляем состояние скролла после загрузки результатов
        setTimeout(() => {
          this.updateScrollState('search-results-grid');
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Ошибка загрузки результатов поиска:', err);
        this.searchResults = [];
        this.loadingSearch = false;
      }
    });
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onSortChange() {
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.loadSearchResults();
    }
  }

  applyFilters() {
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.loadSearchResults();
    }
  }

  clearFilters() {
    this.searchQuery = '';
    this.searchResults = [];
    this.minPrice = null;
    this.maxPrice = null;
    this.priceRangeMin = 0;
    this.priceRangeMax = this.priceRangeMaxLimit || 100000;
    this.inStock = null;
    this.sortBy = 'createdAt';
    this.sortOrder = 'DESC';
    this.selectedCategory = null;
  }

  onPriceRangeChange() {
    this.minPrice = this.priceRangeMin > 0 ? this.priceRangeMin : null;
    this.maxPrice = this.priceRangeMax < this.priceRangeMaxLimit ? this.priceRangeMax : null;
  }

  getMinPercent(): number {
    const range = this.priceRangeMaxLimit - 0;
    if (range === 0) return 0;
    return ((this.priceRangeMin - 0) / range) * 100;
  }

  getMaxPercent(): number {
    const range = this.priceRangeMaxLimit - 0;
    if (range === 0) return 0;
    return ((this.priceRangeMax - 0) / range) * 100;
  }

  getRangePercent(): number {
    return this.getMaxPercent() - this.getMinPercent();
  }

  startDrag(event: MouseEvent | TouchEvent, type: 'min' | 'max') {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragType = type;
    
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const sliderTrack = document.querySelector('.slider-track') as HTMLElement;
      if (!sliderTrack) return;
      
      const rect = sliderTrack.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const range = this.priceRangeMaxLimit - 0;
      const value = Math.round(0 + (percent / 100) * range);
      
      if (this.dragType === 'min') {
        if (value >= 0 && value <= this.priceRangeMax) {
          this.priceRangeMin = value;
          this.onPriceRangeChange();
        }
      } else if (this.dragType === 'max') {
        if (value <= this.priceRangeMaxLimit && value >= this.priceRangeMin) {
          this.priceRangeMax = value;
          this.onPriceRangeChange();
        }
      }
    };
    
    const stopHandler = () => {
      this.isDragging = false;
      this.dragType = null;
      document.removeEventListener('mousemove', moveHandler as any);
      document.removeEventListener('mouseup', stopHandler);
      document.removeEventListener('touchmove', moveHandler as any);
      document.removeEventListener('touchend', stopHandler);
    };
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', stopHandler);
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', stopHandler);
  }

  scrollToCategory(categoryId: number | null, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (categoryId === null) {
      // Прокручиваем к началу страницы
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      // Определяем отступ в зависимости от размера экрана
      const isMobile = window.innerWidth < 768;
      const headerOffset = isMobile ? 120 : 150; // Больше отступ для планшетов/десктопов
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  goToCatalog(categoryId: number, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.router.navigate(['/products'], { queryParams: { categoryId: categoryId } });
  }

  getCategoryProducts(categoryId: number): any[] {
    return this.categoryProducts.get(categoryId) || [];
  }

  loadCartItems() {
    this.cartService.getCart().subscribe(items => {
      this.cartItems = items || [];
      this.cartItemsMap.clear();
      this.cartItems.forEach(item => {
        this.cartItemsMap.set(item.product.id, item);
      });
    });
  }

  getCartItem(productId: number): any {
    return this.cartItemsMap.get(productId);
  }

  isInCart(productId: number): boolean {
    return this.cartItemsMap.has(productId);
  }

  canIncreaseQuantity(productId: number): boolean {
    const product = this.featuredProducts.find(p => p.id === productId) || 
                    this.searchResults.find(p => p.id === productId);
    const cartItem = this.getCartItem(productId);
    if (!product || !cartItem) return false;
    return cartItem.quantity < product.stock;
  }

  canIncreaseQuantityForProduct(product: any): boolean {
    const cartItem = this.getCartItem(product.id);
    if (!product || !cartItem) return false;
    return cartItem.quantity < product.stock;
  }

  isOutOfStock(productId: number): boolean {
    const product = this.featuredProducts.find(p => p.id === productId) || 
                    this.searchResults.find(p => p.id === productId);
    if (!product) return true;
    return product.stock <= 0;
  }

  isOutOfStockForProduct(product: any): boolean {
    if (!product) return true;
    return product.stock <= 0;
  }

  addToCart(productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const product = this.featuredProducts.find(p => p.id === productId) || 
                    this.searchResults.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock <= 0) {
      alert('Товар закончился');
      return;
    }

    const cartItem = this.getCartItem(productId);
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    
    if (currentQuantity >= product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${product.stock} шт.`);
      return;
    }

    this.cartService.addToCart(productId, 1).subscribe({
      next: () => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Не удалось добавить товар в корзину';
        alert(errorMessage);
      }
    });
  }

  addToCartFromCategory(product: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!product) return;
    
    if (product.stock <= 0) {
      alert('Товар закончился');
      return;
    }

    const cartItem = this.getCartItem(product.id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    
    if (currentQuantity >= product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${product.stock} шт.`);
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Не удалось добавить товар в корзину';
        alert(errorMessage);
      }
    });
  }

  increaseQuantity(cartItemId: number, productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const product = this.featuredProducts.find(p => p.id === productId) || 
                    this.searchResults.find(p => p.id === productId);
    const cartItem = this.getCartItem(productId);
    
    if (!product || !cartItem) return;

    if (cartItem.quantity >= product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${product.stock} шт.`);
      return;
    }

    this.cartService.updateQuantity(cartItemId, cartItem.quantity + 1).subscribe({
      next: () => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Не удалось обновить количество';
        alert(errorMessage);
        this.loadCartItems();
      }
    });
  }

  increaseQuantityFromCategory(product: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const cartItem = this.getCartItem(product.id);
    
    if (!product || !cartItem) return;

    if (cartItem.quantity >= product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${product.stock} шт.`);
      return;
    }

    this.cartService.updateQuantity(cartItem.id, cartItem.quantity + 1).subscribe({
      next: () => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Не удалось обновить количество';
        alert(errorMessage);
        this.loadCartItems();
      }
    });
  }

  decreaseQuantity(cartItemId: number, productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const cartItem = this.getCartItem(productId);
    if (cartItem && cartItem.quantity > 1) {
      this.cartService.updateQuantity(cartItemId, cartItem.quantity - 1).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    } else if (cartItem && cartItem.quantity === 1) {
      this.cartService.removeItem(cartItemId).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    }
  }

  decreaseQuantityFromCategory(product: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const cartItem = this.getCartItem(product.id);
    if (cartItem && cartItem.quantity > 1) {
      this.cartService.updateQuantity(cartItem.id, cartItem.quantity - 1).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    } else if (cartItem && cartItem.quantity === 1) {
      this.cartService.removeItem(cartItem.id).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    }
  }

  openInstallmentModal(productName: string, productPrice: number) {
    this.installmentModalService.openModal(productName, productPrice);
  }

  resetHorizontalScrolls() {
    // Сбрасываем scrollLeft для всех горизонтальных скроллов
    const scrollableElements = document.querySelectorAll(
      '.category-nav, .products-grid, .news-grid'
    );
    
    scrollableElements.forEach((element: any) => {
      if (element && element.scrollLeft !== undefined) {
        element.scrollLeft = 0;
      }
    });
  }

  getScrollElement(selector: string): HTMLElement | null {
    if (selector === 'category-nav') {
      return document.querySelector('.category-nav') as HTMLElement;
    } else if (selector === 'search-results-grid') {
      return document.querySelector('.search-results-section .products-grid') as HTMLElement;
    } else if (selector === 'featured-products-grid') {
      return document.querySelector('.featured-products .products-grid') as HTMLElement;
    } else if (selector.startsWith('category-')) {
      const categoryId = selector.replace('category-', '');
      return document.querySelector(`#category-grid-${categoryId}`) as HTMLElement;
    }
    return null;
  }

  private updateScrollState(selector: string) {
    const element = this.getScrollElement(selector);
    if (!element) {
      this.scrollStates.set(selector, { hasScroll: false, canScrollLeft: false, canScrollRight: false });
      return;
    }
    
    const hasScroll = element.scrollWidth > element.clientWidth;
    const canScrollLeft = element.scrollLeft > 0;
    const maxScroll = element.scrollWidth - element.clientWidth;
    const canScrollRight = element.scrollLeft < maxScroll - 1;
    
    this.scrollStates.set(selector, { hasScroll, canScrollLeft, canScrollRight });
  }

  canScrollLeft(selector: string): boolean {
    const state = this.scrollStates.get(selector);
    if (!state) {
      // Возвращаем безопасное значение по умолчанию
      return false;
    }
    return state.canScrollLeft;
  }

  canScrollRight(selector: string): boolean {
    const state = this.scrollStates.get(selector);
    if (!state) {
      // Возвращаем безопасное значение по умолчанию
      return false;
    }
    return state.canScrollRight;
  }

  hasScroll(selector: string): boolean {
    const state = this.scrollStates.get(selector);
    if (!state) {
      // Возвращаем безопасное значение по умолчанию
      return false;
    }
    return state.hasScroll;
  }

  scrollHorizontal(selector: string, direction: 'left' | 'right') {
    const element = this.getScrollElement(selector);
    
    if (element) {
      const scrollAmount = 300; // Количество пикселей для прокрутки
      const currentScroll = element.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      element.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      
      // Обновляем состояние после прокрутки
      setTimeout(() => {
        this.updateScrollState(selector);
        this.cdr.detectChanges();
      }, 100);
    }
  }

  onScroll(selector: string) {
    // Метод для обновления состояния кнопок при скролле
    // Вызывается из шаблона через событие scroll
    requestAnimationFrame(() => {
      this.updateScrollState(selector);
      this.cdr.detectChanges();
    });
  }


  @HostListener('window:load')
  onWindowLoad() {
    // Сбрасываем скроллы после полной загрузки страницы
    requestAnimationFrame(() => {
      this.resetHorizontalScrolls();
    });
  }
}
