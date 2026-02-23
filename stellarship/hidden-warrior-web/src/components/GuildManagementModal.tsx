'use client';

import React, { useState, useEffect } from 'react';
import { GuildWithDetails, GuildRole, UserSearchResult } from '@/types/guild';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';
import { useGuildToastContext } from '@/contexts/GuildToastContext';
import { X, User, Shield, Search, UserPlus, Trash2, Edit, Save, Lock, Unlock, Crown, ChevronUp, ChevronDown } from 'lucide-react';

interface GuildManagementModalProps {
  guild: GuildWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userId: number;
}

type TabType = 'members' | 'invites' | 'settings';

const GuildManagementModal: React.FC<GuildManagementModalProps> = ({
  guild,
  isOpen,
  onClose,
  onUpdate,
  userId
}) => {
  const toast = useGuildToastContext();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteAddress, setInviteAddress] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Settings form state
  const [settings, setSettings] = useState({
    name: guild.name,
    description: guild.description || '',
    maxMembers: guild.maxMembers,
    isPrivate: guild.isPrivate
  });

  useEffect(() => {
    if (isOpen) {
      setSettings({
        name: guild.name,
        description: guild.description || '',
        maxMembers: guild.maxMembers,
        isPrivate: guild.isPrivate
      });
    }
  }, [isOpen, guild]);

  const truncateWalletAddress = (address: string, startChars = 8, endChars = 6) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  };

  const getUserRole = () => {
    if (!userId || !guild) return null;
    return guild.members.find(member => member.user.id === userId)?.role || null;
  };

  const canManageMembers = () => {
    const userRole = getUserRole();
    return userRole === GuildRole.LEADER || userRole === GuildRole.OFFICER;
  };

  const canManageSettings = () => {
    const userRole = getUserRole();
    return userRole === GuildRole.LEADER;
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!canManageMembers()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guild-remove-member?guildId=${guild.id}&targetUserId=${memberId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }

      onUpdate();
      toast.success('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: GuildRole) => {
    if (!canManageMembers()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guild-update-role?guildId=${guild.id}&targetUserId=${memberId}&role=${newRole}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role');
      }

      onUpdate();
      toast.success('Role updated successfully!');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!inviteAddress.trim()) return;

    setIsSearching(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/user-search?walletAddress=${encodeURIComponent(inviteAddress)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If API fails, just show no results instead of throwing error
        console.log('User search failed in guild management:', response.status, response.statusText);
        setSearchResults([]);
        return;
      }

      const userData: UserSearchResult = await response.json();
      if (userData && (userData.id || userData.walletAddress)) {
        setSearchResults([userData]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to find user');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvitePlayer = async (targetUserId: number, walletAddress: string) => {
    if (!canManageMembers()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guild-invite?guildId=${guild.id}&targetUserId=${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${walletAddress.substring(0, 8)}...!`);
      setInviteAddress('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error inviting player:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!canManageSettings()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guild-update?id=${guild.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update guild');
      }

      onUpdate();
      toast.success('Guild settings updated successfully!');
    } catch (error) {
      console.error('Error updating guild:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update guild');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <MedievalPanel className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col pt-0" title="GUILD MANAGEMENT">
        {/* Header */}
        <div className="flex justify-end p-2 absolute top-0 right-0 z-10">
          <button
            onClick={onClose}
            className="text-medieval-text-secondary hover:text-medieval-text transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-medieval-border/50">
          <button
            onClick={() => setActiveTab('members')}
            className={`font-medieval text-sm uppercase px-6 py-3 border-r border-medieval-border/50 transition-colors ${activeTab === 'members'
                ? 'bg-medieval-bg/50 text-medieval-gold'
                : 'text-medieval-text-secondary hover:text-medieval-gold hover:bg-medieval-bg/30'
              }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              MEMBERS
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`font-medieval text-sm uppercase px-6 py-3 border-r border-medieval-border/50 transition-colors ${activeTab === 'invites'
                ? 'bg-medieval-bg/50 text-medieval-gold'
                : 'text-medieval-text-secondary hover:text-medieval-gold hover:bg-medieval-bg/30'
              }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              INVITES
            </div>
          </button>
          {canManageSettings() && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`font-medieval text-sm uppercase px-6 py-3 transition-colors ${activeTab === 'settings'
                  ? 'bg-medieval-bg/50 text-medieval-gold'
                  : 'text-medieval-text-secondary hover:text-medieval-gold hover:bg-medieval-bg/30'
                }`}
            >
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                SETTINGS
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <h3 className="font-medieval text-medieval-gold text-lg mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Guild Members ({guild._count.members})
              </h3>
              <div className="space-y-3">
                {guild.members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-medieval-bg/30 border border-medieval-border/50 p-4 flex items-center justify-between rounded hover:border-medieval-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-medieval-bg-dark border border-medieval-border rounded flex items-center justify-center">
                        <span className="font-bold text-medieval-gold text-sm">
                          {member.role === GuildRole.LEADER ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </span>
                      </div>
                      <div>
                        <div className="font-medieval text-medieval-text text-sm">
                          {truncateWalletAddress(member.user.walletAddress)}
                        </div>
                        <div className="font-serif-vintage text-medieval-text-secondary text-xs">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role Badge */}
                      <span className={`font-serif-vintage font-bold text-xs uppercase px-2 py-1 rounded border ${member.role === GuildRole.LEADER
                          ? 'border-medieval-gold text-medieval-gold bg-medieval-gold/10'
                          : member.role === GuildRole.OFFICER
                            ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                            : 'border-medieval-border text-medieval-text-secondary bg-medieval-bg-dark'
                        }`}>
                        {member.role}
                      </span>

                      {/* Role Management */}
                      {canManageMembers() && member.role !== GuildRole.LEADER && member.user.id !== userId && (
                        <div className="flex gap-1">
                          {member.role !== GuildRole.OFFICER && (
                            <MedievalButton
                              onClick={() => handleUpdateRole(member.user.id, GuildRole.OFFICER)}
                              variant="secondary"
                              className="px-2 py-1 text-xs h-auto"
                              disabled={isLoading}
                              title="Promote to Officer"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </MedievalButton>
                          )}
                          {member.role === GuildRole.OFFICER && (
                            <MedievalButton
                              onClick={() => handleUpdateRole(member.user.id, GuildRole.MEMBER)}
                              variant="secondary"
                              className="px-2 py-1 text-xs h-auto"
                              disabled={isLoading}
                              title="Demote to Member"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </MedievalButton>
                          )}
                          <MedievalButton
                            onClick={() => {
                              if (window.confirm('Are you sure you want to kick this member?')) {
                                handleRemoveMember(member.user.id);
                              }
                            }}
                            variant="danger"
                            className="px-2 py-1 text-xs h-auto ml-1"
                            disabled={isLoading}
                            title="Kick Member"
                          >
                            <Trash2 className="w-3 h-3" />
                          </MedievalButton>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invites Tab */}
          {activeTab === 'invites' && (
            <div>
              <h3 className="font-medieval text-medieval-gold text-lg mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Players
              </h3>

              {canManageMembers() && (
                <div className="bg-medieval-bg/30 border border-medieval-border/50 p-6 rounded mb-6">
                  <h4 className="font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-3">
                    Search Player by Wallet Address
                  </h4>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Enter wallet address..."
                        value={inviteAddress}
                        onChange={(e) => setInviteAddress(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                        className="w-full bg-medieval-bg-dark border border-medieval-border px-3 py-2 pl-10 font-mono text-medieval-text text-sm placeholder-medieval-text-secondary/50 focus:border-medieval-gold focus:outline-none rounded"
                      />
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-medieval-text-secondary" />
                    </div>
                    <MedievalButton
                      onClick={handleSearchUser}
                      variant="gold"
                      disabled={!inviteAddress.trim() || isSearching}
                    >
                      {isSearching ? 'SEARCHING...' : 'SEARCH'}
                    </MedievalButton>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h5 className="font-medieval text-medieval-text-secondary text-sm">Results:</h5>
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="bg-medieval-bg-dark border border-medieval-border p-3 flex items-center justify-between rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-medieval-bg border border-medieval-border flex items-center justify-center rounded">
                              <User className="w-4 h-4 text-medieval-gold" />
                            </div>
                            <div>
                              <div className="font-mono text-medieval-text text-sm">
                                {truncateWalletAddress(user.walletAddress)}
                              </div>
                              {user.currentGuild && (
                                <div className="font-serif-vintage text-medieval-text-secondary text-xs italic">
                                  Already in: {user.currentGuild.name}
                                </div>
                              )}
                            </div>
                          </div>

                          <MedievalButton
                            onClick={() => handleInvitePlayer(user.id, user.walletAddress)}
                            variant="primary"
                            disabled={isLoading || !!user.currentGuild}
                            className="text-xs px-4 py-1.5"
                          >
                            {user.currentGuild ? 'IN GUILD' : 'INVITE'}
                          </MedievalButton>
                        </div>
                      ))}
                    </div>
                  )}

                  {inviteAddress && searchResults.length === 0 && !isSearching && (
                    <div className="text-center py-4 bg-medieval-bg/20 rounded border border-dashed border-medieval-border/30 mt-4">
                      <span className="font-serif-vintage text-medieval-text-secondary text-sm italic">
                        No player found with this wallet address
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!canManageMembers() && (
                <div className="text-center py-8">
                  <span className="font-medieval text-medieval-text-secondary text-lg">
                    Only leaders and officers can invite players
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && canManageSettings() && (
            <div>
              <h3 className="font-medieval text-medieval-gold text-lg mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Guild Settings
              </h3>

              <div className="space-y-6 bg-medieval-bg/30 p-6 rounded border border-medieval-border/50">
                <div>
                  <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2">
                    Guild Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full bg-medieval-bg-dark border border-medieval-border px-3 py-2 font-medieval text-medieval-text text-lg focus:border-medieval-gold focus:outline-none rounded"
                    maxLength={30}
                  />
                </div>

                <div>
                  <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    className="w-full bg-medieval-bg-dark border border-medieval-border px-3 py-2 font-serif-vintage text-medieval-text text-sm focus:border-medieval-gold focus:outline-none rounded h-24 resize-none"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2">
                    Max Members
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={settings.maxMembers}
                    onChange={(e) => setSettings({ ...settings, maxMembers: parseInt(e.target.value) || 2 })}
                    className="w-full bg-medieval-bg-dark border border-medieval-border px-3 py-2 font-mono text-medieval-text text-sm focus:border-medieval-gold focus:outline-none rounded"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-medieval-bg-dark/30 rounded border border-medieval-border/30">
                  <button
                    onClick={() => setSettings({ ...settings, isPrivate: !settings.isPrivate })}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.isPrivate ? 'bg-medieval-gold' : 'bg-medieval-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.isPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>

                  <div className="flex items-center gap-2">
                    {settings.isPrivate ? <Lock className="w-4 h-4 text-medieval-gold" /> : <Unlock className="w-4 h-4 text-medieval-text-secondary" />}
                    <label className="font-medieval text-medieval-text text-sm cursor-pointer" onClick={() => setSettings({ ...settings, isPrivate: !settings.isPrivate })}>
                      {settings.isPrivate ? 'Private Guild (Invite Only)' : 'Public Guild (Open to All)'}
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-medieval-border/30">
                  <MedievalButton
                    onClick={handleUpdateSettings}
                    variant="gold"
                    fullWidth
                    disabled={isLoading}
                    className="flex justify-center items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? 'UPDATING...' : 'SAVE SETTINGS'}
                  </MedievalButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </MedievalPanel>
    </div>
  );
};

export default GuildManagementModal;
