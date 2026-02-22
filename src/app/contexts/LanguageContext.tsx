import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "es" | "fr" | "hi" | "zh" | "ar";

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  // Navigation
  "dashboard": {
    en: "Dashboard",
    es: "Panel de Control",
    fr: "Tableau de Bord",
    hi: "डैशबोर्ड",
    zh: "仪表板",
    ar: "لوحة القيادة"
  },
  "login": {
    en: "Login",
    es: "Iniciar Sesión",
    fr: "Connexion",
    hi: "लॉग इन",
    zh: "登录",
    ar: "تسجيل الدخول"
  },
  "register": {
    en: "Register",
    es: "Registrarse",
    fr: "S'inscrire",
    hi: "रजिस्टर करें",
    zh: "注册",
    ar: "التسجيل"
  },
  "sos": {
    en: "SOS",
    es: "SOS",
    fr: "SOS",
    hi: "एसओएस",
    zh: "紧急求助",
    ar: "استغاثة"
  },
  "emergency": {
    en: "Emergency",
    es: "Emergencia",
    fr: "Urgence",
    hi: "आपातकालीन",
    zh: "紧急",
    ar: "طوارئ"
  },
  "police": {
    en: "Police",
    es: "Policía",
    fr: "Police",
    hi: "पुलिस",
    zh: "警察",
    ar: "الشرطة"
  },
  "victim": {
    en: "Victim",
    es: "Víctima",
    fr: "Victime",
    hi: "पीड़ित",
    zh: "受害者",
    ar: "ضحية"
  },
  "live_stream": {
    en: "Live Stream",
    es: "Transmisión en Vivo",
    fr: "Diffusion en Direct",
    hi: "लाइव स्ट्रीम",
    zh: "直播流",
    ar: "البث المباشر"
  },
  "chat": {
    en: "Chat",
    es: "Chat",
    fr: "Chat",
    hi: "चैट",
    zh: "聊天",
    ar: "دردشة"
  },
  "location": {
    en: "Location",
    es: "Ubicación",
    fr: "Localisation",
    hi: "स्थान",
    zh: "位置",
    ar: "الموقع"
  },
  "notifications": {
    en: "Notifications",
    es: "Notificaciones",
    fr: "Notifications",
    hi: "सूचनाएं",
    zh: "通知",
    ar: "الإشعارات"
  },
  "settings": {
    en: "Settings",
    es: "Configuración",
    fr: "Paramètres",
    hi: "सेटिंग्स",
    zh: "设置",
    ar: "الإعدادات"
  },
  "help": {
    en: "Help",
    es: "Ayuda",
    fr: "Aide",
    hi: "सहायता",
    zh: "帮助",
    ar: "مساعدة"
  },
  "logout": {
    en: "Logout",
    es: "Cerrar Sesión",
    fr: "Déconnexion",
    hi: "लॉग आउट",
    zh: "登出",
    ar: "تسجيل الخروج"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  getAvailableLanguages: () => { code: Language; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && translations[savedLang]) return savedLang;
    
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    const langMap: { [key: string]: Language } = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'hi': 'hi',
      'zh': 'zh',
      'ar': 'ar'
    };
    
    return langMap[browserLang] || 'en';
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    
    // Update document direction for RTL languages
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const getAvailableLanguages = () => [
    { code: 'en' as Language, name: 'English', nativeName: 'English' },
    { code: 'es' as Language, name: 'Spanish', nativeName: 'Español' },
    { code: 'fr' as Language, name: 'French', nativeName: 'Français' },
    { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'zh' as Language, name: 'Chinese', nativeName: '中文' },
    { code: 'ar' as Language, name: 'Arabic', nativeName: 'العربية' }
  ];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getAvailableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};
