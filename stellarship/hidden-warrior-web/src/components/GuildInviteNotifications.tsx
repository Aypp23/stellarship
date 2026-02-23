'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PixelButton from '@/components/PixelButton';
import { GuildInvite } from '@/types/guild';
import { useGuildToastContext } from '@/contexts/GuildToastContext';

interface GuildInviteNotificationsProps {
  userId: number | null;
}

const GuildInviteNotifications: React.FC<GuildInviteNotificationsProps> = ({ userId }) => {
  const toast = useGuildToastContext();
  const [invites, setInvites] = useState<GuildInvite[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/guild-invites', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchInvites();
      // Poll for new invites every 30 seconds
      const interval = setInterval(fetchInvites, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchInvites]);

  const handleInviteResponse = async (inviteId: number, action: 'accept' | 'decline', guildName: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guild-invite-respond?inviteId=${inviteId}&action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} invitation`);
      }

      if (action === 'accept') {
        toast.success(`Successfully joined ${guildName}!`);
      } else {
        toast.info(`Declined invitation to ${guildName}`);
      }

      // Refresh invites list
      fetchInvites();
    } catch (error) {
      console.error(`Error ${action}ing invite:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} invitation`);
    } finally {
      setIsLoading(false);
    }
  };

  const truncateGuildName = (name: string, maxLength = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  const truncateWalletAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  };

  if (!userId || invites.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-800 transition-colors duration-100 rounded-sm"
        title="Guild Invitations"
      >
        <span className="font-bold text-yellow-500 text-lg">🔔</span>
        {invites.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-xs px-1 py-0.5 rounded-sm min-w-[16px] text-center">
            {invites.length > 9 ? '9+' : invites.length}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border-4 border-gray-600 z-50"
          >
            <div className="bg-gray-900 border-b-2 border-gray-600 p-3">
              <h3 className="font-bold text-purple-400 text-sm uppercase">
                Guild Invitations ({invites.length})
              </h3>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {invites.map((invite) => (
                <div key={invite.id} className="p-3 border-b border-gray-600 last:border-b-0">
                  <div className="mb-2">
                    <div className="font-mono text-white text-sm">
                      {truncateGuildName(invite.guild.name)}
                    </div>
                    <div className="font-mono text-gray-400 text-xs">
                      From: {truncateWalletAddress(invite.inviter.walletAddress)}
                    </div>
                    <div className="font-mono text-gray-400 text-xs">
                      {invite.guild._count.members} members
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PixelButton
                      onClick={() => handleInviteResponse(invite.id, 'accept', invite.guild.name)}
                      variant="primary"
                      size="sm"
                      disabled={isLoading}
                      className="px-2 py-1 text-xs flex-1"
                    >
                      ACCEPT
                    </PixelButton>
                    <PixelButton
                      onClick={() => handleInviteResponse(invite.id, 'decline', invite.guild.name)}
                      variant="secondary"
                      size="sm"
                      disabled={isLoading}
                      className="px-2 py-1 text-xs flex-1"
                    >
                      DECLINE
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 bg-gray-900 border-t border-gray-600">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full font-bold text-gray-400 text-xs uppercase hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default GuildInviteNotifications;

