import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NewsService } from '../services/news.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss'
})
export class NewsDetailComponent implements OnInit {
  newsItem: any = null;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService,
    private seoService: SeoService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.newsService.getNewsItem(+id).subscribe(item => {
        this.newsItem = item;
        // SEO оптимизация для новости
        this.seoService.updateNewsSEO(item);
      });
    }
  }
}
