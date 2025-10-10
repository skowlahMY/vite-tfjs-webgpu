// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import './index.css'
import App from './App.jsx'
import Basic from './pages/Basic.jsx';
import QwenPage from './pages/QwenPage.jsx';
import GranitePage from './pages/GranitePage.jsx';
import GraniteChatbotPage from './pages/GraniteChatbotPage.jsx';
// import GraniteRagPage from './pages/GraniteRagPage.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/basic",
    element: <Basic />,
  },
  {
    path: "/qwen",
    element: <QwenPage />,
  },
  {
    path: "/granite",
    element: <GranitePage />,
  },
  {
    path: "/granitechatbot",
    element: <GraniteChatbotPage />,
  },
]);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
