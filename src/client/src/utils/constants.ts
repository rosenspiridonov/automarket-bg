export const FUEL_TYPES = [
  'Petrol', 'Diesel', 'Electric', 'Hybrid', 'PlugInHybrid', 'LPG', 'CNG',
] as const;

export const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'SemiAutomatic'] as const;

export const BODY_TYPES = [
  'Sedan', 'Hatchback', 'SUV', 'Coupe', 'Wagon', 'Van', 'Convertible', 'Pickup', 'Minivan',
] as const;

export const DRIVE_TYPES = ['FWD', 'RWD', 'AWD'] as const;

export const CONDITIONS = ['New', 'Used', 'ForParts'] as const;

export const COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green',
  'Yellow', 'Orange', 'Brown', 'Beige', 'Gold', 'Purple', 'Other',
] as const;

export const FUEL_TYPE_LABELS: Record<string, string> = {
  Petrol: 'Бензин',
  Diesel: 'Дизел',
  Electric: 'Електрически',
  Hybrid: 'Хибрид',
  PlugInHybrid: 'Plug-in хибрид',
  LPG: 'Газ (LPG)',
  CNG: 'Метан (CNG)',
};

export const TRANSMISSION_LABELS: Record<string, string> = {
  Manual: 'Ръчна',
  Automatic: 'Автоматична',
  SemiAutomatic: 'Полуавтоматична',
};

export const BODY_TYPE_LABELS: Record<string, string> = {
  Sedan: 'Седан', Hatchback: 'Хечбек', SUV: 'Джип / SUV', Coupe: 'Купе',
  Wagon: 'Комби', Van: 'Ван', Convertible: 'Кабрио', Pickup: 'Пикап', Minivan: 'Миниван',
};

export const DRIVE_TYPE_LABELS: Record<string, string> = { FWD: 'Предно', RWD: 'Задно', AWD: '4x4' };

export const CONDITION_LABELS: Record<string, string> = { New: 'Нов', Used: 'Употребяван', ForParts: 'За части' };

export const COLOR_LABELS: Record<string, string> = {
  Black: 'Черен', White: 'Бял', Silver: 'Сребрист', Gray: 'Сив',
  Red: 'Червен', Blue: 'Син', Green: 'Зелен', Yellow: 'Жълт',
  Orange: 'Оранжев', Brown: 'Кафяв', Beige: 'Бежов', Gold: 'Златист',
  Purple: 'Лилав', Other: 'Друг',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Най-нови' },
  { value: 'price_asc', label: 'Цена: ниска към висока' },
  { value: 'price_desc', label: 'Цена: висока към ниска' },
  { value: 'year_desc', label: 'Година: най-нови' },
  { value: 'year_asc', label: 'Година: най-стари' },
  { value: 'mileage_asc', label: 'Пробег: най-малък' },
] as const;
