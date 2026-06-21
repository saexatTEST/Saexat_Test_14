import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Lang = 'ru' | 'uz' | 'en';

const translations: Record<string, Record<Lang, string>> = {
  // Brand
  hotelName: { ru: 'Отель Саёхат', uz: 'Sayohat Mehmonxonasi', en: 'Sayohat Hotel' },
  roomManagement: { ru: 'Управление номерами и бронированиями', uz: 'Xonalar va bronlarni boshqarish', en: 'Rooms & Bookings Management' },

  // Summary cards
  totalRooms: { ru: 'Всего номеров', uz: 'Jami xonalar', en: 'Total Rooms' },
  available: { ru: 'Свободные', uz: "Bo'sh xonalar", en: 'Available' },
  confirmed: { ru: 'Подтверждённые', uz: 'Tasdiqlangan', en: 'Confirmed' },
  pendingLabel: { ru: 'Ожидают подтверждения', uz: 'Tasdiq kutilmoqda', en: 'Awaiting Confirmation' },
  bookedLabel: { ru: 'Забронированы', uz: 'Band qilingan', en: 'Booked' },
  inHouse: { ru: 'Проживают', uz: 'Yashayapti', en: 'In House' },
  checkedOutLabel: { ru: 'Выехали', uz: 'Chiqib ketgan', en: 'Checked Out' },
  maintenanceLabel: { ru: 'На обслуживании', uz: 'Texnik xizmatda', en: 'Maintenance' },

  // Status pills
  filterByStatus: { ru: 'Фильтр по статусу', uz: "Holat bo'yicha filtr", en: 'Filter by status' },
  all: { ru: 'Все', uz: 'Barchasi', en: 'All' },

  // Grid
  roomCategory: { ru: 'Номер / Категория', uz: 'Xona / Turkum', en: 'Room / Category' },
  room: { ru: 'Номер', uz: 'Xona', en: 'Room' },
  rooms: { ru: 'номеров', uz: 'ta xona', en: 'rooms' },
  person: { ru: 'Гость', uz: 'Mehmon', en: 'Guest' },

  // Booking modal
  newBooking: { ru: 'Новое бронирование', uz: 'Yangi bron', en: 'New Booking' },
  editBooking: { ru: 'Редактировать бронирование', uz: 'Bronni tahrirlash', en: 'Edit Booking' },
  guestName: { ru: 'Имя гостя', uz: 'Mehmon ismi', en: 'Guest Name' },
  fullName: { ru: 'Полное имя гостя', uz: "Mehmonning to'liq ismi", en: 'Full guest name' },
  firstName: { ru: 'Имя', uz: 'Ism', en: 'First Name' },
  lastName: { ru: 'Фамилия', uz: 'Familiya', en: 'Last Name' },
  firstNamePlaceholder: { ru: 'Введите имя', uz: 'Ismni kiriting', en: 'Enter first name' },
  lastNamePlaceholder: { ru: 'Введите фамилию', uz: 'Familiyani kiriting', en: 'Enter last name' },
  phone: { ru: 'Телефон', uz: 'Telefon raqami', en: 'Phone' },
  email: { ru: 'Электронная почта', uz: 'Elektron pochta', en: 'Email' },
  whatsapp: { ru: 'WhatsApp', uz: 'WhatsApp', en: 'WhatsApp' },
  telegram: { ru: 'Telegram', uz: 'Telegram', en: 'Telegram' },
  instagram: { ru: 'Instagram', uz: 'Instagram', en: 'Instagram' },
  contactMethods: { ru: 'Способы связи', uz: "Bog'lanish usullari", en: 'Contact methods' },
  telegramPlaceholder: { ru: '@username', uz: '@username', en: '@username' },
  instagramPlaceholder: { ru: '@username', uz: '@username', en: '@username' },
  checkIn: { ru: 'Дата заезда', uz: 'Kirish sanasi', en: 'Check-in Date' },
  checkOut: { ru: 'Дата выезда', uz: 'Chiqish sanasi', en: 'Check-out Date' },
  guests: { ru: 'Кол-во гостей', uz: 'Mehmonlar soni', en: 'Guests' },
  status: { ru: 'Статус брони', uz: 'Bron holati', en: 'Booking Status' },
  notes: { ru: 'Дополнительные заметки', uz: "Qo'shimcha eslatmalar", en: 'Additional notes' },
  specialRequests: { ru: 'Особые пожелания гостя…', uz: "Mehmonning maxsus so'rovlari…", en: 'Special guest requests…' },

  // Buttons
  cancel: { ru: 'Отмена', uz: 'Bekor qilish', en: 'Cancel' },
  save: { ru: 'Сохранить', uz: 'Saqlash', en: 'Save' },
  delete: { ru: 'Удалить', uz: "O'chirish", en: 'Delete' },
  back: { ru: 'Назад', uz: 'Orqaga', en: 'Back' },
  confirm: { ru: 'Подтвердить', uz: 'Tasdiqlash', en: 'Confirm' },

  // Toasts
  bookingSaved: { ru: 'Бронирование успешно сохранено', uz: 'Bron muvaffaqiyatli saqlandi', en: 'Booking saved successfully' },
  bookingDeleted: { ru: 'Бронирование удалено', uz: "Bron o'chirildi", en: 'Booking deleted' },

  // Delete reason flow
  deleteBookingTitle: { ru: 'Удаление бронирования', uz: "Bronni o'chirish", en: 'Delete Booking' },
  deleteBookingSubtitle: { ru: 'Это действие нельзя отменить. Пожалуйста, укажите причину.', uz: 'Bu amalni bekor qilib bo‘lmaydi. Iltimos, sababini ko‘rsating.', en: 'This action cannot be undone. Please provide a reason.' },
  reasonLabel: { ru: 'Причина удаления', uz: "O'chirish sababi", en: 'Reason for deletion' },
  reasonPlaceholder: { ru: 'Опишите подробно, почему вы удаляете эту бронь…', uz: "Bu bronni nima uchun o'chirayotganingizni batafsil yozing…", en: 'Describe in detail why you are deleting this booking…' },
  reasonRequired: { ru: 'Пожалуйста, укажите причину (минимум 10 символов).', uz: "Iltimos, sababini ko'rsating (kamida 10 belgi).", en: 'Please provide a reason (at least 10 characters).' },
  reasonPreset: { ru: 'Быстрый выбор', uz: 'Tez tanlash', en: 'Quick select' },
  reasonGuestCancelled: { ru: 'Гость отменил бронь', uz: 'Mehmon bronni bekor qildi', en: 'Guest cancelled booking' },
  reasonNoShow: { ru: 'Гость не заехал (no-show)', uz: 'Mehmon kelmadi (no-show)', en: 'Guest no-show' },
  reasonDuplicate: { ru: 'Дубликат бронирования', uz: 'Takroriy bron', en: 'Duplicate booking' },
  reasonError: { ru: 'Ошибка при создании', uz: 'Yaratishdagi xatolik', en: 'Created in error' },
  reasonOther: { ru: 'Другая причина', uz: 'Boshqa sabab', en: 'Other reason' },
  bookingSummary: { ru: 'Что будет удалено', uz: "Nima o'chiriladi", en: 'What will be deleted' },
  iUnderstand: { ru: 'Я понимаю, что это действие необратимо', uz: 'Bu amal qaytarib bo‘lmasligini tushunaman', en: 'I understand this action is permanent' },
  confirmDelete: { ru: 'Удалить навсегда', uz: 'Butunlay o‘chirish', en: 'Delete permanently' },

  // Misc
  copyright: { ru: '© 2026 Отель Саёхат · Все права защищены', uz: '© 2026 Sayohat Mehmonxonasi · Barcha huquqlar himoyalangan', en: '© 2026 Sayohat Hotel · All rights reserved' },
  jumpToToday: { ru: 'К сегодняшней дате', uz: 'Bugungi sanaga', en: 'Jump to today' },
  today: { ru: 'Сегодня', uz: 'Bugun', en: 'Today' },
  checkInOutInfo: { ru: 'Заезд с 14:00 · Выезд до 12:00', uz: 'Kirish 14:00 dan · Chiqish 12:00 gacha', en: 'Check-in from 14:00 · Check-out by 12:00' },
  nightsShort: { ru: 'ноч.', uz: 'kecha', en: 'nt.' },
  tilesView: { ru: 'Сетка номеров', uz: 'Xonalar panjarasi', en: 'Tile View' },
  timelineView: { ru: 'Календарь броней', uz: 'Bronlar taqvimi', en: 'Timeline View' },
  viewOnGrid: { ru: 'Показать на сетке', uz: 'Panjarada koʻrsatish', en: 'View on grid' },

  // Category & room management (NEW)
  addCategory: { ru: 'Новая категория', uz: 'Yangi turkum', en: 'New Category' },
  addCategoryTitle: { ru: 'Добавить категорию номеров', uz: "Xona turkumini qo'shish", en: 'Add Room Category' },
  addRoom: { ru: 'Добавить номер', uz: "Xona qo'shish", en: 'Add Room' },
  addRoomTitle: { ru: 'Новый номер', uz: 'Yangi xona', en: 'New Room' },
  categoryName: { ru: 'Название категории', uz: 'Turkum nomi', en: 'Category Name' },
  categoryNamePlaceholder: { ru: 'Например: Люкс Люкс', uz: 'Masalan: Lyuks Lyuks', en: 'e.g. Royal Suite' },
  shortCode: { ru: 'Короткий код', uz: 'Qisqa kod', en: 'Short Code' },
  shortCodePlaceholder: { ru: 'Например: STD DBL', uz: 'Masalan: STD DBL', en: 'e.g. STD DBL' },
  maxGuests: { ru: 'Макс. гостей', uz: 'Maks. mehmonlar', en: 'Max Guests' },
  roomNumber: { ru: 'Номер комнаты', uz: 'Xona raqami', en: 'Room Number' },
  roomNumberPlaceholder: { ru: 'Например: 106', uz: 'Masalan: 106', en: 'e.g. 106' },
  category: { ru: 'Категория', uz: 'Turkum', en: 'Category' },
  create: { ru: 'Создать', uz: 'Yaratish', en: 'Create' },
  deleteCategory: { ru: 'Удалить категорию', uz: "Turkumni o'chirish", en: 'Delete category' },
  deleteRoom: { ru: 'Удалить номер', uz: "Xonani o'chirish", en: 'Delete room' },
  categoryCreated: { ru: 'Категория создана', uz: 'Turkum yaratildi', en: 'Category created' },
  roomCreated: { ru: 'Номер создан', uz: 'Xona yaratildi', en: 'Room created' },
  categoryDeleted: { ru: 'Категория удалена', uz: "Turkum o'chirildi", en: 'Category deleted' },
  roomDeleted: { ru: 'Номер удалён', uz: "Xona o'chirildi", en: 'Room deleted' },
  roomExists: { ru: 'Номер с таким кодом уже существует', uz: 'Bunday raqamli xona allaqachon mavjud', en: 'A room with this number already exists' },
  invalidNumber: { ru: 'Введите положительное число', uz: 'Musbat son kiriting', en: 'Enter a positive number' },

  // Anketa
  openAnketa: { ru: 'Открыть Анкету', uz: 'Anketani ochish', en: 'Open Registration Form' },
  anketaAvailableHint: { ru: 'Анкета доступна после выезда гостя', uz: 'Anketa mehmon chiqib ketgandan keyin mavjud', en: 'Form is available after guest checkout' },
  anketaTitle: { ru: 'Анкета заселяющегося гостя', uz: "Joylashayotgan mehmon anketasi", en: "Guest Registration Form" },
  anketaSubtitle: { ru: 'Гостиница «Саёхат» · Регистрационная карточка', uz: '«Sayohat» mehmonxonasi · Roʻyxatga olish kartasi', en: 'Sayohat Hotel · Registration card' },
  anketaProgress: { ru: 'Заполнено', uz: "To'ldirildi", en: 'Completed' },
  anketaPersonal: { ru: 'Личные данные', uz: 'Shaxsiy maʼlumotlar', en: 'Personal data' },
  anketaFullName: { ru: 'Ф.И.О.', uz: 'F.I.SH.', en: 'Full Name' },
  anketaBirthDate: { ru: 'Дата рождения', uz: 'Tugʻilgan sana', en: 'Date of Birth' },
  anketaBirthPlace: { ru: 'Место рождения', uz: 'Tugʻilgan joyi', en: 'Place of Birth' },
  anketaPassport: { ru: 'Паспортные данные', uz: 'Pasport maʼlumotlari', en: 'Passport Data' },
  anketaPassportNumber: { ru: 'Паспорт №', uz: 'Pasport №', en: 'Passport No.' },
  anketaPassportIssued: { ru: 'Дата выдачи', uz: 'Berilgan sana', en: 'Issue Date' },
  anketaPassportValid: { ru: 'Действителен до', uz: 'Amal qilish muddati', en: 'Valid Until' },
  anketaOriginContact: { ru: 'Прибытие и контакты', uz: 'Kelish va aloqa', en: 'Arrival & Contact' },
  anketaArrivedFrom: { ru: 'Откуда прибыл', uz: 'Qayerdan keldi', en: 'Arrived From' },
  anketaCitizenship: { ru: 'Гражданство', uz: 'Fuqaroligi', en: 'Citizenship' },
  anketaStay: { ru: 'Проживание', uz: 'Yashash maʼlumotlari', en: 'Stay Details' },
  anketaCheckIn: { ru: 'Дата въезда', uz: 'Kirish sanasi', en: 'Check-in Date' },
  anketaCheckOut: { ru: 'Дата выезда', uz: 'Chiqish sanasi', en: 'Check-out Date' },
  anketaRoomNumber: { ru: '№ комнаты', uz: 'Xona raqami', en: 'Room No.' },
  anketaRoomType: { ru: 'Тип номера', uz: 'Xona turi', en: 'Room Type' },
  anketaRoomTypeStandard: { ru: 'Стандарт', uz: 'Standart', en: 'Standard' },
  anketaRoomTypeSemiLux: { ru: 'Полулюкс', uz: 'Yarim lyuks', en: 'Semi-Lux' },
  anketaRules: { ru: 'Правила размещения', uz: 'Joylashish qoidalari', en: 'Accommodation Rules' },
  anketaConsent: { ru: 'Ознакомление и подпись', uz: 'Tanishish va imzo', en: 'Consent & Signature' },
  anketaSignature: { ru: 'Подпись (ФИО)', uz: 'Imzo (FIO)', en: 'Signature (Full Name)' },
  anketaAcknowledge: { ru: 'Я ознакомлен(а) с правилами размещения и подтверждаю достоверность данных.', uz: 'Joylashish qoidalari bilan tanishdim va maʼlumotlarning haqiqiyligini tasdiqlayman.', en: 'I have read the accommodation rules and confirm the accuracy of the data.' },
  anketaAutosaveHint: { ru: 'Анкета сохраняется локально к этому бронированию', uz: 'Anketa shu bronlash uchun lokal saqlanadi', en: 'Form is saved locally for this booking' },
  anketaPrint: { ru: 'Печать', uz: 'Chop etish', en: 'Print' },
  anketaSubmit: { ru: 'Сохранить анкету', uz: 'Anketani saqlash', en: 'Save Form' },
  anketaSaved: { ru: 'Анкета сохранена', uz: 'Anketa saqlandi', en: 'Form saved' },
  anketaIncomplete: { ru: 'Заполните обязательные поля и подтвердите согласие', uz: "Majburiy maydonlarni to'ldiring va roziligingizni tasdiqlang", en: 'Please complete all required fields and confirm consent' },
  anketaSigDraw: { ru: 'Нарисовать', uz: 'Chizish', en: 'Draw' },
  anketaSigType: { ru: 'Напечатать', uz: 'Yozish', en: 'Type' },
  anketaSigClear: { ru: 'Очистить', uz: 'Tozalash', en: 'Clear' },
  anketaSigHint: { ru: 'Подпишите здесь — мышью, пальцем или внешним пером', uz: 'Shu yerga imzo qoʻying — sichqoncha, barmoq yoki tashqi qalam bilan', en: 'Sign here — mouse, finger or external pen' },
  anketaSigTypeHint: { ru: 'Введённое имя будет использовано как подпись', uz: 'Kiritilgan ism imzo sifatida ishlatiladi', en: 'The typed name will be used as the signature' },

  // External USB signature pad (WebHID)
  hidConnect: { ru: 'Подключить устройство', uz: 'Qurilmani ulash', en: 'Connect device' },
  hidConnected: { ru: 'Устройство подключено', uz: 'Qurilma ulangan', en: 'Device connected' },
  hidDisconnect: { ru: 'Отключить', uz: 'Uzish', en: 'Disconnect' },
  hidUnsupported: { ru: 'Браузер не поддерживает WebHID', uz: 'Brauzer WebHID-ni qo\'llab-quvvatlamaydi', en: 'Browser does not support WebHID' },
  hidHint: { ru: 'Подключите внешний планшет для подписи через USB', uz: 'Imzo uchun tashqi planshetni USB orqali ulang', en: 'Connect an external USB signature tablet' },

  // Unsaved-changes close warning
  unsavedTitle: { ru: 'Закрыть без сохранения?', uz: 'Saqlamasdan yopilsinmi?', en: 'Close without saving?' },
  unsavedMessage: { ru: 'Вы внесли изменения в анкету. Если закрыть сейчас, они будут потеряны.', uz: 'Anketada o\'zgarishlar mavjud. Hozir yopsangiz, ular yo\'qoladi.', en: 'You have unsaved changes in the form. Closing now will discard them.' },
  unsavedKeep: { ru: 'Продолжить заполнение', uz: 'Davom etish', en: 'Keep editing' },
  unsavedDiscard: { ru: 'Закрыть и потерять', uz: 'Yopish va o\'chirish', en: 'Close and discard' },

  // Patronymic / extra name
  middleName: { ru: 'Отчество', uz: 'Otasining ismi', en: 'Patronymic' },
  middleNamePlaceholder: { ru: 'Введите отчество', uz: 'Otasining ismini kiriting', en: 'Enter patronymic' },

  // Status cycle button
  advanceStatus: { ru: 'Следующий статус', uz: 'Keyingi holat', en: 'Advance status' },
  currentStatus: { ru: 'Текущий статус', uz: 'Joriy holat', en: 'Current status' },

  // Arrival/departure timing segmented group
  arrivalTiming: { ru: 'Время заезда', uz: 'Kirish vaqti', en: 'Arrival time' },
  departureTiming: { ru: 'Время выезда', uz: 'Chiqish vaqti', en: 'Departure time' },
  earlyOption: { ru: 'Ранний', uz: 'Ertaroq', en: 'Early' },
  standardOption: { ru: 'Стандарт', uz: 'Standart', en: 'Standard' },
  lateOption: { ru: 'Поздний', uz: 'Kechki', en: 'Late' },

  // Booking bar / drag UI
  lateBadge: { ru: 'ПОЗДНИЙ', uz: 'KECH', en: 'LATE' },
  earlyBadge: { ru: 'РАННИЙ', uz: 'ERTA', en: 'EARLY' },
  lateCheckoutTitle: { ru: 'Поздний выезд', uz: 'Kechki chiqish', en: 'Late checkout' },
  earlyCheckinTitle: { ru: 'Ранний заезд', uz: 'Ertaroq kirish', en: 'Early check-in' },
  dragToExtend: { ru: 'Перетащите чтобы продлить', uz: "Cho'zish uchun torting", en: 'Drag to extend' },
  dragToEarly: { ru: 'Перетащите для раннего заезда', uz: 'Erta kirish uchun torting', en: 'Drag for early check-in' },
  detailedInfo: { ru: 'Подробная информация', uz: "Batafsil ma'lumot", en: 'Detailed information' },
  nightsWord: { ru: 'ночей', uz: 'kecha', en: 'nights' },
  nightsLetter: { ru: 'н', uz: 'k', en: 'n' },
  guestsWord: { ru: 'гостей', uz: 'mehmon', en: 'guests' },
  showBeds: { ru: 'Показать кровати', uz: "Yotoqlarni ko'rsatish", en: 'Show beds' },
  addGuest: { ru: 'Добавить гостя', uz: "Mehmon qo'shish", en: 'Add guest' },
  removeGuest: { ru: 'Удалить гостя', uz: "Mehmonni olib tashlash", en: 'Remove guest' },
  roomTypeLabel: { ru: 'Комната / Тип', uz: 'Xona / Turi', en: 'Room / Type' },
  pastBookingError: { ru: 'Бронирование возможно только с сегодняшней даты', uz: 'Bron faqat bugundan boshlab mumkin', en: 'Bookings can only be created from today onwards' },
  overlapError: { ru: "You can't put another booking in this place", uz: "You can't put another booking in this place", en: "You can't put another booking in this place" },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  /**
   * Switch the persistence scope so the language preference is bound to a
   * specific user (admin / director / manager / superuser). Pass `null` when
   * nobody is signed in to fall back to the global default key.
   */
  setUserScope: (username: string | null) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ru', setLang: () => {}, t: (k) => k, setUserScope: () => {},
});

const GLOBAL_KEY = 'sayohat-lang';
const userKey = (u: string) => `sayohat-lang:${u.toLowerCase()}`;

function readLang(key: string): Lang | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  return raw === 'ru' || raw === 'uz' || raw === 'en' ? raw : null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ru');
  // Persistence scope — which user the chosen language belongs to. When set,
  // the language is locked to that user's preference and never overwritten by
  // another user's choice.
  const [scope, setScope] = useState<string | null>(null);

  // Hydrate from storage on first mount (no user yet → global default).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = readLang(GLOBAL_KEY);
    if (saved) setLang(saved);
  }, []);

  // When the active user changes, load THEIR preferred language. If they have
  // none saved yet, keep the current value and persist it as their preference,
  // so from that moment on the app is 100% locked to that language for them.
  const setUserScope = useCallback((username: string | null) => {
    setScope(username);
    if (typeof window === 'undefined') return;
    if (username) {
      const saved = readLang(userKey(username));
      if (saved) {
        setLang(saved);
      } else {
        // Seed with whatever is currently active so the next session restores it.
        setLang((cur) => {
          window.localStorage.setItem(userKey(username), cur);
          return cur;
        });
      }
    }
  }, []);

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GLOBAL_KEY, l);
    if (scope) window.localStorage.setItem(userKey(scope), l);
  }, [scope]);

  const t = useCallback((key: string) => translations[key]?.[lang] || key, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t, setUserScope }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() { return useContext(I18nContext); }

