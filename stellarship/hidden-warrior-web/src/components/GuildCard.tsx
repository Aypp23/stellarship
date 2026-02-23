'use client';

import React from 'react';
import { Guild } from '@/types/guild';
import { Shield, Users, Crown, Globe, Lock } from 'lucide-react';

interface GuildCardProps {
  guild: Guild & {
    leader: {
      id: number;
      walletAddress: string;
    };
    _count: {
      members: number;
    };
    guildPower?: number;
  };
  onClick: () => void;
}

const GuildCard: React.FC<GuildCardProps> = ({ guild, onClick }) => {
  const truncateWalletAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div
      className="group relative bg-medieval-paper border border-medieval-border p-4 transition-all duration-300 hover:border-medieval-gold hover:shadow-medieval cursor-pointer overflow-hidden rounded-sm"
      onClick={onClick}
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 bg-medieval-bg/10 group-hover:bg-medieval-gold/5 transition-colors duration-300" />

      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-medieval-border/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-medieval-border/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-medieval-border/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-medieval-border/50" />

      <div className="relative z-10">
        {/* Guild Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-medieval-border/30 pb-3">
          {/* Guild Logo */}
          <div className="w-14 h-14 bg-medieval-panel border border-medieval-border flex items-center justify-center overflow-hidden shadow-inner rounded-sm group-hover:border-medieval-gold/50 transition-colors">
            {guild.logoUrl ? (
              <img
                src={guild.logoUrl}
                alt={`${guild.name} logo`}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
              />
            ) : (
              <Shield className="w-8 h-8 text-medieval-text-secondary/50 group-hover:text-medieval-gold transition-colors" />
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medieval text-xl text-medieval-text uppercase truncate mb-1 group-hover:text-medieval-gold transition-colors" title={guild.name}>
              {guild.name}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {guild.isPrivate ? (
                <div className="flex items-center gap-1 text-red-800/70 font-bold font-serif-vintage tracking-wider">
                  <Lock className="w-3 h-3" /> PRIVATE
                </div>
              ) : (
                <div className="flex items-center gap-1 text-medieval-text-secondary font-bold font-serif-vintage tracking-wider">
                  <Globe className="w-3 h-3" /> PUBLIC
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guild Description */}
        <div className="mb-4 h-12 overflow-hidden">
          <p className="font-serif-vintage text-medieval-text-secondary text-xs leading-relaxed italic line-clamp-2">
            {guild.description ? (
              `"${guild.description}"`
            ) : (
              <span className="opacity-50">No chronicles written for this guild...</span>
            )}
          </p>
        </div>

        {/* Guild Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-2 text-center rounded-sm">
            <div className="font-medieval font-bold text-medieval-text text-sm">
              {guild._count?.members || 0}
            </div>
            <div className="font-serif-vintage text-[10px] text-medieval-text-secondary uppercase tracking-widest">
              MEMBERS
            </div>
          </div>
          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-2 text-center rounded-sm">
            <div className="font-medieval font-bold text-medieval-text text-sm">
              {guild.maxMembers}
            </div>
            <div className="font-serif-vintage text-[10px] text-medieval-text-secondary uppercase tracking-widest">
              CAPACITY
            </div>
          </div>
          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-2 text-center rounded-sm">
            <div className="font-medieval font-bold text-medieval-gold text-sm shadow-gold-glow-sm">
              {guild.guildPower?.toLocaleString() || '0'}
            </div>
            <div className="font-serif-vintage text-[10px] text-medieval-text-secondary uppercase tracking-widest">
              POWER
            </div>
          </div>
        </div>

        {/* Guild Leader & Footer */}
        <div className="flex justify-between items-end text-xs pt-2 border-t border-medieval-border/30">
          <div>
            <div className="flex items-center gap-1 font-serif-vintage text-medieval-text-secondary text-[10px] uppercase mb-0.5">
              <Crown className="w-3 h-3 text-medieval-gold" /> LEADER
            </div>
            <span className="font-medieval text-medieval-text tracking-wide" title={guild.leader.walletAddress}>
              {truncateWalletAddress(guild.leader.walletAddress)}
            </span>
          </div>
          <div className="text-right">
            <div className="font-serif-vintage text-medieval-text-secondary text-[10px] uppercase mb-0.5">
              ESTABLISHED
            </div>
            <span className="font-medieval text-medieval-text tracking-wide">
              {formatDate(guild.createdAt)}
            </span>
          </div>
        </div>

        {/* Member Progress Bar */}
        <div className="mt-3 relative">
          <div className="w-full bg-medieval-bg-dark h-1.5 rounded-full overflow-hidden border border-medieval-border/30">
            <div
              className={`h-full transition-all duration-500 ${(guild._count?.members || 0) >= guild.maxMembers
                ? 'bg-red-900'
                : 'bg-medieval-gold'
                }`}
              style={{
                width: `${Math.min(((guild._count?.members || 0) / guild.maxMembers) * 100, 100)}%`
              }}
            />
          </div>
          {(guild._count?.members || 0) >= guild.maxMembers && (
            <div className="absolute top-2 right-0 text-[10px] text-red-800 font-bold font-serif-vintage uppercase tracking-wider">
              FULL
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuildCard;

