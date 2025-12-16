import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  constructor(private seoService: SeoService) {}

  ngOnInit() {
    // SEO оптимизация
    this.seoService.updateSEO({
      title: 'О нас',
      description: 'MOTOмаркет - ваш надежный партнер в мире мототехники в Дзержинске, Нижегородская область. Узнайте больше о нашей компании, истории и ценностях.',
      keywords: 'о компании MOTOмаркет, о нас, история компании, мототехника Дзержинск, интернет-магазин мототехники Нижегородская область',
      url: `${this.seoService.siteUrl}/about`
    });
  }
}
