'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/store/gameStore';
import { Shield, Users, Crown, ArrowRight } from 'lucide-react';
import { guildsApi } from '@/lib/apiClient';
import { UserGuild, GuildRole } from '@/types/guild';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

export default function UserGuildBanner() {
  const { user } = useAuth();
  const { setScene, setSelectedGuildId } = useGameStore();
  const [userGuilds, setUserGuilds] = useState<UserGuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserGuilds();
    }
  }, [user]);

  const loadUserGuilds = async () => {
    try {
      setIsLoading(true);
      const response = await guildsApi.getUserGuilds();

      // Handle both array format and object format
      if (Array.isArray(response)) {
        setUserGuilds(response);
      } else if (response.guilds && Array.isArray(response.guilds)) {
        setUserGuilds(response.guilds);
      } else if (response.guild) {
        // Single guild object - use guild data but add role from root level
        const guildWithRole = {
          ...response.guild,
          role: response.role,
          joinedAt: response.joinedAt
        };
        setUserGuilds([guildWithRole]);
      } else {
        setUserGuilds([]);
      }
    } catch (err) {
      console.error('Error loading user guilds:', err);
      setUserGuilds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuildClick = (guildId: number) => {
    setSelectedGuildId(guildId);
    setScene('guild-detail');
  };

  if (!user || isLoading) return null;

  if (userGuilds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2 font-medieval text-medieval-gold tracking-wide">
          <Shield className="w-5 h-5" />
          <span>YOUR GUILD{userGuilds.length > 1 ? 'S' : ''}</span>
        </div>
        <div className="font-serif-vintage text-xs text-medieval-text-secondary uppercase">
          {userGuilds.length} guild{userGuilds.length !== 1 ? 's' : ''} established
        </div>
      </div>

      <div className="space-y-4">
        {userGuilds.map((guild) => (
          <motion.div
            key={guild.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group"
          >
            <div
              className="bg-medieval-bg/40 border border-medieval-border p-0.5 rounded transition-all duration-300 hover:border-medieval-gold/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.05)] cursor-pointer"
              onClick={() => handleGuildClick(guild.id)}
            >
              <div className="bg-medieval-bg-dark/80 p-4 rounded flex items-center gap-4 relative overflow-hidden">
                {/* Background texture for card */}
                <div className="absolute inset-0 bg-medieval-paper opacity-5 pointer-events-none" />

                {/* Guild Logo */}
                <div className="w-16 h-16 bg-medieval-bg-dark border border-medieval-border rounded flex items-center justify-center flex-shrink-0 group-hover:border-medieval-gold/30 transition-colors shadow-inner relative z-10">
                  {guild.logoUrl ? (
                    <img src={guild.logoUrl} alt={guild.name} className="w-full h-full object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all duration-300" />
                  ) : (
                    <Shield className="w-8 h-8 text-medieval-gold opacity-30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medieval text-xl text-medieval-text group-hover:text-medieval-gold transition-colors truncate">
                      {guild.name}
                    </h3>
                    <div className="hidden sm:flex items-center gap-1 text-xs font-serif-vintage text-medieval-gold/70 group-hover:text-medieval-gold transition-colors">
                      ENTER GUILD HALL <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-serif-vintage text-medieval-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${guild.role === GuildRole.LEADER ? 'border-medieval-gold text-medieval-gold bg-medieval-gold/5' :
                          guild.role === GuildRole.OFFICER ? 'border-blue-500/50 text-blue-400 bg-blue-900/10' :
                            'border-medieval-border text-medieval-text-secondary'
                        }`}>
                        {guild.role === GuildRole.LEADER && <Crown className="w-3 h-3" />}
                        {guild.role === GuildRole.OFFICER && <Shield className="w-3 h-3" />}
                        <span className="uppercase font-bold tracking-wider">{guild.role}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{guild.maxMembers} Members</span>
                    </div>

                    {guild.isPrivate && (
                      <span className="bg-red-900/20 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30">
                        PRIVATE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
