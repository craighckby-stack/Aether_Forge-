import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { ToasterOverlay } from "../components/ToasterOverlay";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem["type"]) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  const activeToastRef = useRef<ToastItem | null>(null);
  const queueRef = useRef<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    if (activeToastRef.current?.id === id) {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        activeToastRef.current = next;
        setToasts([next]); // Mount the next one in the queue
      } else {
        activeToastRef.current = null;
        setToasts([]);
      }
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    
    if (!activeToastRef.current) {
      activeToastRef.current = newToast;
      setToasts([newToast]);
    } else {
      queueRef.current.push(newToast);
      // Cap queue to 4 latest messages to avoid endless backlog
      if (queueRef.current.length > 4) {
        queueRef.current.shift();
      }
    }
  }, []);

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, "warning"), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, "info"), [addToast]);

  // Handle system-wide custom events for non-React callers
  useEffect(() => {
    const handleAfToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastItem["type"] }>;
      if (customEvent.detail) {
        const { message, type } = customEvent.detail;
        addToast(message, type);
      }
    };

    window.addEventListener("af-toast", handleAfToast);
    return () => window.removeEventListener("af-toast", handleAfToast);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToasterOverlay toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

