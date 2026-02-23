'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useGuildToastContext } from '@/contexts/GuildToastContext';
import { guildsApi } from '@/lib/apiClient';
import { GuildWithDetails, GuildRole } from '@/types/guild';
import GuildManagementModal from './GuildManagementModal';
import GuildTreasuryPanel from './GuildTreasuryPanel';
import GuildVotingPanel from './GuildVotingPanel';
import { ArrowLeft, Users, Shield, Crown, Star, Calendar, Lock, Globe, Scroll, Skull } from 'lucide-react';
import GuildMemberProfile from './GuildMemberProfile';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

export default function GuildDetailScene() {
  const { setScene, selectedGuildId } = useGameStore();
  const { user } = useAuth();
  const toast = useGuildToastContext();
  const [guild, setGuild] = useState<GuildWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const fetchGuild = useCallback(async () => {
    if (!selectedGuildId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await guildsApi.getGuildById(selectedGuildId);
      setGuild(data);
    } catch (err) {
      console.error('Error fetching guild:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch guild');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    if (selectedGuildId) {
      fetchGuild();
    }
  }, [selectedGuildId, fetchGuild]);

  const truncateWalletAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserRole = (): GuildRole | null => {
    if (!user || !guild) return null;
    return guild.members.find(member => member.user.id === user.id)?.role || null;
  };

  const isUserMember = (): boolean => {
    if (!user || !guild) return false;
    return guild.members.some(member => member.user.id === user.id);
  };

  const canManageGuild = (): boolean => {
    const userRole = getUserRole();
    return userRole === 'LEADER' || userRole === 'OFFICER';
  };

  const handleJoinGuild = async () => {
    if (!user) {
      toast.warning('Please connect your wallet first');
      return;
    }

    if (!selectedGuildId) return;

    setIsJoining(true);
    try {
      await guildsApi.joinGuild(selectedGuildId);
      await fetchGuild();
      toast.success('Successfully joined the guild!');
    } catch (error) {
      console.error('Error joining guild:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join guild');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGuildClick = () => {
    if (!user) {
      toast.warning('Please connect your wallet first');
      return;
    }

    const userRole = getUserRole();
    if (userRole === 'LEADER') {
      toast.error('Guild leader cannot leave. Transfer leadership first or delete the guild.');
      return;
    }

    setShowLeaveConfirm(true);
  };

  const handleLeaveGuildConfirm = async () => {
    setShowLeaveConfirm(false);
    setIsJoining(true);

    if (!selectedGuildId) return;

    try {
      await guildsApi.leaveGuild(selectedGuildId);
      await fetchGuild();
      toast.success('Successfully left the guild!');
    } catch (error) {
      console.error('Error leaving guild:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to leave guild');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto animate-spin mb-4"></div>
          <p className="font-medieval text-medieval-text text-xl">Consulting the archives...</p>
        </div>
      </div>
    );
  }

  if (error || !guild) {
    return (
      <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
        <div className="bg-medieval-panel border border-medieval-border p-8 text-center rounded-lg shadow-medieval max-w-md">
          <Skull className="w-16 h-16 mx-auto mb-4 text-red-900/50" />
          <p className="font-medieval text-red-800 text-2xl mb-4">{error || 'GUILD NOT FOUND'}</p>
          <MedievalButton onClick={() => setScene('guilds')} variant="secondary">
            RETURN TO GUILDS
          </MedievalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex flex-col">
      {/* Header */}
      <div className="border-b border-medieval-border bg-medieval-panel/50 backdrop-blur-sm sticky top-0 z-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MedievalButton
            onClick={() => setScene('guilds')}
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO GUILDS
          </MedievalButton>

          <div className="flex items-center gap-2 font-medieval text-medieval-text tracking-widest text-lg">
            <Shield className="w-5 h-5 text-medieval-gold" />
            GUILD HALL
          </div>

          <div className="w-32" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full relative z-10 mt-6">
        {/* Guild Info Panel */}
        <MedievalPanel className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Guild Logo */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-40 h-40 bg-medieval-bg-dark border-4 border-medieval-border rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden group">
                {guild.logoUrl ? (
                  <img src={guild.logoUrl} alt={guild.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <Shield className="w-20 h-20 text-medieval-gold opacity-30" />
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/20 rounded-lg pointer-events-none" />
              </div>
            </div>

            {/* Guild Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-4">
                <div>
                  <h1 className="font-medieval text-4xl md:text-5xl text-medieval-text mb-2 drop-shadow-md">{guild.name}</h1>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-serif-vintage tracking-wider">
                    {guild.isPrivate ? (
                      <div className="flex items-center gap-1 text-red-800/80 font-bold">
                        <Lock className="w-4 h-4" /> PRIVATE
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-medieval-text-secondary font-bold">
                        <Globe className="w-4 h-4" /> PUBLIC
                      </div>
                    )}
                    <span className="text-medieval-border mx-1">|</span>
                    <div className="flex items-center gap-1 text-medieval-text-secondary">
                      <Calendar className="w-4 h-4" /> EST. {formatDate(guild.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4 md:mt-0">
                  {!isUserMember() && user && (
                    <MedievalButton
                      onClick={handleJoinGuild}
                      variant="gold"
                      disabled={isJoining || (guild._count.members >= guild.maxMembers)}
                      className="px-6 py-2 text-lg shadow-lg"
                    >
                      {isJoining ? 'SIGNING...' : 'PLEDGE ALLEGIANCE'}
                    </MedievalButton>
                  )}
                  {isUserMember() && (
                    <>
                      {canManageGuild() && (
                        <MedievalButton
                          onClick={() => setShowManagementModal(true)}
                          variant="primary"
                        >
                          MANAGE
                        </MedievalButton>
                      )}
                      <MedievalButton
                        onClick={handleLeaveGuildClick}
                        variant="danger"
                        disabled={isJoining}
                      >
                        {isJoining ? 'LEAVING...' : 'LEAVE GUILD'}
                      </MedievalButton>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-medieval-bg/30 p-4 rounded border border-medieval-border/30 mb-6 italic font-serif-vintage text-medieval-text-secondary">
                {guild.description || "No chronicles written for this guild..."}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-medieval-bg p-3 rounded border border-medieval-border/50 text-center">
                  <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mb-1">MEMBERS</div>
                  <div className="font-medieval text-2xl text-medieval-text">
                    {guild._count.members} <span className="text-sm text-medieval-text-secondary">/ {guild.maxMembers}</span>
                  </div>
                </div>
                <div className="bg-medieval-bg p-3 rounded border border-medieval-border/50 text-center">
                  <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mb-1">POWER</div>
                  <div className="font-medieval text-2xl text-medieval-gold drop-shadow-sm">
                    {guild.guildPower || 0}
                  </div>
                </div>
                <div className="bg-medieval-bg p-3 rounded border border-medieval-border/50 text-center">
                  <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mb-1">LEADER</div>
                  <div className="font-medieval text-lg text-medieval-text truncate px-2">
                    {truncateWalletAddress(guild.leader.walletAddress)}
                  </div>
                </div>
                <div className="bg-medieval-bg p-3 rounded border border-medieval-border/50 text-center">
                  <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mb-1">TREASURY</div>
                  <div className="font-medieval text-2xl text-medieval-gold drop-shadow-sm">
                    {guild.treasuryBalance || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MedievalPanel>

        {/* Member List */}
        <MedievalPanel title="GUILD ROSTER" className="mb-8">
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {guild.members.map((member, index) => (
              <motion.div
                key={member.user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-medieval-bg/30 border border-medieval-border/30 rounded hover:bg-medieval-bg/50 hover:border-medieval-gold/30 transition-all duration-200"
              >
                <GuildMemberProfile
                  walletAddress={member.user.walletAddress}
                  role={member.role}
                  className="flex-1"
                />
                <div className="text-right pl-4">
                  <div className="text-[10px] font-serif-vintage text-medieval-text-secondary uppercase">JOINED</div>
                  <div className="font-medieval text-sm text-medieval-text truncate">
                    {formatDate(member.joinedAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </MedievalPanel>

        {/* Treasury and Voting (only for members) */}
        {isUserMember() && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <GuildTreasuryPanel guildId={guild.id} isMember={true} />
            <GuildVotingPanel guildId={guild.id} isMember={true} isLeader={getUserRole() === 'LEADER'} userId={user?.id || 0} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showManagementModal && (
        <GuildManagementModal
          guild={guild}
          isOpen={showManagementModal}
          onClose={() => setShowManagementModal(false)}
          onUpdate={fetchGuild}
          userId={user?.id || 0}
        />
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-medieval-panel border-2 border-medieval-border rounded p-6 max-w-sm w-full relative"
          >
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-medieval-gold"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-medieval-gold"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-medieval-gold"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-medieval-gold"></div>

            <h3 className="font-medieval text-2xl text-medieval-text mb-4 text-center">ABANDON GUILD?</h3>
            <p className="font-serif-vintage text-medieval-text-secondary mb-6 text-center">
              Are you sure you want to pledge away from <span className="text-medieval-gold font-bold">{guild.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <MedievalButton
                onClick={() => setShowLeaveConfirm(false)}
                variant="secondary"
                className="flex-1"
              >
                STAY
              </MedievalButton>
              <MedievalButton
                onClick={handleLeaveGuildConfirm}
                variant="danger"
                className="flex-1"
              >
                LEAVE
              </MedievalButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


