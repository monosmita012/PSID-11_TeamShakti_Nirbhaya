import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useEffect } from "react";
import OfflineManager from "./utils/offlineManager";

export default function App() {
  useEffect(() => {
    // Initialize offline support
    const offlineManager = OfflineManager.getInstance();
    offlineManager.initDB();
    
    // Setup online/offline listeners
    offlineManager.setupOnlineListeners((isOnline) => {
      console.log(isOnline ? 'Back online' : 'Gone offline');
    });
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </LanguageProvider>
  );
}