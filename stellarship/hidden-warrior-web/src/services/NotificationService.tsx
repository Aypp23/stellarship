'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { MedievalPanel } from '@/components/ui/MedievalPanel';
import { MedievalButton } from '@/components/ui/MedievalButton';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
}

interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: NotificationType;
}

interface NotificationContextType {
    showNotification: (notification: Omit<Notification, 'id'>) => void;
    showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
    hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        options: ConfirmDialogOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newNotification: Notification = {
            ...notification,
            id,
            duration: notification.duration ?? 3000
        };

        setNotifications(prev => [...prev, newNotification]);

        if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                hideNotification(id);
            }, newNotification.duration);
        }
    }, []);

    const hideNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showConfirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmDialog({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const handleConfirm = (result: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(result);
            setConfirmDialog(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm, hideNotification }}>
            {children}

            {/* Notifications Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-md">
                <AnimatePresence>
                    {notifications.map(notification => (
                        <NotificationToast
                            key={notification.id}
                            notification={notification}
                            onClose={() => hideNotification(notification.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {confirmDialog?.isOpen && (
                    <ConfirmDialog
                        options={confirmDialog.options}
                        onConfirm={() => handleConfirm(true)}
                        onCancel={() => handleConfirm(false)}
                    />
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
}

function NotificationToast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
    const icons = {
        info: Info,
        success: CheckCircle,
        warning: AlertCircle,
        error: XCircle
    };

    const colors = {
        info: 'text-blue-600',
        success: 'text-green-700',
        warning: 'text-yellow-700',
        error: 'text-medieval-accent'
    };

    const Icon = icons[notification.type];

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="pointer-events-auto"
        >
            <div className="bg-[#f3e5d0] border-2 border-[#3e2723] rounded-lg shadow-2xl p-4 relative min-w-[300px] max-w-md">
                {/* Medieval corner decorations */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-medieval-gold" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-medieval-gold" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-medieval-gold" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-medieval-gold" />

                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 ${colors[notification.type]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medieval text-[#3e2723] font-bold text-sm tracking-wider">
                            {notification.title}
                        </h3>
                        {notification.message && (
                            <p className="font-medieval text-[#5d4037] text-xs mt-1 leading-relaxed">
                                {notification.message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-[#5d4037] hover:text-[#3e2723] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function ConfirmDialog({
    options,
    onConfirm,
    onCancel
}: {
    options: ConfirmDialogOptions;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const icons = {
        info: Info,
        success: CheckCircle,
        warning: AlertCircle,
        error: XCircle
    };

    const colors = {
        info: 'text-blue-600',
        success: 'text-green-700',
        warning: 'text-yellow-700',
        error: 'text-medieval-accent'
    };

    const Icon = icons[options.type || 'warning'];
    const iconColor = colors[options.type || 'warning'];

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full max-w-md"
                >
                    <MedievalPanel title={options.title}>
                        <div className="space-y-6">
                            {/* Icon and Message */}
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={`${iconColor}`}>
                                    <Icon className="w-16 h-16" />
                                </div>
                                <p className="font-medieval text-[#3e2723] text-base leading-relaxed">
                                    {options.message}
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <MedievalButton
                                    variant="secondary"
                                    fullWidth
                                    onClick={onCancel}
                                >
                                    {options.cancelText || 'CANCEL'}
                                </MedievalButton>
                                <MedievalButton
                                    variant={options.type === 'error' ? 'danger' : 'primary'}
                                    fullWidth
                                    onClick={onConfirm}
                                >
                                    {options.confirmText || 'CONFIRM'}
                                </MedievalButton>
                            </div>
                        </div>
                    </MedievalPanel>
                </motion.div>
            </div>
        </>
    );
}
