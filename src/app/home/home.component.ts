import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductsService } from '../services/products.service';
import { NewsService } from '../services/news.service';

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

  constructor(
    private productsService: ProductsService,
    private newsService: NewsService
  ) {}

  ngOnInit() {
    this.productsService.getProducts().subscribe(products => {
      this.featuredProducts = products.slice(0, 6);
    });

    this.newsService.getNews().subscribe(news => {
      this.latestNews = news.slice(0, 3);
    });
  }
}
