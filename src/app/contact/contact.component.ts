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
    email: '',
    phone: '',
    message: ''
  };
  submitted = false;

  constructor(private contactService: ContactService) {}

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
          const map = new ymaps.Map('yandex-map', {
            center: [56.3269, 44.0075], // Координаты Афонино
            zoom: 15
          });

          const placemark = new ymaps.Placemark([56.3269, 44.0075], {
            balloonContent: 'Motomarket52<br>ул. Магистральная, 21А/к3'
          });

          map.geoObjects.add(placemark);
        });
      }
    }, 1000);
  }

  onSubmit() {
    this.contactService.sendMessage(this.contactForm).subscribe(() => {
      this.submitted = true;
      this.contactForm = { name: '', email: '', phone: '', message: '' };
      setTimeout(() => {
        this.submitted = false;
      }, 3000);
    });
  }
}
