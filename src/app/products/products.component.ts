import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { EditDrawerService } from '../services/edit-drawer.service';
import { InstallmentModalService } from '../services/installment-modal.service';
import { SeoService } from '../services/seo.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  selectedCategory: number | null = null;
  Math = Math; // Для использования Math в шаблоне
  loading = true;
  loadingMore = false;
  error: string | null = null;
  cartItems: any[] = [];
  cartItemsMap: Map<number, any> = new Map();

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
  
  // Для drag & drop
  private isDragging: boolean = false;
  private dragType: 'min' | 'max' | null = null;

  // Пагинация
  currentPage: number = 1;
  totalPages: number = 1;
  total: number = 0;
  limit: number = 15;
  hasMore: boolean = false;

  // Поиск с задержкой
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  isAdmin = false;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cartService: CartService,
    private authService: AuthService,
    private editDrawerService: EditDrawerService,
    private installmentModalService: InstallmentModalService,
    private seoService: SeoService,
    private route: ActivatedRoute
  ) {
    // Настройка поиска с задержкой
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.resetAndLoad();
    });
  }

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateSEO({
      title: 'Каталог товаров',
      description: 'Каталог мототехники, запчастей и аксессуаров в интернет-магазине MOTOмаркет, Дзержинск, Нижегородская область. Широкий выбор товаров с доставкой по Дзержинску и области.',
      keywords: 'каталог мототехники Дзержинск, мотоциклы Нижегородская область, квадроциклы купить, запчасти мототехники, аксессуары мото, купить мототехнику в Дзержинске',
      url: `${this.seoService.siteUrl}/products`
    });
    
    this.loading = true;
    this.error = null;
    
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAdmin = isAuth;
    });
    
    this.categoriesService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => {
        console.error('Ошибка загрузки категорий:', err);
      }
    });

    this.loadCartItems();

    // Подписываемся на изменения количества товаров в корзине для автоматического обновления
    this.cartService.cartCount$.subscribe(() => {
      this.loadCartItems();
    });

    this.route.queryParams.subscribe(params => {
      const categoryId = params['categoryId'];
      if (categoryId) {
        this.selectedCategory = +categoryId;
      } else {
        this.selectedCategory = null;
      }
      this.resetAndLoad();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.loadingMore || !this.hasMore) return;
    
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Загружаем следующую страницу когда пользователь прокрутил на 80% страницы
    if (scrollTop + windowHeight >= documentHeight * 0.8) {
      this.loadMore();
    }
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
    const product = this.products.find(p => p.id === productId);
    const cartItem = this.getCartItem(productId);
    if (!product || !cartItem) return false;
    return cartItem.quantity < product.stock;
  }

  isOutOfStock(productId: number): boolean {
    const product = this.products.find(p => p.id === productId);
    if (!product) return true;
    return product.stock <= 0;
  }

  resetAndLoad() {
    this.currentPage = 1;
    this.products = [];
    this.loadProducts();
  }

  loadProducts() {
    if (this.currentPage === 1) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    this.error = null;
    
    const params: any = {
      page: this.currentPage,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    if (this.selectedCategory) {
      params.categoryId = this.selectedCategory;
    }
    if (this.searchQuery) {
      params.search = this.searchQuery;
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
        if (this.currentPage === 1) {
          this.products = response.products || [];
          // Инициализируем диапазон цен на основе загруженных товаров
          if (this.products.length > 0 && (this.priceRangeMinLimit === 0 && this.priceRangeMaxLimit === 100000)) {
            const prices = this.products.map(p => p.price).filter(p => p != null);
            if (prices.length > 0) {
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              // Минимум всегда 0, максимум округляем вверх
              this.priceRangeMinLimit = 0;
              this.priceRangeMaxLimit = Math.ceil(max * 1.1);
              // Устанавливаем начальные значения
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
        } else {
          this.products = [...this.products, ...(response.products || [])];
        }
        this.total = response.total;
        this.totalPages = response.totalPages;
        this.hasMore = this.currentPage < this.totalPages;
        this.loading = false;
        this.loadingMore = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки товаров:', err);
        this.error = 'Не удалось загрузить товары. Попробуйте обновить страницу.';
        this.loading = false;
        this.loadingMore = false;
        if (this.currentPage === 1) {
          this.products = [];
        }
      }
    });
  }

  loadMore() {
    if (this.hasMore && !this.loadingMore) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onSortChange() {
    this.resetAndLoad();
  }

  onFilterChange() {
    this.resetAndLoad();
  }

  applyFilters() {
    this.resetAndLoad();
  }

  clearFilters() {
    this.searchQuery = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.priceRangeMin = 0;
    this.priceRangeMax = this.priceRangeMaxLimit || 100000;
    this.inStock = null;
    this.sortBy = 'createdAt';
    this.sortOrder = 'DESC';
    this.resetAndLoad();
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

  filterByCategory(categoryId: number | null) {
    this.selectedCategory = categoryId;
    this.resetAndLoad();
  }

  openEditDrawer(product: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editDrawerService.open(product, 'product');
  }

  addNewProduct() {
    this.editDrawerService.open(null, 'product');
  }

  deleteProduct(productId: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Удалить товар?')) {
      this.productsService.deleteProduct(productId).subscribe({
        next: () => {
          // Перезагружаем список товаров
          this.resetAndLoad();
        },
        error: (err) => {
          console.error('Ошибка удаления товара:', err);
          alert('Ошибка при удалении товара. Попробуйте еще раз.');
        }
      });
    }
  }

  addToCart(productId: number) {
    const product = this.products.find(p => p.id === productId);
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

  increaseQuantity(cartItemId: number, productId: number) {
    const product = this.products.find(p => p.id === productId);
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
        this.loadCartItems(); // Перезагружаем корзину для синхронизации
      }
    });
  }

  decreaseQuantity(cartItemId: number, productId: number) {
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

  openInstallmentModal(productName: string, productPrice: number) {
    this.installmentModalService.openModal(productName, productPrice);
  }
}
