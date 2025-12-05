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

  addToCart() {
    if (this.product) {
      this.cartService.addToCart(this.product.id, 1).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    }
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
