import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { NewsService } from '../services/news.service';
import { CartService } from '../services/cart.service';
import { CategoriesService } from '../services/categories.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
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
  
  Math = Math;

  constructor(
    private productsService: ProductsService,
    private newsService: NewsService,
    private cartService: CartService,
    private categoriesService: CategoriesService,
    private router: Router
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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategoriesAndProducts() {
    this.categoriesService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        // Загружаем по 5 товаров для каждой категории
        categories.forEach(category => {
          this.productsService.getProductsPaginated({
            categoryId: category.id,
            limit: 5,
            page: 1,
            sortBy: 'createdAt',
            sortOrder: 'DESC'
          }).subscribe(response => {
            this.categoryProducts.set(category.id, response.products || []);
          });
        });
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
}
