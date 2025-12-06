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
      limit: 6,
      page: 1
    }).subscribe(response => {
      this.featuredProducts = response.products || [];
    });

    this.newsService.getNews().subscribe(news => {
      this.latestNews = news.slice(0, 3);
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

  addToCart(productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.cartService.addToCart(productId, 1).subscribe(() => {
      this.cartService.loadCartCount();
      this.loadCartItems();
    });
  }

  increaseQuantity(cartItemId: number, productId: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const cartItem = this.getCartItem(productId);
    if (cartItem) {
      this.cartService.updateQuantity(cartItemId, cartItem.quantity + 1).subscribe(() => {
        this.cartService.loadCartCount();
        this.loadCartItems();
      });
    }
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
