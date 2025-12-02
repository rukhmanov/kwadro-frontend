import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  selectedCategory: number | null = null;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cartService: CartService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.categoriesService.getCategories().subscribe(categories => {
      this.categories = categories;
    });

    this.route.queryParams.subscribe(params => {
      const categoryId = params['categoryId'];
      if (categoryId) {
        this.selectedCategory = +categoryId;
        this.loadProducts(+categoryId);
      } else {
        this.loadProducts();
      }
    });
  }

  loadProducts(categoryId?: number) {
    this.productsService.getProducts(categoryId).subscribe(products => {
      this.products = products;
    });
  }

  filterByCategory(categoryId: number | null) {
    this.selectedCategory = categoryId;
    this.loadProducts(categoryId || undefined);
  }

  addToCart(productId: number) {
    this.cartService.addToCart(productId, 1).subscribe(() => {
      this.cartService.loadCartCount();
      alert('Товар добавлен в корзину');
    });
  }
}
