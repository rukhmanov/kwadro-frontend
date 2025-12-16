import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly defaultTitle = 'MOTOмаркет - Интернет-магазин мототехники в Дзержинске, Нижегородская область';
  private readonly defaultDescription = 'MOTOмаркет - интернет-магазин мототехники в Дзержинске, Нижегородская область. Широкий ассортимент мотоциклов, квадроциклов, запчастей и аксессуаров. Доставка по Дзержинску и Нижегородской области. Рассрочка без переплат.';
  private readonly defaultKeywords = 'мототехника Дзержинск, мотоциклы Нижегородская область, квадроциклы купить, запчасти мототехники, аксессуары мото, купить мототехнику в Дзержинске, интернет-магазин мототехники Нижегородская область, мототехника Нижний Новгород, доставка мототехники Дзержинск, мототехника с доставкой';
  private readonly defaultImage = '/assets/motomarketlogo.svg';
  readonly siteUrl = environment.siteUrl || (environment.production ? 'https://motomarket52.ru' : 'http://localhost:4200');
  private readonly siteName = 'MOTOмаркет';

  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  updateSEO(data: SEOData): void {
    const title = data.title 
      ? `${data.title} | ${this.siteName}` 
      : this.defaultTitle;
    
    const description = data.description || this.defaultDescription;
    const image = data.image || this.defaultImage;
    const url = data.url || this.siteUrl;
    const type = data.type || 'website';
    const locale = data.locale || 'ru_RU';

    // Обновляем title
    this.title.setTitle(title);

    // Базовые мета-теги
    this.meta.updateTag({ name: 'description', content: description });
    const keywords = data.keywords || this.defaultKeywords;
    this.meta.updateTag({ name: 'keywords', content: keywords });
    
    // Яндекс-специфичные мета-теги
    this.meta.updateTag({ name: 'yandex-region', content: 'Нижегородская область' });
    this.meta.updateTag({ name: 'yandex-city', content: 'Дзержинск' });

    // Open Graph теги
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: this.getFullImageUrl(image) });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: locale });

    // Twitter Card теги
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: this.getFullImageUrl(image) });

    // Canonical URL
    this.updateCanonicalUrl(url);
  }

  updateStructuredData(data: any): void {
    // Удаляем старые структурированные данные
    const existingScript = document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Добавляем новые структурированные данные
    const script = document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  private updateCanonicalUrl(url: string): void {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }

  private getFullImageUrl(image: string): string {
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    return `${this.siteUrl}${image.startsWith('/') ? image : '/' + image}`;
  }

  // Методы для конкретных типов страниц
  updateProductSEO(product: any): void {
    const title = `${product.name} - купить в MOTOмаркет, Дзержинск`;
    const description = product.description 
      ? `${product.description.substring(0, 160)}...` 
      : `Купить ${product.name} по цене ${product.price} руб. в интернет-магазине MOTOмаркет, Дзержинск, Нижегородская область. Доставка по Дзержинску и области.`;
    const keywords = `${product.name}, купить ${product.name} Дзержинск, ${product.name} Нижегородская область, мототехника Дзержинск, ${this.defaultKeywords}`;
    const image = product.images && product.images.length > 0 
      ? product.images[0] 
      : this.defaultImage;
    const url = `${this.siteUrl}/products/${product.id}`;

    this.updateSEO({
      title,
      description,
      keywords,
      image,
      url,
      type: 'product'
    });

    // Структурированные данные для продукта
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || description,
      image: this.getFullImageUrl(image),
      brand: {
        '@type': 'Brand',
        name: this.siteName
      },
      offers: {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'RUB',
        price: product.price,
        availability: product.stock > 0 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
        areaServed: {
          '@type': 'City',
          name: 'Дзержинск'
        },
        seller: {
          '@type': 'Organization',
          name: this.siteName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Дзержинск',
            addressRegion: 'Нижегородская область',
            addressCountry: 'RU'
          }
        }
      }
    };

    this.updateStructuredData(structuredData);
  }

  updateNewsSEO(newsItem: any): void {
    const title = `${newsItem.title} - Новости MOTOмаркет, Дзержинск`;
    const description = newsItem.content 
      ? `${newsItem.content.replace(/<[^>]*>/g, '').substring(0, 160)}...` 
      : `Читайте новость "${newsItem.title}" на сайте MOTOмаркет, Дзержинск, Нижегородская область.`;
    const image = newsItem.image || this.defaultImage;
    const url = `${this.siteUrl}/news/${newsItem.id}`;

    this.updateSEO({
      title,
      description,
      image,
      url,
      type: 'article'
    });

    // Структурированные данные для статьи
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: newsItem.title,
      description: description,
      image: this.getFullImageUrl(image),
      datePublished: newsItem.createdAt,
      dateModified: newsItem.updatedAt || newsItem.createdAt,
      author: {
        '@type': 'Organization',
        name: this.siteName
      },
      publisher: {
        '@type': 'Organization',
        name: this.siteName,
        logo: {
          '@type': 'ImageObject',
          url: this.getFullImageUrl(this.defaultImage)
        }
      }
    };

    this.updateStructuredData(structuredData);
  }

  updateHomeSEO(): void {
    this.updateSEO({
      title: 'Главная',
      description: this.defaultDescription,
      keywords: this.defaultKeywords,
      url: this.siteUrl
    });

    // Структурированные данные для организации
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': this.siteUrl,
      name: this.siteName,
      description: this.defaultDescription,
      url: this.siteUrl,
      logo: this.getFullImageUrl(this.defaultImage),
      image: this.getFullImageUrl(this.defaultImage),
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Гайдара 61 д',
        addressLocality: 'Дзержинск',
        addressRegion: 'Нижегородская область',
        postalCode: '606000',
        addressCountry: 'RU'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 56.232929,
        longitude: 43.435260
      },
      telephone: '+7 (8313) 26-00-00',
      priceRange: '$$',
      areaServed: {
        '@type': 'City',
        name: 'Дзержинск'
      },
      areaServedRegion: {
        '@type': 'State',
        name: 'Нижегородская область'
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '09:00',
          closes: '18:00'
        }
      ]
    };

    this.updateStructuredData(structuredData);
  }
}
