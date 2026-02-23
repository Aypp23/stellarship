'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { guildsApi } from '@/lib/apiClient';
import { Guild } from '@/types/guild';
import GuildCard from './GuildCard';
import CreateGuildModal from './CreateGuildModal';
import UserGuildBanner from './UserGuildBanner';
import { ArrowLeft, Users, Search, Plus, Scroll } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

export default function GuildsScene() {
  const { setScene, setSelectedGuildId } = useGameStore();
  const { user } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadGuilds();
  }, [page, searchQuery]);

  const loadGuilds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await guildsApi.getGuilds({ page, limit: 10, search: searchQuery || undefined });
      setGuilds(response.guilds || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      console.error('Error loading guilds:', err);
      setError('Failed to load guilds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuildClick = (guildId: number) => {
    setSelectedGuildId(guildId);
    setScene('guild-detail');
  };

  const handleCreateGuild = () => {
    setShowCreateModal(false);
    loadGuilds();
  };

  return (
    <div className="min-h-screen flex flex-col bg-medieval-bg bg-medieval-paper">
      <div className="border-b border-medieval-border bg-medieval-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MedievalButton
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1 text-sm"
            onClick={() => setScene('menu')}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO MENU
          </MedievalButton>

          <h1 className="text-2xl font-medieval text-medieval-text tracking-widest relative flex items-center gap-3">
            <Users className="w-6 h-6 text-medieval-gold" />
            GUILDS OF THE REALM
          </h1>

          <div className="w-32 flex items-center justify-end">
            {user && <NotificationBell />}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full relative z-10">
        {/* User's Guild Banner */}
        {user && <UserGuildBanner />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left Column - Guild List */}
          <div className="lg:col-span-3">
            <MedievalPanel className="mb-6 p-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-medieval-bg/30 p-4 rounded border border-medieval-border/50">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-medieval-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search for a guild..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-medieval-bg-dark border border-medieval-border text-medieval-text font-serif-vintage pl-10 pr-4 py-2 focus:outline-none focus:border-medieval-gold placeholder-medieval-text-secondary/50 rounded"
                  />
                </div>
                {user && (
                  <MedievalButton
                    variant="gold"
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm font-bold flex items-center gap-2 px-6 py-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    ESTABLISH GUILD
                  </MedievalButton>
                )}
              </div>
            </MedievalPanel>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto animate-spin"></div>
                <p className="mt-4 text-medieval-text-secondary font-medieval">Unrolling guild scrolls...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-medieval-panel border border-red-900/50 rounded p-8">
                <p className="text-red-500 font-medieval text-xl mb-4">{error}</p>
                <MedievalButton onClick={loadGuilds} variant="secondary">
                  TRY AGAIN
                </MedievalButton>
              </div>
            ) : guilds.length === 0 ? (
              <div className="text-center py-16 bg-medieval-panel border border-medieval-border rounded opacity-80">
                <Scroll className="w-16 h-16 mx-auto mb-4 text-medieval-text-secondary opacity-50" />
                <p className="font-medieval text-xl mb-2 text-medieval-text">NO GUILDS FOUND</p>
                <p className="text-medieval-text-secondary font-serif-vintage">
                  {searchQuery ? 'Check your spelling, or start a new legacy.' : 'Be the first to establish a guild in this realm!'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
                  {guilds.map((guild, index) => (
                    <motion.div
                      key={guild.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GuildCard guild={guild} onClick={() => handleGuildClick(guild.id)} />
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <MedievalButton
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="secondary"
                      className="text-xs"
                    >
                      ◄ PREVIOUS
                    </MedievalButton>
                    <span className="font-medieval text-medieval-text-secondary text-sm">
                      PAGE {page} OF {totalPages}
                    </span>
                    <MedievalButton
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="secondary"
                      className="text-xs"
                    >
                      NEXT ►
                    </MedievalButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGuildModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateGuild}
        />
      )}
    </div>
  );
}


