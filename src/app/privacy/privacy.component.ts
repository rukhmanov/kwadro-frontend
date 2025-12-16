import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent implements OnInit {
  currentDate = new Date();

  constructor(private seoService: SeoService) {}

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateSEO({
      title: 'Политика конфиденциальности',
      description: 'Политика конфиденциальности MOTOмаркет. Информация о сборе, использовании и защите персональных данных.',
      keywords: 'политика конфиденциальности, защита данных, персональные данные',
      url: `${this.seoService.siteUrl}/privacy`
    });
  }
}
