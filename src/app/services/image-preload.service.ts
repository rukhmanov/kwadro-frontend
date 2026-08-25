import { Injectable } from '@angular/core';

/**
 * Предзагрузка картинок в браузерный HTTP-кэш через Image().
 * Повторные URL не грузятся повторно в рамках сессии.
 */
@Injectable({ providedIn: 'root' })
export class ImagePreloadService {
  private loaded = new Set<string>();
  private inFlight = new Set<string>();

  preload(url: string | null | undefined): void {
    if (!url || url.startsWith('data:') || url.includes('placeholder')) {
      return;
    }
    if (this.loaded.has(url) || this.inFlight.has(url)) {
      return;
    }

    this.inFlight.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.inFlight.delete(url);
      this.loaded.add(url);
    };
    img.onerror = () => {
      this.inFlight.delete(url);
    };
    img.src = url;
  }

  preloadMany(urls: Array<string | null | undefined>): void {
    urls.forEach((url) => this.preload(url));
  }

  has(url: string | null | undefined): boolean {
    return !!url && this.loaded.has(url);
  }
}
