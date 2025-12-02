import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductsService } from '../services/products.service';
import { CategoriesService } from '../services/categories.service';
import { NewsService } from '../services/news.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  activeTab: 'products' | 'news' | 'categories' = 'products';
  products: any[] = [];
  news: any[] = [];
  categories: any[] = [];
  
  productForm: any = {};
  newsForm: any = {};
  categoryForm: any = {};
  
  editingProduct: any = null;
  editingNews: any = null;
  editingCategory: any = null;

  constructor(
    private authService: AuthService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private newsService: NewsService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
  }

  loadData() {
    this.productsService.getProducts().subscribe(products => {
      this.products = products;
    });
    this.newsService.getNews().subscribe(news => {
      this.news = news;
    });
    this.categoriesService.getCategories().subscribe(categories => {
      this.categories = categories;
    });
  }

  setTab(tab: 'products' | 'news' | 'categories') {
    this.activeTab = tab;
    this.resetForms();
  }

  resetForms() {
    this.productForm = {};
    this.newsForm = {};
    this.categoryForm = {};
    this.editingProduct = null;
    this.editingNews = null;
    this.editingCategory = null;
  }

  // Products
  saveProduct() {
    if (this.editingProduct) {
      this.productsService.updateProduct(this.editingProduct.id, this.productForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.productsService.createProduct(this.productForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editProduct(product: any) {
    this.editingProduct = product;
    this.productForm = { ...product };
  }

  deleteProduct(id: number) {
    if (confirm('Удалить товар?')) {
      this.productsService.deleteProduct(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  // News
  saveNews() {
    if (this.editingNews) {
      this.newsService.updateNews(this.editingNews.id, this.newsForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.newsService.createNews(this.newsForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editNews(news: any) {
    this.editingNews = news;
    this.newsForm = { ...news };
  }

  deleteNews(id: number) {
    if (confirm('Удалить новость?')) {
      this.newsService.deleteNews(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  // Categories
  saveCategory() {
    if (this.editingCategory) {
      this.categoriesService.updateCategory(this.editingCategory.id, this.categoryForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    } else {
      this.categoriesService.createCategory(this.categoryForm).subscribe(() => {
        this.loadData();
        this.resetForms();
      });
    }
  }

  editCategory(category: any) {
    this.editingCategory = category;
    this.categoryForm = { ...category };
  }

  deleteCategory(id: number) {
    if (confirm('Удалить категорию?')) {
      this.categoriesService.deleteCategory(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
