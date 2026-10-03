import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider, useStore } from './store.jsx';
import Login from './Login.jsx';
import App from './App.jsx';
import './styles.css';

/* 沒登入就顯示登入畫面，登入後才進 App */
function Gate(){ const { session } = useStore(); return session ? <App /> : <Login />; }

createRoot(document.getElementById('root')).render(<StoreProvider><Gate /></StoreProvider>);
