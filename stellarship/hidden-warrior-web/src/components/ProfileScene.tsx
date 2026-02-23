'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { discordApi, twitterApi, authApi } from '@/lib/apiClient';
import ConsoleNotification from './ConsoleNotification';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';
import {
  User,
  Star,
  Crown,
  Sword,
  Shield,
  Trophy,
  Settings,
  LogOut,
  Wallet,
  RefreshCw,
  ArrowLeft,
  Info,
  Skull,
  Percent,
  Zap,
  Activity
} from 'lucide-react';
import Image from 'next/image';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import NotificationBell from './NotificationBell';

interface ShadowGloryData {
  shadowGlory: number;
  rank: {
    level: number;
    name: string;
    color: string;
  };
  nextRank: {
    level: number;
    name: string;
    color: string;
    pointsNeeded: number;
  } | null;
  recentHistory: Array<{
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

export default function ProfileScene() {
  const { setScene, openModal } = useGameStore();
  const { user, stats, shadowGlory, refreshUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
  const [isDiscordStatusLoading, setIsDiscordStatusLoading] = useState(true);
  const [isTwitterStatusLoading, setIsTwitterStatusLoading] = useState(true);
  const { playButtonSound } = useSound();
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [discordStatus, setDiscordStatus] = useState<{
    isConnected: boolean;
    discordUser?: {
      id: string;
      username: string;
      discriminator: string;
      avatar?: string;
    };
  }>({ isConnected: false });
  const [twitterStatus, setTwitterStatus] = useState<{
    isConnected: boolean;
    twitterUser?: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
    };
  }>({ isConnected: false });

  // Form data for profile editing
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
  });

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    show: false,
    type: 'info',
    message: '',
  });

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsDiscordLoading(true);
    setIsTwitterLoading(true);

    try {
      await refreshUser();
      await loadDiscordStatus();
      await loadTwitterStatus();
    } finally {
      setIsRefreshing(false);
      setIsDiscordLoading(false);
      setIsTwitterLoading(false);
    }
  };

  const loadDiscordStatus = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsDiscordLoading(true);
      } else {
        setIsDiscordStatusLoading(true);
      }
      const status = await discordApi.getConnectionStatus();
      setDiscordStatus(status);
      console.log('✅ [ProfileScene] Discord status loaded:', status);
    } catch (error) {
      console.error('Failed to load Discord status:', error);
      setDiscordStatus({ isConnected: false });
    } finally {
      if (showLoading) {
        setIsDiscordLoading(false);
      } else {
        setIsDiscordStatusLoading(false);
      }
    }
  }, []);

  const loadTwitterStatus = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsTwitterLoading(true);
      } else {
        setIsTwitterStatusLoading(true);
      }
      const status = await twitterApi.getConnectionStatus();
      setTwitterStatus(status);
      console.log('✅ [ProfileScene] Twitter status loaded:', status);
    } catch (error) {
      console.error('Failed to load Twitter status:', error);
      setTwitterStatus({ isConnected: false });
    } finally {
      if (showLoading) {
        setIsTwitterLoading(false);
      } else {
        setIsTwitterStatusLoading(false);
      }
    }
  }, []);

  // Load Discord and Twitter status when component mounts
  useEffect(() => {
    if (user) {
      console.log('🔵 [ProfileScene] Loading Discord and Twitter status on mount...');

      // Load statuses immediately without loading state
      Promise.all([
        loadDiscordStatus(false),
        loadTwitterStatus(false)
      ]).catch(error => {
        console.error('Failed to load social statuses:', error);
      });

      // Load current profile data into form
      setFormData({
        displayName: user.displayName || '',
        bio: user.bio || '',
      });
    }
  }, [user, loadDiscordStatus, loadTwitterStatus]);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await authApi.updateProfile(formData);
      await refreshUser();
      console.log('✅ [ProfileScene] Profile saved successfully');
      showNotification('success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      showNotification('error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscordConnect = async () => {
    try {
      setIsDiscordLoading(true);
      setDiscordError(null);
      const { authUrl } = await discordApi.getAuthUrl();

      // Open popup with Discord OAuth
      const popup = window.open(authUrl, 'discord-auth', 'width=500,height=650');

      if (!popup) {
        console.error('Failed to open popup - popup blocker?');
        setDiscordError('Failed to open popup. Please allow popups for this site.');
        setIsDiscordLoading(false);
        return;
      }

      // Listen for popup close to refresh status
      const checkClosed = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsDiscordLoading(false);

          // Refresh Discord status after popup closes
          try {
            // Wait a bit for backend to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Refresh user first to get updated token if needed
            await refreshUser();

            // Then check Discord status
            const discord = await discordApi.getConnectionStatus();
            setDiscordStatus(discord);

            // Auto-fill displayName from Discord if current displayName is empty
            if (discord.isConnected && discord.discordUser && !formData.displayName) {
              const newDisplayName = discord.discordUser.username;
              setFormData(prev => ({ ...prev, displayName: newDisplayName }));
              console.log('✅ [ProfileScene] Auto-filled displayName from Discord:', newDisplayName);
            }

            // Show success or error based on connection status
            if (discord.isConnected) {
              // Success! No error
              setDiscordError(null);
              showNotification('success', 'Discord connected successfully!');
            }
          } catch (error) {
            console.error('Failed to refresh Discord status:', error);
            // Don't show error - just log it, connection might be successful
            // User will see the result in UI when it refreshes
          }
        }
      }, 500);

      // Clean up interval after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        setIsDiscordLoading(false);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Failed to initiate Discord connection:', error);
      setDiscordError('Failed to initiate Discord connection. Please try again.');
      setIsDiscordLoading(false);
    }
  };

  const handleTwitterConnect = async () => {
    try {
      console.log('🔵 [ProfileScene] Starting Twitter connection...');
      setIsTwitterLoading(true);
      setTwitterError(null);

      const { authUrl } = await twitterApi.getAuthUrl();
      console.log('🔵 [ProfileScene] Got auth URL:', authUrl.substring(0, 50) + '...');

      // Open popup with Twitter OAuth 1.0a
      console.log('🔵 [ProfileScene] Opening popup with URL:', authUrl.substring(0, 100) + '...');

      const popup = window.open(authUrl, 'twitter-auth', 'width=500,height=650');

      if (!popup) {
        console.error('🔴 [ProfileScene] Failed to open popup - popup blocker?');
        setTwitterError('Failed to open popup. Please allow popups for this site.');
        setIsTwitterLoading(false);
        return;
      }

      console.log('✅ [ProfileScene] Popup opened successfully');

      // Listen for popup close to refresh status
      const checkClosed = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsTwitterLoading(false);

          // Refresh Twitter status after popup closes
          try {
            // Wait a bit for backend to process
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh user first to get updated Twitter connection status
            console.log('🔵 [ProfileScene] Refreshing user data...');
            await refreshUser();

            // Then check Twitter status
            console.log('🔵 [ProfileScene] Checking Twitter status...');
            const twitter = await twitterApi.getConnectionStatus();
            setTwitterStatus(twitter);

            console.log('✅ [ProfileScene] Twitter status after connect:', twitter);

            // Auto-fill displayName from Twitter if current displayName is empty
            if (twitter.isConnected && twitter.twitterUser && !formData.displayName) {
              const newDisplayName = twitter.twitterUser.name;
              setFormData(prev => ({ ...prev, displayName: newDisplayName }));
              console.log('✅ [ProfileScene] Auto-filled displayName from Twitter:', newDisplayName);
            }

            // Show success or error based on connection status
            if (twitter.isConnected) {
              // Success! No error
              setTwitterError(null);
              showNotification('success', 'Twitter connected successfully!');
            }
          } catch (error) {
            console.error('🔴 [ProfileScene] Failed to refresh Twitter status:', error);
            // Don't show error - just log it, connection might be successful
            // User will see the result in UI when it refreshes
          }
        }
      }, 500);

      // Clean up interval after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        setIsTwitterLoading(false);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Failed to initiate Twitter connection:', error);
      setTwitterError('Failed to initiate Twitter connection. Please try again.');
      setIsTwitterLoading(false);
    }
  };


  // Show Discord error if present
  if (discordError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0c0c]">
        <div className="absolute inset-0 bg-medieval-grid opacity-30 pointer-events-none" />
        <MedievalPanel className="text-center max-w-md p-6">
          <div className="font-medieval text-xl text-red-500 mb-4">
            DISCORD CONNECTION ERROR
          </div>
          <div className="font-serif-vintage text-medieval-text-secondary text-sm mb-6">
            {discordError}
          </div>
          <MedievalButton
            onClick={() => setDiscordError(null)}
          >
            OK
          </MedievalButton>
        </MedievalPanel>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0c0c0c]">
        <div className="absolute inset-0 bg-medieval-grid opacity-30 pointer-events-none" />
        <MedievalPanel className="text-center p-6">
          <div className="font-medieval text-xl mb-4 text-medieval-text">
            AUTHENTICATION REQUIRED
          </div>
          <div className="font-serif-vintage text-medieval-text-secondary">
            Please connect your wallet to view profile
          </div>
        </MedievalPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden bg-[#0c0c0c]">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-medieval-grid opacity-30 pointer-events-none" />

      {/* Decorative Corners */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="absolute top-4 left-4 w-24 h-24 text-medieval-text opacity-20" viewBox="0 0 100 100">
          <path d="M0,0 L30,0 L30,2 L2,2 L2,30 L0,30 Z" fill="currentColor" />
          <path d="M5,5 L25,5 L25,6 L6,6 L6,25 L5,25 Z" fill="currentColor" />
        </svg>
        <svg className="absolute top-4 right-4 w-24 h-24 text-medieval-text opacity-20 transform rotate-90" viewBox="0 0 100 100">
          <path d="M0,0 L30,0 L30,2 L2,2 L2,30 L0,30 Z" fill="currentColor" />
          <path d="M5,5 L25,5 L25,6 L6,6 L6,25 L5,25 Z" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-4 right-4 w-24 h-24 text-medieval-text opacity-20 transform rotate-180" viewBox="0 0 100 100">
          <path d="M0,0 L30,0 L30,2 L2,2 L2,30 L0,30 Z" fill="currentColor" />
          <path d="M5,5 L25,5 L25,6 L6,6 L6,25 L5,25 Z" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-4 left-4 w-24 h-24 text-medieval-text opacity-20 transform -rotate-90" viewBox="0 0 100 100">
          <path d="M0,0 L30,0 L30,2 L2,2 L2,30 L0,30 Z" fill="currentColor" />
          <path d="M5,5 L25,5 L25,6 L6,6 L6,25 L5,25 Z" fill="currentColor" />
        </svg>
      </div>
      {/* Notification */}
      <ConsoleNotification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />

      <div className="max-w-4xl mx-auto px-8 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Back button */}
          <MedievalButton
            variant="secondary"
            className="mb-8 flex items-center gap-3 px-4 py-2"
            onClick={() => setScene('menu')}
          >
            <ArrowLeft className="w-5 h-5" />
            BACK TO MENU
          </MedievalButton>

          {/* Header */}
          <MedievalPanel className="mb-8 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-medieval-bg-dark border border-medieval-border rounded-lg">
                  <User className="w-8 h-8 text-medieval-gold" />
                </div>
                <div>
                  <h1 className="font-medieval text-2xl text-medieval-text tracking-wide">
                    WARRIOR PROFILE
                  </h1>
                  <div className="font-serif-vintage text-medieval-text-secondary">
                    {user.displayName || 'Anonymous Warrior'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <MedievalButton
                  variant="primary"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  REFRESH
                </MedievalButton>
              </div>
            </div>

            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50">
                <div className="font-medieval text-lg mb-4 text-medieval-text-secondary">
                  ACCOUNT INFO
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-medieval-text-secondary" />
                    <div>
                      <div className="font-medieval text-sm text-medieval-text">Wallet Address</div>
                      <div className="font-serif-vintage text-xs text-medieval-text-secondary">
                        {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                      </div>
                    </div>
                  </div>
                  {isDiscordStatusLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 opacity-50" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">Discord</div>
                        <div className="font-serif-vintage text-xs text-medieval-text-secondary">Loading...</div>
                      </div>
                    </div>
                  ) : user.isDiscordConnected ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">Discord Connected</div>
                        <div className="font-serif-vintage text-xs text-medieval-text-secondary">
                          {user.discordUsername}#{user.discordDiscriminator}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-medieval-text-secondary" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">Discord</div>
                        <MedievalButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5 mt-1"
                          onClick={() => {
                            playButtonSound();
                            handleDiscordConnect();
                          }}
                          disabled={isDiscordLoading}
                        >
                          {isDiscordLoading ? 'CONNECTING...' : 'CONNECT'}
                        </MedievalButton>
                      </div>
                    </div>
                  )}
                  {isTwitterStatusLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">X (Twitter)</div>
                        <div className="font-serif-vintage text-xs text-medieval-text-secondary">Loading...</div>
                      </div>
                    </div>
                  ) : twitterStatus.isConnected ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-medieval-text" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">X (Twitter) Connected</div>
                        <div className="font-serif-vintage text-xs text-medieval-text-secondary">
                          <a
                            href={`https://x.com/${twitterStatus.twitterUser?.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-medieval-gold transition-colors"
                          >
                            @{twitterStatus.twitterUser?.username}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-medieval-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medieval text-sm text-medieval-text">X (Twitter)</div>
                        <MedievalButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5 mt-1"
                          onClick={() => {
                            playButtonSound();
                            handleTwitterConnect();
                          }}
                          disabled={isTwitterLoading}
                        >
                          {isTwitterLoading ? 'CONNECTING...' : 'CONNECT'}
                        </MedievalButton>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50">
                <div className="font-medieval text-lg mb-4 text-medieval-text-secondary">
                  BATTLE STATISTICS
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-medieval-bg-dark rounded border border-medieval-border/30">
                    <Sword className="w-6 h-6 text-medieval-text-secondary mx-auto mb-2" />
                    <div className="font-medieval text-2xl text-medieval-gold">
                      {stats?.totalBattlesFought || 0}
                    </div>
                    <div className="font-serif-vintage text-xs text-medieval-text-secondary">BATTLES</div>
                  </div>
                  <div className="text-center p-4 bg-medieval-bg-dark rounded border border-medieval-border/30">
                    <Shield className="w-6 h-6 text-medieval-success mx-auto mb-2" />
                    <div className="font-medieval text-2xl text-medieval-gold">
                      {stats?.totalVictories || 0}
                    </div>
                    <div className="font-serif-vintage text-xs text-medieval-text-secondary">VICTORIES</div>
                  </div>
                  <div className="text-center p-4 bg-medieval-bg-dark rounded border border-medieval-border/30">
                    <Skull className="w-6 h-6 text-red-500/80 mx-auto mb-2" />
                    <div className="font-medieval text-2xl text-medieval-gold">
                      {stats?.totalLosses || 0}
                    </div>
                    <div className="font-serif-vintage text-xs text-medieval-text-secondary">DEFEATS</div>
                  </div>
                  <div className="text-center p-4 bg-medieval-bg-dark rounded border border-medieval-border/30">
                    <Percent className="w-6 h-6 text-medieval-gold mx-auto mb-2" />
                    <div className="font-medieval text-2xl text-medieval-gold">
                      {stats?.totalBattlesFought ? Math.round((stats.totalVictories / stats.totalBattlesFought) * 100) : 0}%
                    </div>
                    <div className="font-serif-vintage text-xs text-medieval-text-secondary">WIN RATE</div>
                  </div>
                </div>
              </div>
            </div>
          </MedievalPanel>

          {/* Profile Settings Section */}
          <MedievalPanel className="mb-8 p-6">
            <div className="font-medieval text-lg mb-6 text-medieval-text">
              PROFILE SETTINGS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div>
                <label className="font-medieval text-medieval-text mb-2 block">
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full bg-medieval-bg-dark border border-medieval-border p-3 font-serif-vintage text-medieval-text text-sm focus:border-medieval-gold outline-none rounded"
                  placeholder="Enter your display name"
                  maxLength={50}
                />
                <div className="font-serif-vintage text-medieval-text-secondary text-xs mt-1">
                  How other warriors will see you
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="font-medieval text-medieval-text mb-2 block">
                  BIO
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full bg-medieval-bg-dark border border-medieval-border p-3 font-serif-vintage text-medieval-text text-sm focus:border-medieval-gold outline-none resize-none rounded"
                  placeholder="Tell other warriors about yourself..."
                  rows={3}
                  maxLength={200}
                />
                <div className="font-serif-vintage text-medieval-text-secondary text-xs mt-1">
                  {formData.bio.length}/200 characters
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6">
              <MedievalButton
                variant="primary"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
              </MedievalButton>
            </div>
          </MedievalPanel>

          {/* Shadow Glory Section */}
          {shadowGlory && (
            <MedievalPanel className="mb-8 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-6 h-6 text-medieval-gold" />
                <h2 className="font-medieval text-xl text-medieval-text">
                  SHADOW GLORY
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Glory */}
                <div className="p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50 text-center">
                  <div className="font-medieval text-3xl text-medieval-gold mb-2">
                    {shadowGlory.shadowGlory}
                  </div>
                  <div className="font-serif-vintage text-sm text-medieval-text-secondary">
                    TOTAL SHADOW GLORY
                  </div>
                </div>

                {/* Current Rank */}
                <div className="p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50 text-center">
                  <Crown className="w-8 h-8 text-medieval-gold mx-auto mb-2" />
                  <div className="font-medieval text-lg text-medieval-text mb-1">
                    {shadowGlory.rank.name.toUpperCase()}
                  </div>
                  <div className="font-serif-vintage text-sm text-medieval-text-secondary">
                    LEVEL {shadowGlory.rank.level}
                  </div>
                </div>

                {/* Next Rank */}
                {shadowGlory.nextRank && (
                  <div className="p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50 text-center">
                    <Trophy className="w-8 h-8 text-medieval-text-secondary mx-auto mb-2" />
                    <div className="font-medieval text-lg text-medieval-text mb-1">
                      {shadowGlory.nextRank.name.toUpperCase()}
                    </div>
                    <div className="font-serif-vintage text-sm text-medieval-text-secondary">
                      {shadowGlory.nextRank.pointsNeeded} POINTS NEEDED
                    </div>
                  </div>
                )}
              </div>

              {/* Experience Bar */}
              {shadowGlory.nextRank && (
                <div className="mt-6 p-4 bg-medieval-bg-dark/50 rounded-lg border border-medieval-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-medieval-gold" />
                      <span className="font-medieval text-medieval-text">EXPERIENCE</span>
                    </div>
                    <span className="font-serif-vintage text-medieval-text-secondary text-sm">
                      {shadowGlory.shadowGlory} / {shadowGlory.shadowGlory + shadowGlory.nextRank.pointsNeeded} XP
                    </span>
                  </div>
                  <div className="h-4 bg-medieval-bg-dark rounded-full overflow-hidden border border-medieval-border/30 relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-medieval-gold/50 to-medieval-gold transition-all duration-500"
                      style={{
                        width: `${(shadowGlory.shadowGlory / (shadowGlory.shadowGlory + shadowGlory.nextRank.pointsNeeded)) * 100}%`
                      }}
                    />
                  </div>
                  <div className="mt-2 text-center font-serif-vintage text-xs text-medieval-text-secondary">
                    {shadowGlory.nextRank.pointsNeeded} more points to reach {shadowGlory.nextRank.name}
                  </div>
                </div>
              )}

              {/* Recent History */}
              {shadowGlory.recentHistory && shadowGlory.recentHistory.length > 0 && (
                <div className="mt-6">
                  <div className="font-medieval text-lg text-medieval-text mb-4">
                    RECENT ACTIVITY
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {shadowGlory.recentHistory.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="p-3 bg-medieval-bg-dark/30 border border-medieval-border/30 rounded">
                        <div className="flex justify-between items-center">
                          <div className="font-medieval text-medieval-gold">
                            +{entry.amount} Shadow Glory
                          </div>
                          <div className="font-serif-vintage text-sm text-medieval-text-secondary">
                            {entry.reason}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </MedievalPanel>
          )}

          {/* Actions */}
          <MedievalPanel className="p-6">
            <div className="font-medieval text-lg mb-6 text-medieval-text">
              ACTIONS
            </div>
            <div className="flex gap-4">
              <MedievalButton
                variant="secondary"
                onClick={() => {
                  playButtonSound();
                  openModal('settings');
                }}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                GAME SETTINGS
              </MedievalButton>

              <MedievalButton
                variant="danger"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                LOGOUT
              </MedievalButton>
            </div>
          </MedievalPanel>
        </motion.div>
      </div>
    </div>
  );
}
