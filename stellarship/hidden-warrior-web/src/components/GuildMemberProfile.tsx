'use client';

import React, { useState, useEffect } from 'react';
import { User, Crown, Star, Shield } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

interface UserData {
  id: number;
  walletAddress: string;
  displayName?: string;
  avatarUrl?: string;
  discordAvatar?: string;
  discordId?: string;
  isDiscordConnected?: boolean;
  rank?: {
    level: number;
    name: string;
    color: string;
  };
  totalBattlesFought?: number;
  totalVictories?: number;
  totalDefeats?: number;
  shadowGlory?: number;
}

interface GuildMemberProfileProps {
  walletAddress: string;
  role: string;
  className?: string;
}

const GuildMemberProfile: React.FC<GuildMemberProfileProps> = ({
  walletAddress,
  role,
  className = ''
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Effect to load user data by wallet address
  useEffect(() => {
    if (walletAddress && !userData && !loading) {
      // Add a small delay to debounce requests
      const timeoutId = setTimeout(async () => {
        try {
          setLoading(true);
          // Try to get user by wallet address
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/user-search?walletAddress=${walletAddress}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const foundUser = await response.json();
            if (foundUser && (foundUser.id || foundUser.walletAddress)) {
              setUserData(foundUser);
            }
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        } finally {
          setLoading(false);
        }
      }, 300); // Debounce for 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [walletAddress, userData, loading]);

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case 'LEADER': return <Crown className="w-4 h-4 text-medieval-gold drop-shadow-sm" />;
      case 'OFFICER': return <Star className="w-4 h-4 text-gray-300" />;
      default: return <Shield className="w-4 h-4 text-medieval-border" />;
    }
  };

  const truncateWalletAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  };

  const handleClick = () => {
    if (userData) {
      setShowModal(true);
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-3 cursor-pointer group px-2 py-1 rounded transition-colors ${className}`}
        onClick={handleClick}
      >
        {/* Avatar */}
        <div className="w-10 h-10 bg-medieval-bg-dark border border-medieval-border rounded-sm flex items-center justify-center overflow-hidden group-hover:border-medieval-gold/50 transition-colors shadow-inner">
          {userData?.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt={userData.displayName || 'User avatar'}
              className="w-full h-full object-cover"
            />
          ) : userData?.discordAvatar ? (
            <img
              src={userData.discordAvatar}
              alt={userData.displayName || 'Discord avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-medieval-text-secondary opacity-50" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medieval text-medieval-text text-sm group-hover:text-medieval-gold transition-colors tracking-wide">
            {userData?.displayName || truncateWalletAddress(walletAddress)}
          </div>
          <div className="text-xs flex items-center gap-1 font-serif-vintage text-medieval-text-secondary uppercase tracking-widest">
            {getRoleIcon(role)}
            <span>{role}</span>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {userData && (
        <UserProfileModal
          initialUserData={userData}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default GuildMemberProfile;

