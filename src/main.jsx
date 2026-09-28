import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
window.global = window.global || window;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
