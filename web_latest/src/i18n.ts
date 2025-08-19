import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "searchInvoices": "Search Invoices",
      "failedInvoices": "Failed Invoices (Week)",
      "analyzeInvoices": "Analyze Invoices",
      "dashboardOverview": "Dashboard Overview",
      "welcome": "Welcome to the Invoice Processing Dashboard",
      "settings": "Settings",
      "language": "Language",
      "signOut": "Sign Out",
      "region": "Region",
      "country": "Country",
      "vendor": "Vendor",
      "receivedFrom": "Recd. From",
      "receivedTo": "Recd. To",
      "search": "Search",
      "reset": "Reset",
      "totalProcessed": "Total Processed",
      "success": "Success",
      "failed": "Failed",
      "processingTrend": "Processing Trend",
      "top5Fields": "Top 5 Fields that require attention",
      "header": "Header",
      "lineItems": "Line Items",
      "taxData": "Tax Data",
      "invoices": "Invoices"
    }
  },
  pl: {
    translation: {
      "dashboard": "Panel główny",
      "searchInvoices": "Wyszukaj faktury",
      "failedInvoices": "Błędne faktury (tydzień)",
      "analyzeInvoices": "Analizuj faktury",
      "dashboardOverview": "Przegląd panelu",
      "welcome": "Witamy w panelu przetwarzania faktur",
      "settings": "Ustawienia",
      "language": "Język",
      "signOut": "Wyloguj się",
      "region": "Region",
      "country": "Kraj",
      "vendor": "Dostawca",
      "receivedFrom": "Otrzymano od",
      "receivedTo": "Otrzymano do",
      "search": "Szukaj",
      "reset": "Reset",
      "totalProcessed": "Łącznie przetworzono",
      "success": "Sukces",
      "failed": "Błąd",
      "processingTrend": "Trend przetwarzania",
      "top5Fields": "Top 5 pól wymagających uwagi",
      "header": "Nagłówek",
      "lineItems": "Pozycje",
      "taxData": "Dane podatkowe",
      "invoices": "Faktury"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;