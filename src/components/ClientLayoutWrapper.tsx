"use client";

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { Toaster } from "react-hot-toast";
import Head from 'next/head';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Import Bootstrap only on client side
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
    
    // Add Font Awesome dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    link.integrity = 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==';
    link.crossOrigin = 'anonymous';
    link.referrerPolicy = 'no-referrer';
    document.head.appendChild(link);
  }, []);

  // Show loading state during hydration to prevent mismatch
  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SessionProviderWrapper>
        <Toaster />
        <LanguageInitializer>
        {children}
        </LanguageInitializer>
      </SessionProviderWrapper>
    </I18nextProvider>
  );
}

// Separate component to handle language initialization
function LanguageInitializer({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Initialize language from localStorage on client side
    const savedLang = localStorage.getItem('selectedLanguage');
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  return <>{children}</>;
} 