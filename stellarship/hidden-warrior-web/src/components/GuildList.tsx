'use client';

import React from 'react';
import GuildCard from './GuildCard';
import { Guild } from '@/types/guild';

interface GuildListProps {
  guilds: Array<Guild & {
    leader: {
      id: number;
      walletAddress: string;
    };
    _count: {
      members: number;
    };
  }>;
  onGuildClick: (guildId: number) => void;
}

const GuildList: React.FC<GuildListProps> = ({ guilds, onGuildClick }) => {
  if (guilds.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {guilds.map((guild) => (
        <GuildCard
          key={guild.id}
          guild={guild}
          onClick={() => onGuildClick(guild.id)}
        />
      ))}
    </div>
  );
};

export default GuildList;

