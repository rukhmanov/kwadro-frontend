import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss'
})
export class TermsComponent implements OnInit {
  currentDate = new Date();

  constructor(private seoService: SeoService) {}

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateSEO({
      title: 'Условия использования',
      description: 'Условия использования интернет-магазина MOTOмаркет. Правила и условия покупки товаров.',
      keywords: 'условия использования, правила, условия покупки',
      url: `${this.seoService.siteUrl}/terms`
    });
  }
}
