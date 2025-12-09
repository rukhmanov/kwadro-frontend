import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../services/contact.service';

declare var ymaps: any;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, AfterViewInit {
  contactForm = {
    name: '',
    phone: '',
    message: ''
  };
  submitted = false;

  constructor(private contactService: ContactService) {}

  isFormValid(): boolean {
    // Хотя бы одно из полей должно быть заполнено: телефон или сообщение
    // Для телефона проверяем, что есть хотя бы одна цифра после +7
    const phoneDigits = this.contactForm.phone.replace(/\D/g, '').replace(/^7/, '');
    const hasPhone = phoneDigits.length >= 1;
    const hasMessage = this.contactForm.message.trim() !== '';
    
    return hasPhone || hasMessage;
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
    
    this.contactForm.phone = formatted;
    
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
      this.contactForm.phone = '+7';
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
    
    this.contactForm.phone = formatted;
    
    // Устанавливаем курсор в конец
    setTimeout(() => {
      input.setSelectionRange(formatted.length, formatted.length);
    }, 0);
  }

  ngOnInit() {
    // Загружаем Яндекс.Карты
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=YOUR_API_KEY&lang=ru_RU';
    script.async = true;
    document.head.appendChild(script);
  }

  ngAfterViewInit() {
    // Инициализация карты после загрузки API
    setTimeout(() => {
      if (typeof ymaps !== 'undefined') {
        ymaps.ready(() => {
          // Темные стили для карты
          const darkStyles = [
            {
              "featureType": "all",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#1a1a1a"
                }
              ]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#ffffff"
                }
              ]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1a1a1a"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#0e1626"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#2d2d2d"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#3d3d3d"
                }
              ]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#1a1a1a"
                }
              ]
            }
          ];

          // Точные координаты Гайдара 61 д, Дзержинск
          const coordinates = [56.232929, 43.435260];
          
          const map = new ymaps.Map('yandex-map', {
            center: coordinates,
            zoom: 17,
            controls: ['zoomControl', 'fullscreenControl']
          });

          // Применяем темные стили к карте
          map.options.set('theme', darkStyles);

          const placemark = new ymaps.Placemark(coordinates, {
            balloonContent: 'MOTOмаркет<br>Гайдара 61 д, Дзержинск',
            hintContent: 'Гайдара 61 д, Дзержинск',
            iconCaption: 'Гайдара 61 д, Дзержинск'
          }, {
            preset: 'islands#redIcon',
            iconColor: '#ff0000'
          });

          map.geoObjects.add(placemark);
        });
      }
    }, 1000);
  }

  onSubmit() {
    this.contactService.sendMessage(this.contactForm).subscribe(() => {
      this.submitted = true;
      this.contactForm = { name: '', phone: '', message: '' };
      setTimeout(() => {
        this.submitted = false;
      }, 3000);
    });
  }
}
