'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

interface UserData {
  id: number;
  walletAddress: string;
  displayName?: string;
  avatarUrl?: string;
  discordAvatar?: string;
  discordId?: string;
  isDiscordConnected?: boolean;
}

interface UserProfileLinkProps {
  user?: UserData;
  walletAddress?: string;
  userId?: number;
  className?: string;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
}

const UserProfileLink: React.FC<UserProfileLinkProps> = ({ 
  user, 
  walletAddress, 
  userId,
  className = '',
  showAvatar = true,
  avatarSize = 'sm'
}) => {
  const [userData, setUserData] = useState<UserData | null>(user || null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Effect to load user data by wallet address if not provided
  useEffect(() => {
    if (!user && walletAddress && !userData && !loading) {
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
          } else {
            // If API fails, just continue without user data - don't break the UI
            console.log('User search failed:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        } finally {
          setLoading(false);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [user, walletAddress, userData, loading]);

  // If we have user object, use it, otherwise fallback to individual props or fetched data
  const userToDisplay = userData || user || {
    id: userId || 0,
    walletAddress: walletAddress || '',
    displayName: undefined,
    avatarUrl: undefined,
    discordAvatar: undefined,
    discordId: undefined,
    isDiscordConnected: false
  };

  const getAvatarUrl = () => {
    // Priority: custom avatarUrl, then Discord avatar if connected
    if (userToDisplay.avatarUrl) return userToDisplay.avatarUrl;
    if (userToDisplay.isDiscordConnected && userToDisplay.discordAvatar && userToDisplay.discordId) {
      return `https://cdn.discordapp.com/avatars/${userToDisplay.discordId}/${userToDisplay.discordAvatar}.png?size=64`;
    }
    return null;
  };

  const getDisplayName = () => {
    if (userToDisplay.displayName) return userToDisplay.displayName;
    if (!userToDisplay.walletAddress) return 'Unknown User';
    return `${userToDisplay.walletAddress.slice(0, 4)}...${userToDisplay.walletAddress.slice(-4)}`;
  };

  const avatarUrl = getAvatarUrl();
  const displayName = getDisplayName();
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  };

  const avatarClass = sizeClasses[avatarSize];

  // If we don't have a user ID, just display as text
  if (!userToDisplay.id || userToDisplay.id === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAvatar && (
          <div className={`${avatarClass} border border-[#4d3a25] bg-[#1b1411] flex items-center justify-center`}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <User className="w-4 h-4 text-[#e2b045]" />
            )}
          </div>
        )}
        <span className="text-[#e6d2ac] font-departure text-sm">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 hover:text-[#e2b045] transition-colors duration-150 cursor-pointer ${className}`}
        title={`View ${displayName}'s profile`}
      >
        {showAvatar && (
          <div className={`${avatarClass} border border-[#4d3a25] bg-[#1b1411] flex items-center justify-center`}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <User className="w-4 h-4 text-[#e2b045]" />
            )}
          </div>
        )}
        <span className="text-[#e6d2ac] font-departure text-sm hover:text-[#e2b045]">
          {displayName}
        </span>
        {userToDisplay.isDiscordConnected && (
          <div className="w-2 h-2 bg-[#9ac44d] border border-[#e6d2ac]" title="Discord Connected" />
        )}
      </button>

      <UserProfileModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userId={userToDisplay.id}
        initialUserData={userToDisplay}
      />
    </>
  );
};

export default UserProfileLink;
