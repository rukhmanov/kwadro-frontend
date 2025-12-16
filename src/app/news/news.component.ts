import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NewsService } from '../services/news.service';
import { AuthService } from '../services/auth.service';
import { EditDrawerService } from '../services/edit-drawer.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss'
})
export class NewsComponent implements OnInit {
  news: any[] = [];
  isAdmin = false;

  constructor(
    private newsService: NewsService,
    private authService: AuthService,
    private editDrawerService: EditDrawerService,
    private seoService: SeoService
  ) {}

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateSEO({
      title: 'Новости',
      description: 'Актуальные новости и обновления от MOTOмаркет, Дзержинск, Нижегородская область. Следите за новинками, акциями и специальными предложениями.',
      keywords: 'новости мототехники Дзержинск, акции мототехники, обновления каталога, специальные предложения, мототехника Нижегородская область',
      url: `${this.seoService.siteUrl}/news`
    });
    
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAdmin = isAuth;
    });

    this.newsService.getNews().subscribe(news => {
      this.news = news;
    });
  }

  openEditDrawer(news: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editDrawerService.open(news, 'news');
  }

  addNewNews() {
    this.editDrawerService.open(null, 'news');
  }

  deleteNews(newsId: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Удалить новость?')) {
      this.newsService.deleteNews(newsId).subscribe({
        next: () => {
          // Перезагружаем список новостей
          this.newsService.getNews().subscribe(news => {
            this.news = news;
          });
        },
        error: (err) => {
          console.error('Ошибка удаления новости:', err);
          alert('Ошибка при удалении новости. Попробуйте еще раз.');
        }
      });
    }
  }
}
