import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { NewsService } from '../services/news.service';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  featuredProducts: any[] = [];
  latestNews: any[] = [];
  cartItems: any[] = [];
  cartItemsMap: Map<number, any> = new Map();

  constructor(
    private productsService: ProductsService,
    private newsService: NewsService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.productsService.getProductsPaginated({
      isFeatured: true,
      limit: 10,
      page: 1,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    }).subscribe(response => {
      this.featuredProducts = response.products || [];
    });

    this.newsService.getNews().subscribe(news => {
      this.latestNews = news.slice(0, 10);
    });

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

  canIncreaseQuantity(productId: number): boolean {
    const product = this.featuredProducts.find(p => p.id === productId);
    const cartItem = this.getCartItem(productId);
    if (!product || !cartItem) return false;
    return cartItem.quantity < product.stock;
  }

  isOutOfStock(productId: number): boolean {
    const product = this.featuredProducts.find(p => p.id === productId);
    if (!product) return true;
    return product.stock <= 0;
  }

  addToCart(productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const product = this.featuredProducts.find(p => p.id === productId);
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

  increaseQuantity(cartItemId: number, productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const product = this.featuredProducts.find(p => p.id === productId);
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
}
