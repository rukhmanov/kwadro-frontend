import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
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
  private readonly defaultDescription = 'В интернет-магазине МотоМаркет вы можете купить мотоцикл, квадроцикл , мопед , скутер, и снегоход. А также : запчасти, экипировку и аксессуары. Широкий ассортимент, выгодные цены, профессиональная поддержка и быстрая доставка мототехники по Нижегородской области. Предоставляется рассрочка 0%. Надежные мототовары с гарантией : Avantis, JHL, Promax, BRZ, Vento, Motax, Kews, Osaca, Motolend, Kayo, Kugoo, Bashan, Groza, Zontes, RRF, Wild, Jilang, Loncin, VMC, Zummav, BOSS, Tezza, GT Racer, Bamx,Tank,Progasi, Colt, BSE, Sigma, Alpha, G-Moto, STN, Ataki, ATV, Bizon, Rinolil, Motul, Lavr, Mannol, Aimol hizer, GTX, IGP, X Tech, Nibbi и многое другое.';
  private readonly defaultKeywords = 'мотомаркет, мото маркет, мото-маркет, мотомаркет Дзержинск, магазин мототехники, магазин мототехники Дзержинск, магазин мотоциклов, магазин мотоциклов Дзержинск, купить мотоцикл Дзержинск, мотоциклы цена Нижегородская область, квадроцикл купить недорого, скутер купить Дзержинск, мопед купить, питбайк купить, экипировка мото, мото экипировка, зимняя техника, техника б у, запасные части мото, масла и смазки, моторные масла, прочие смазки, запчасти для мотоциклов, аксессуары для квадроциклов, мототехника интернет магазин, мотоциклы б у Дзержинск, новый мотоцикл купить, шлем мотоциклетный, перчатки мото, куртка мотоциклетная, доставка мототехники, рассрочка на мотоцикл, кредит на квадроцикл, мотосалон Дзержинск, мототехника Нижний Новгород, ремонт мотоциклов Дзержинск, Гайдара 61 д, магазин на Гайдара, мотомаркет Гайдара 61';
  private readonly defaultImage = 'https://s3.twcstorage.ru/e1ba1f72-7761414f-593a-42ea-b9df-8cc7ab126345/%D0%A1%D0%BD%D0%B8%D0%BC%D0%BE%D0%BA%20%D1%8D%D0%BA%D1%80%D0%B0%D0%BD%D0%B0%202025-12-17%20%D0%B2%2022.02.30.png';
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
    const imageUrl = this.getFullImageUrl(image);
    const url = data.url || this.siteUrl;
    const type = data.type || 'website';
    const locale = data.locale || 'ru_RU';
    const imageWidth = data.imageWidth || 1200;
    const imageHeight = data.imageHeight || 630;
    const imageType = data.imageType || 'image/png';

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
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:url', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:width', content: imageWidth.toString() });
    this.meta.updateTag({ property: 'og:image:height', content: imageHeight.toString() });
    this.meta.updateTag({ property: 'og:image:type', content: imageType });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: locale });

    // Twitter Card теги
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

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
      ? `${product.description.replace(/<[^>]*>/g, '').substring(0, 155)}... Купить в Дзержинске с доставкой.` 
      : `Купить ${product.name} по цене ${product.price} руб. в интернет-магазине MOTOмаркет, Дзержинск. Оригинальная продукция с гарантией. Доставка по Дзержинску и Нижегородской области. Рассрочка 0%.`;
    const keywords = `${product.name}, купить ${product.name} Дзержинск, ${product.name} цена, ${product.name} недорого, ${product.name} Нижегородская область, ${product.name} с доставкой, ${product.name} отзывы, мототехника Дзержинск, ${this.defaultKeywords}`;
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





