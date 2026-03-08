import { useState, useEffect, useCallback } from 'react';

export interface AppNotification {
    id: string;
    type: 'archive' | 'info' | 'success';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
    data?: any;
}

const STORAGE_KEY = 'qms_notifications';
const EVENT_KEY = 'qms-notification-update';

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Helper to load current state
    const loadFromStorage = useCallback(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse notifications", e);
                return [];
            }
        }
        return [];
    }, []);

    // Initial load and event listener
    useEffect(() => {
        // Initial load
        setFiles(loadFromStorage());

        // Listen for updates from other components
        const handleUpdate = () => {
            setFiles(loadFromStorage());
        };

        window.addEventListener(EVENT_KEY, handleUpdate);
        return () => window.removeEventListener(EVENT_KEY, handleUpdate);
    }, [loadFromStorage]);

    // Internal setter that also triggers the event
    const updateNotifications = (newNotifs: AppNotification[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotifs));
        setNotifications(newNotifs); // Update local state immediately
        window.dispatchEvent(new Event(EVENT_KEY)); // Notify others
    };

    const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
        const current = loadFromStorage();
        const newNotif: AppNotification = {
            ...notif,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            read: false
        };
        updateNotifications([newNotif, ...current]);
    };

    const markAsRead = (id: string) => {
        const current = loadFromStorage();
        const updated = current.map((n: AppNotification) => n.id === id ? { ...n, read: true } : n);
        updateNotifications(updated);
    };

    const removeNotification = (id: string) => {
        const current = loadFromStorage();
        const updated = current.filter((n: AppNotification) => n.id !== id);
        updateNotifications(updated);
    };

    const clearAll = () => {
        updateNotifications([]);
    };

    // Need to define setFiles as setNotifications wrapper for the useEffect above
    // Actually, let's just use setNotifications directly in useEffect
    function setFiles(data: AppNotification[]) {
        setNotifications(data);
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        removeNotification,
        clearAll
    };
}
