import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadLanguage } from '@/lib/storage';
import App from './App';
import '@/assets/tailwind.css';

// Popup theo sáng/tối của hệ thống.
const dark = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.classList.toggle('dark', dark.matches);
dark.addEventListener('change', applyTheme);
applyTheme();

// Đọc ngôn ngữ trước khi vẽ, để popup không hiện tiếng Việt một nhịp rồi mới đổi sang tiếng Anh.
loadLanguage().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
