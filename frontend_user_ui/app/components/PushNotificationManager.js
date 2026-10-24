'use client';

import { useEffect, useState, useCallback } from 'react';
import { notificationAPI } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Subscribe using PushManager
  const subscribeToPush = useCallback(async (registration) => {
    try {
      setIsSubscribing(true);

      // 1. Get VAPID public key
      let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        const res = await notificationAPI.getVapidPublicKey();
        publicKey = res?.publicKey;
      }

      if (!publicKey) {
        console.warn('[Push] VAPID public key not found');
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      // 2. Get existing or create new push subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 3. Send subscription to backend
      const subscriptionJson = subscription.toJSON();
      await notificationAPI.subscribePush(subscriptionJson);

      setStatusMessage('नोटिफिकेशन चालू हो गए हैं!');
      setTimeout(() => {
        setStatusMessage('');
        setShowPrompt(false);
      }, 2500);
      console.log('[Push] Successfully subscribed to push notifications');
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  useEffect(() => {
    // Push notifications require service worker & PushManager & Notification
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return;
    }

    const checkSubscriptionState = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        if (Notification.permission === 'granted') {
          // Permission is already granted — ensure subscription is active & synced with backend
          await subscribeToPush(registration);
        } else if (Notification.permission === 'default') {
          // Check if dismissed recently (within 2 days)
          const dismissedAt = localStorage.getItem('push_prompt_dismissed_at');
          if (dismissedAt) {
            const timeSince = Date.now() - parseInt(dismissedAt, 10);
            if (timeSince < 48 * 60 * 60 * 1000) {
              return;
            }
          }

          // Show prompt after a short gentle delay (2.5 seconds)
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 2500);

          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.warn('[Push] Check error:', err);
      }
    };

    checkSubscriptionState();
  }, [user, subscribeToPush]);

  const handleEnablePush = async () => {
    try {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await subscribeToPush(registration);
      } else {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('[Push] Permission request error:', err);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('push_prompt_dismissed_at', String(Date.now()));
    } catch (e) {}
  };

  if (!showPrompt && !statusMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-gradient-to-r from-gray-950 via-zinc-900 to-gray-950 p-4 text-white shadow-2xl backdrop-blur pointer-events-auto transition-all animate-bounce-in">
        {statusMessage ? (
          <div className="flex items-center space-x-3 text-emerald-400 font-medium py-1">
            <span className="text-xl">✅</span>
            <span>{statusMessage}</span>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    रिजल्ट और ऑफर्स तुरंत पाएं!
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    फरीदाबाद, गाजियाबाद, गली, देसावर का रिजल्ट आते ही स्क्रीन पर नोटिफिकेशन पाएं।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-zinc-400 hover:text-white p-1 text-sm font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                बाद में
              </button>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1.5 text-xs font-bold text-black shadow hover:from-amber-400 hover:to-yellow-400 transition disabled:opacity-50"
              >
                {isSubscribing ? 'चालू हो रहा है...' : '🔔 नोटिफिकेशन चालू करें'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
