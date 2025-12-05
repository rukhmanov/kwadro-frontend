import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { EditDrawerService } from '../services/edit-drawer.service';
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
  inStock: boolean | null = null;
  showFilters: boolean = false;

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
    this.inStock = null;
    this.sortBy = 'createdAt';
    this.sortOrder = 'DESC';
    this.resetAndLoad();
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
    this.cartService.addToCart(productId, 1).subscribe(() => {
      this.cartService.loadCartCount();
      this.loadCartItems();
    });
  }

  increaseQuantity(cartItemId: number, productId: number) {
    const cartItem = this.getCartItem(productId);
    if (cartItem) {
      this.cartService.updateQuantity(cartItemId, cartItem.quantity + 1).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    }
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
}
