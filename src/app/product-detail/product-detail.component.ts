import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { CartService } from '../services/cart.service';
import { InstallmentModalService } from '../services/installment-modal.service';
import { AvailabilityModalService } from '../services/availability-modal.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit {
  product: any = null;
  cartItems: any[] = [];
  cartItemsMap: Map<number, any> = new Map();
  selectedImage: string | null = null;
  selectedMediaType: 'image' | 'video' | null = null;
  currentImageIndex: number = 0;

  selectMedia(type: 'image' | 'video', image: string | null = null) {
    this.selectedMediaType = type;
    this.selectedImage = image;
    if (type === 'image' && image && this.product?.images) {
      const index = this.product.images.indexOf(image);
      if (index !== -1) {
        this.currentImageIndex = index;
      }
    } else if (type === 'image' && !image && this.product?.images && this.product.images.length > 0) {
      // Если выбрано первое изображение (null означает первое)
      this.currentImageIndex = 0;
      this.selectedImage = null;
    } else if (type === 'video') {
      // При выборе видео сбрасываем индекс изображения
      this.selectedImage = null;
    }
  }

  getCurrentImage(): string | null {
    if (!this.product?.images || this.product.images.length === 0) return null;
    if (this.selectedImage) {
      return this.selectedImage;
    }
    return this.product.images[this.currentImageIndex] || this.product.images[0];
  }

  previousImage() {
    // Если выбрано видео, переключаемся на последнее изображение
    if (this.selectedMediaType === 'video' && this.product?.images && this.product.images.length > 0) {
      this.selectedMediaType = 'image';
      this.currentImageIndex = this.product.images.length - 1;
      this.selectedImage = this.product.images[this.currentImageIndex];
      return;
    }
    
    // Если нет изображений, ничего не делаем
    if (!this.product?.images || this.product.images.length === 0) {
      return;
    }
    
    // Если выбрано изображение, переключаемся на предыдущее
    if (this.selectedMediaType === 'image') {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--;
        this.selectedImage = this.product.images[this.currentImageIndex];
        this.selectedMediaType = 'image';
      } else {
        // Если это первое изображение и есть видео, переключаемся на видео
        if (this.product.video) {
          this.selectedMediaType = 'video';
          this.selectedImage = null;
        } else if (this.product.images.length > 1) {
          // Если нет видео, переходим к последнему изображению (циклическая навигация)
          this.currentImageIndex = this.product.images.length - 1;
          this.selectedImage = this.product.images[this.currentImageIndex];
          this.selectedMediaType = 'image';
        }
      }
    } else {
      // Если тип не определен, переключаемся на первое изображение
      this.selectedMediaType = 'image';
      this.currentImageIndex = 0;
      this.selectedImage = this.product.images[0];
    }
  }

  nextImage() {
    // Если нет изображений, ничего не делаем
    if (!this.product?.images || this.product.images.length === 0) {
      return;
    }
    
    // Если выбрано изображение, переключаемся на следующее
    if (this.selectedMediaType === 'image') {
      if (this.currentImageIndex < this.product.images.length - 1) {
        this.currentImageIndex++;
        this.selectedImage = this.product.images[this.currentImageIndex];
        this.selectedMediaType = 'image';
      } else {
        // Если это последнее изображение и есть видео, переключаемся на видео
        if (this.product.video) {
          this.selectedMediaType = 'video';
          this.selectedImage = null;
        } else if (this.product.images.length > 1) {
          // Если нет видео, переходим к первому изображению (циклическая навигация)
          this.currentImageIndex = 0;
          this.selectedImage = this.product.images[0];
          this.selectedMediaType = 'image';
        }
      }
    } else if (this.selectedMediaType === 'video') {
      // Если выбрано видео, переключаемся на первое изображение
      this.selectedMediaType = 'image';
      this.currentImageIndex = 0;
      this.selectedImage = this.product.images[0];
    } else {
      // Если тип не определен, переключаемся на первое изображение
      this.selectedMediaType = 'image';
      this.currentImageIndex = 0;
      this.selectedImage = this.product.images[0];
    }
  }

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private cartService: CartService,
    private installmentModalService: InstallmentModalService,
    private availabilityModalService: AvailabilityModalService,
    private seoService: SeoService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productsService.getProduct(+id).subscribe(product => {
        this.product = product;
        // SEO оптимизация для продукта
        this.seoService.updateProductSEO(product);
        // Инициализируем отображение главного изображения или видео
        const hasImages = product.images && product.images.length > 0;
        if (product.video && !hasImages) {
          // Только видео, нет изображений
          this.selectedMediaType = 'video';
          this.selectedImage = null;
        } else if (hasImages) {
          // Есть изображения - показываем их (даже если есть видео)
          this.selectedMediaType = 'image';
          this.currentImageIndex = 0;
          this.selectedImage = null; // null означает главное изображение (первое в массиве)
        } else {
          // Нет ни изображений, ни видео
          this.selectedMediaType = null;
          this.selectedImage = null;
        }
      });
    }
    this.loadCartItems();

    // Подписываемся на изменения количества товаров в корзине для автоматического обновления
    this.cartService.cartCount$.subscribe(() => {
      this.loadCartItems();
    });
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

  canIncreaseQuantity(): boolean {
    if (!this.product) return false;
    const cartItem = this.getCartItem(this.product.id);
    if (!cartItem) return false;
    return cartItem.quantity < this.product.stock;
  }

  isOutOfStock(): boolean {
    if (!this.product) return true;
    return this.product.stock <= 0;
  }

  addToCart() {
    if (!this.product) return;
    
    if (this.product.stock <= 0) {
      alert('Товар закончился');
      return;
    }

    const cartItem = this.getCartItem(this.product.id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    
    if (currentQuantity >= this.product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${this.product.stock} шт.`);
      return;
    }

    this.cartService.addToCart(this.product.id, 1).subscribe({
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
    if (!this.product) return;
    
    const cartItem = this.getCartItem(productId);
    if (!cartItem) return;

    if (cartItem.quantity >= this.product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${this.product.stock} шт.`);
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

  openInstallmentModal() {
    if (this.product) {
      this.installmentModalService.openModal(this.product.name, this.product.price);
    }
  }

  openAvailabilityModal() {
    if (this.product) {
      this.availabilityModalService.openModal(this.product.id, this.product.name);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Навигация по изображениям и видео стрелками влево/вправо
    if (this.product?.images && this.product.images.length > 0) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.previousImage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextImage();
      }
    }
  }
}
