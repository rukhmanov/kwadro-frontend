import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  cartItems: any[] = [];
  total = 0;
  showOrderModal = false;
  orderPhone = '';
  isSubmitting = false;
  orderSuccess = false;
  orderError = '';

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.loadCart();
  }

  loadCart() {
    this.cartService.getCart().subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
  }

  updateQuantity(itemId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    
    const cartItem = this.cartItems.find(item => item.id === itemId);
    if (!cartItem || !cartItem.product) return;

    if (quantity > cartItem.product.stock) {
      alert(`Недостаточно товара на складе. Доступно: ${cartItem.product.stock} шт.`);
      this.loadCart(); // Перезагружаем корзину для синхронизации
      return;
    }

    this.cartService.updateQuantity(itemId, quantity).subscribe({
      next: () => {
        this.loadCart();
        this.cartService.loadCartCount();
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Не удалось обновить количество';
        alert(errorMessage);
        this.loadCart(); // Перезагружаем корзину для синхронизации
      }
    });
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe(() => {
      this.loadCart();
      this.cartService.loadCartCount();
    });
  }

  clearCart() {
    if (confirm('Очистить корзину?')) {
      this.cartService.clearCart().subscribe(() => {
        this.loadCart();
        this.cartService.loadCartCount();
      });
    }
  }

  openOrderModal() {
    this.showOrderModal = true;
    this.orderPhone = '';
    this.orderSuccess = false;
    this.orderError = '';
  }

  closeOrderModal() {
    this.showOrderModal = false;
    this.orderPhone = '';
    this.orderSuccess = false;
    this.orderError = '';
  }

  isPhoneValid(): boolean {
    const phoneDigits = this.orderPhone.replace(/\D/g, '').replace(/^7/, '');
    return phoneDigits.length >= 10;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    let value = input.value;
    
    // Сохраняем количество цифр до курсора
    const digitsBeforeCursor = (value.substring(0, cursorPosition).match(/\d/g) || []).length;
    
    // Извлекаем только цифры
    let digits = value.replace(/\D/g, '');
    
    // Убираем первую 7, если она есть (так как у нас уже есть +7)
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    // Ограничиваем до 10 цифр
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    // Форматируем номер
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.orderPhone = formatted;
    
    // Восстанавливаем позицию курсора
    setTimeout(() => {
      let newCursorPos = this.calculateCursorPosition(formatted, digitsBeforeCursor);
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  private calculateCursorPosition(formatted: string, digitsBefore: number): number {
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitCount++;
        if (digitCount === digitsBefore) {
          return Math.min(i + 1, formatted.length);
        }
      }
    }
    // Если курсор был после всех цифр, ставим в конец
    return formatted.length;
  }

  onPhoneKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    
    // Разрешаем все служебные клавиши
    const allowedKeys = [8, 9, 13, 27, 37, 38, 39, 40, 46, 35, 36]; // Backspace, Tab, Enter, Escape, стрелки, Delete, Home, End
    if (allowedKeys.indexOf(event.keyCode) !== -1) {
      // Запрещаем удаление +7
      if (event.keyCode === 8 && selectionStart <= 3 && selectionEnd <= 3) {
        event.preventDefault();
        return;
      }
      if (event.keyCode === 46 && selectionStart < 3 && selectionEnd <= 3) {
        event.preventDefault();
        return;
      }
      return;
    }
    
    // Разрешаем все комбинации с Ctrl и Cmd
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    
    // Если курсор в области +7, перемещаем его после +7
    if (selectionStart < 3 && !event.ctrlKey && !event.metaKey) {
      // Разрешаем только Backspace и Delete для удаления выделенного текста
      if (event.keyCode !== 8 && event.keyCode !== 46) {
        setTimeout(() => {
          input.setSelectionRange(3, 3);
        }, 0);
      }
    }
  }

  onPhoneFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Если поле пустое, устанавливаем +7
    if (!input.value || input.value.trim() === '') {
      this.orderPhone = '+7';
      // Устанавливаем курсор после +7
      setTimeout(() => {
        input.setSelectionRange(3, 3);
      }, 0);
    }
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Извлекаем только цифры
    let digits = pastedText.replace(/\D/g, '');
    
    // Убираем первую 7 или 8, если есть
    if (digits.startsWith('7')) {
      digits = digits.substring(1);
    } else if (digits.startsWith('8')) {
      digits = digits.substring(1);
    }
    
    // Ограничиваем до 10 цифр
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    
    // Форматируем номер
    let formatted = '+7';
    if (digits.length > 0) {
      formatted += ' (' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 8);
          if (digits.length > 8) {
            formatted += '-' + digits.substring(8, 10);
          }
        }
      } else if (digits.length === 3) {
        formatted += ')';
      }
    }
    
    this.orderPhone = formatted;
    
    // Устанавливаем курсор в конец
    setTimeout(() => {
      input.setSelectionRange(formatted.length, formatted.length);
    }, 0);
  }

  submitOrder() {
    if (!this.isPhoneValid()) {
      this.orderError = 'Пожалуйста, введите корректный номер телефона';
      return;
    }

    this.isSubmitting = true;
    this.orderError = '';
    this.orderSuccess = false;

    this.cartService.placeOrder(this.orderPhone).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.orderSuccess = true;
        this.loadCart();
        this.cartService.loadCartCount();
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
          this.closeOrderModal();
        }, 2000);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.orderError = error.error?.message || 'Произошла ошибка при оформлении заказа. Попробуйте еще раз.';
      }
    });
  }
}
