import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent implements OnInit {
  constructor(private seoService: SeoService) {}

  ngOnInit() {
    // SEO оптимизация для страницы 404
    this.seoService.updateSEO({
      title: '404 - Страница не найдена',
      description: 'Запрашиваемая страница не найдена. Вернитесь на главную страницу или воспользуйтесь поиском.',
      keywords: '404, страница не найдена, ошибка',
      url: `${this.seoService.siteUrl}/404`
    });
  }
}

