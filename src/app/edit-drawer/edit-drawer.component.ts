import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProductsService } from '../services/products.service';
import { NewsService } from '../services/news.service';
import { CategoriesService } from '../services/categories.service';

@Component({
  selector: 'app-edit-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './edit-drawer.component.html',
  styleUrl: './edit-drawer.component.scss'
})
export class EditDrawerComponent implements OnInit {
  @Input() entity: any = null;
  @Input() entityType: 'product' | 'news' | 'category' = 'product';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  form: any = {};
  categories: any[] = [];
  categorySpecifications: string[] = [];
  loading = false;

  constructor(
    private productsService: ProductsService,
    private newsService: NewsService,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit() {
    this.initializeForm();
    if (this.entityType === 'product') {
      this.loadCategories();
      if (this.entity?.categoryId) {
        this.loadCategorySpecifications(this.entity.categoryId);
      }
    }
  }

  initializeForm() {
    if (this.entity) {
      if (this.entityType === 'product') {
        this.form = {
          ...this.entity,
          images: this.prepareProductImages(this.entity),
          videoFile: null,
          videoPreview: null,
          removedVideo: false,
          specifications: this.entity.specifications ? [...this.entity.specifications] : []
        };
      } else if (this.entityType === 'news') {
        this.form = {
          ...this.entity,
          imageFile: null,
          imagePreview: null
        };
      } else if (this.entityType === 'category') {
        this.form = {
          ...this.entity,
          imageFile: null,
          imagePreview: null
        };
      }
    } else {
      // Новый объект
      if (this.entityType === 'product') {
        this.form = {
          name: '',
          description: '',
          price: 0,
          oldPrice: null,
          stock: 0,
          categoryId: null,
          images: [],
          videoFile: null,
          videoPreview: null,
          removedVideo: false,
          specifications: []
        };
      } else if (this.entityType === 'news') {
        this.form = {
          title: '',
          content: '',
          imageFile: null,
          imagePreview: null
        };
      } else if (this.entityType === 'category') {
        this.form = {
          name: '',
          description: '',
          imageFile: null,
          imagePreview: null
        };
      }
    }
  }

  prepareProductImages(product: any): any[] {
    const allImages: any[] = [];
    const addedUrls = new Set<string>();
    const placeholderImage = this.getPlaceholderImage();
    
    const isValidImage = (imgUrl: string): boolean => {
      if (!imgUrl || imgUrl.trim() === '') return false;
      if (imgUrl === placeholderImage || imgUrl.includes('data:image/svg+xml')) return false;
      return true;
    };
    
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img: string) => {
        if (isValidImage(img) && !addedUrls.has(img)) {
          allImages.push({
            url: img,
            file: null,
            isNew: false,
            isRemoved: false
          });
          addedUrls.add(img);
        }
      });
    } else if (product.image && isValidImage(product.image)) {
      if (!addedUrls.has(product.image)) {
        allImages.push({
          url: product.image,
          file: null,
          isNew: false,
          isRemoved: false
        });
        addedUrls.add(product.image);
      }
    }
    
    return allImages;
  }

  getPlaceholderImage(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  loadCategories() {
    this.categoriesService.getCategories().subscribe(categories => {
      this.categories = categories;
    });
  }

  loadCategorySpecifications(categoryId: number) {
    this.productsService.getCategorySpecifications(categoryId).subscribe((specs: string[]) => {
      this.categorySpecifications = specs;
    });
  }

  onCategoryChange() {
    if (this.form.categoryId) {
      this.loadCategorySpecifications(this.form.categoryId);
    } else {
      this.categorySpecifications = [];
    }
  }

  // Product image handlers
  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      if (!this.form.images) {
        this.form.images = [];
      }
      
      files.forEach((file) => {
        if (!file.type.startsWith('image/')) {
          console.warn('Выбранный файл не является изображением:', file.name);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const result = e.target.result;
          if (result) {
            this.form.images.push({
              url: result,
              file: file,
              isNew: true,
              isRemoved: false
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
    event.target.value = '';
  }

  getAllImages(): any[] {
    if (!this.form.images) return [];
    return this.form.images.filter((img: any) => {
      if (img.isRemoved) return false;
      if (!img.url || img.url.trim() === '') return false;
      if (img.url === this.getPlaceholderImage() || img.url.includes('data:image/svg+xml')) {
        return false;
      }
      return true;
    });
  }

  removeImage(index: number) {
    if (confirm('Удалить это изображение?')) {
      const visibleImages = this.getAllImages();
      const imageToRemove = visibleImages[index];
      
      if (imageToRemove.isNew) {
        const realIndex = this.form.images.indexOf(imageToRemove);
        if (realIndex !== -1) {
          this.form.images.splice(realIndex, 1);
        }
      } else {
        imageToRemove.isRemoved = true;
      }
    }
  }

  onImagesDrop(event: CdkDragDrop<any[]>) {
    if (!this.form.images || event.previousIndex === event.currentIndex) return;
    
    const visibleImages = this.getAllImages();
    moveItemInArray(visibleImages, event.previousIndex, event.currentIndex);
    
    const removedImages = this.form.images.filter((img: any) => img.isRemoved);
    this.form.images = [...visibleImages, ...removedImages];
  }

  trackByImage(index: number, item: any): any {
    return item.url || index;
  }

  // Video handlers
  onVideoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.form.videoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.videoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearVideo() {
    this.form.videoFile = null;
    this.form.videoPreview = null;
  }

  removeCurrentVideo() {
    if (confirm('Удалить видео?')) {
      this.form.video = null;
      this.form.removedVideo = true;
    }
  }

  // Specifications
  addSpecification() {
    if (!this.form.specifications) {
      this.form.specifications = [];
    }
    this.form.specifications.push({ name: '', value: '' });
  }

  removeSpecification(index: number) {
    this.form.specifications.splice(index, 1);
  }

  // News image handlers
  onNewsImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.form.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearNewsImage() {
    this.form.imageFile = null;
    this.form.imagePreview = null;
  }

  // Category image handlers
  onCategoryImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.form.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearCategoryImage() {
    this.form.imageFile = null;
    this.form.imagePreview = null;
  }

  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }
    
    try {
      const decodedUrl = decodeURIComponent(url);
      const urlWithoutQuery = decodedUrl.split('?')[0].split('%3F')[0];
      const parts = urlWithoutQuery.split('/');
      const bucketIndex = parts.findIndex((part: string) => 
        part.includes('parsifal-files') || part.includes('twcstorage')
      );
      
      if (bucketIndex >= 0) {
        let startIndex = bucketIndex + 1;
        if (parts[startIndex] && (parts[startIndex].includes('parsifal-files') || parts[startIndex].includes('twcstorage'))) {
          startIndex++;
        }
        if (startIndex < parts.length) {
          return parts.slice(startIndex).join('/');
        }
      }
      
      if (parts.length >= 2) {
        return parts.slice(-2).join('/');
      }
      
      return null;
    } catch (e) {
      const urlWithoutQuery = url.split('?')[0].split('%3F')[0];
      const parts = urlWithoutQuery.split('/');
      const bucketIndex = parts.findIndex((part: string) => part.includes('parsifal-files') || part.includes('twcstorage'));
      if (bucketIndex >= 0 && bucketIndex < parts.length - 1) {
        let startIndex = bucketIndex + 1;
        if (parts[startIndex] && (parts[startIndex].includes('parsifal-files') || parts[startIndex].includes('twcstorage'))) {
          startIndex++;
        }
        if (startIndex < parts.length) {
          return parts.slice(startIndex).join('/');
        }
      }
      if (parts.length >= 2) {
        return parts.slice(-2).join('/');
      }
      return null;
    }
  }

  closeDrawer() {
    this.close.emit();
  }

  save() {
    this.loading = true;
    
    if (this.entityType === 'product') {
      this.saveProduct();
    } else if (this.entityType === 'news') {
      this.saveNews();
    } else if (this.entityType === 'category') {
      this.saveCategory();
    }
  }

  saveProduct() {
    const formData = new FormData();
    const allImages = this.getAllImages();
    
    const existingImages: string[] = [];
    const newImageFiles: File[] = [];
    
    allImages.forEach((img: any) => {
      if (!img || img.isRemoved) return;
      
      const hasDataUri = img.url && img.url.startsWith('data:image/') && !img.url.includes('data:image/svg+xml');
      const isNewImage = (img.isNew === true) || (hasDataUri && img.file);
      
      if (isNewImage && img.file && img.file instanceof File) {
        newImageFiles.push(img.file);
      } else if (img.url && !isNewImage) {
        const key = this.extractKeyFromUrl(img.url);
        if (key) {
          existingImages.push(key);
        }
      }
    });

    let videoKey = this.form.video;
    if (this.form.removedVideo) {
      videoKey = null;
    } else if (videoKey) {
      videoKey = this.extractKeyFromUrl(videoKey);
    }
    
    const validSpecifications = (this.form.specifications || []).filter(
      (spec: { name: string; value: string }) => spec.name && spec.value
    );

    formData.append('product', JSON.stringify({
      name: this.form.name,
      description: this.form.description,
      price: this.form.price,
      oldPrice: this.form.oldPrice,
      stock: this.form.stock,
      categoryId: this.form.categoryId,
      images: existingImages,
      video: videoKey,
      specifications: validSpecifications
    }));

    if (newImageFiles.length > 0) {
      newImageFiles.forEach((file: File) => {
        if (file instanceof File) {
          formData.append('images', file, file.name);
        }
      });
    }

    if (this.form.videoFile) {
      formData.append('video', this.form.videoFile);
    }

    if (this.entity) {
      this.productsService.updateProduct(this.entity.id, formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(this.entity);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка сохранения товара:', err);
          this.loading = false;
          alert('Ошибка при сохранении товара. Попробуйте еще раз.');
        }
      });
    } else {
      this.productsService.createProduct(formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(null);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка создания товара:', err);
          this.loading = false;
          alert('Ошибка при создании товара. Попробуйте еще раз.');
        }
      });
    }
  }

  saveNews() {
    const formData = new FormData();
    
    let imageKey = this.form.image;
    if (imageKey && (imageKey.startsWith('http://') || imageKey.startsWith('https://'))) {
      imageKey = this.extractKeyFromUrl(imageKey);
    }
    
    formData.append('news', JSON.stringify({
      title: this.form.title,
      content: this.form.content,
      image: imageKey
    }));

    if (this.form.imageFile) {
      formData.append('image', this.form.imageFile);
    }

    if (this.entity) {
      this.newsService.updateNews(this.entity.id, formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(this.entity);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка сохранения новости:', err);
          this.loading = false;
          alert('Ошибка при сохранении новости. Попробуйте еще раз.');
        }
      });
    } else {
      this.newsService.createNews(formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(null);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка создания новости:', err);
          this.loading = false;
          alert('Ошибка при создании новости. Попробуйте еще раз.');
        }
      });
    }
  }

  saveCategory() {
    const formData = new FormData();
    
    let imageKey = this.form.image;
    if (imageKey && (imageKey.startsWith('http://') || imageKey.startsWith('https://'))) {
      imageKey = this.extractKeyFromUrl(imageKey);
    }
    
    formData.append('category', JSON.stringify({
      name: this.form.name,
      description: this.form.description,
      image: imageKey
    }));

    if (this.form.imageFile) {
      formData.append('image', this.form.imageFile);
    }

    if (this.entity) {
      this.categoriesService.updateCategory(this.entity.id, formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(this.entity);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка сохранения категории:', err);
          this.loading = false;
          alert('Ошибка при сохранении категории. Попробуйте еще раз.');
        }
      });
    } else {
      this.categoriesService.createCategory(formData).subscribe({
        next: () => {
          this.loading = false;
          this.saved.emit(null);
          this.closeDrawer();
        },
        error: (err) => {
          console.error('Ошибка создания категории:', err);
          this.loading = false;
          alert('Ошибка при создании категории. Попробуйте еще раз.');
        }
      });
    }
  }
}
