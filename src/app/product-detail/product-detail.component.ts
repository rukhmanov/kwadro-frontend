import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { CartService } from '../services/cart.service';

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

  selectMedia(type: 'image' | 'video', image: string | null = null) {
    this.selectedMediaType = type;
    this.selectedImage = image;
  }

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productsService.getProduct(+id).subscribe(product => {
        this.product = product;
        // Инициализируем отображение главного изображения или видео
        const hasImages = product.images && product.images.length > 0;
        if (product.video && !hasImages) {
          this.selectedMediaType = 'video';
        } else {
          this.selectedMediaType = 'image';
          this.selectedImage = null; // null означает главное изображение (первое в массиве)
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
}
