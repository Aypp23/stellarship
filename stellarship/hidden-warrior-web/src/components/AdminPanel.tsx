'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { 
  X,
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Calendar,
  TrendingUp,
  Users,
  Trophy,
} from 'lucide-react';
import { EventType, WeeklyEvent } from '@/types/events';

// Проверка админа
const ADMIN_WALLETS = [
  'F6tSAoTicYjrB6KbWWXzkfTLhkw7uFEW4u5UHpEHNfSz',
];

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<WeeklyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WeeklyEvent | null>(null);

  // Проверка админских прав
  const isAdmin = user && ADMIN_WALLETS.includes(user.walletAddress);

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadEvents();
    }
  }, [isOpen, isAdmin]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      // Загружаем текущее событие (можно расширить для всех событий)
      const response = await apiClient.get('/events/current');
      
      if (response.data) {
        setEvents([response.data]);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Delete this event?')) return;

    try {
      await apiClient.delete(`/admin/events/${eventId}`);
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a1410] border-4 border-[#4d3a25] p-6 max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-departure text-[#d24d3a] mb-4">UNAUTHORIZED</h2>
          <p className="text-[#bca782] mb-6">
            Your wallet is not authorized to access the admin panel
          </p>
          <button
            onClick={onClose}
            className="console-button console-button-exit w-full"
          >
            CLOSE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1410] border-4 border-[#4d3a25] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#4d3a25] flex items-center justify-between">
          <h1 className="text-3xl font-departure text-[#e2b045]">ADMIN PANEL</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="console-button console-button-play flex items-center gap-2"
            >
              <Plus size={20} />
              CREATE EVENT
            </button>
            <button
              onClick={onClose}
              className="console-button text-sm px-3 py-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b-2 border-[#4d3a25]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#241c16] border border-[#4d3a25] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-[#e2b045]" />
              <span className="text-2xl font-departure text-[#e2b045]">
                {events.filter(e => e.isActive).length}
              </span>
            </div>
            <div className="text-[#bca782] text-sm">ACTIVE EVENTS</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#241c16] border border-[#4d3a25] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-[#4872a3]" />
              <span className="text-2xl font-departure text-[#4872a3]">0</span>
            </div>
            <div className="text-[#bca782] text-sm">PARTICIPANTS</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#241c16] border border-[#4d3a25] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-[#9ac44d]" />
              <span className="text-2xl font-departure text-[#9ac44d]">
                {events.length}
              </span>
            </div>
            <div className="text-[#bca782] text-sm">TOTAL EVENTS</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#241c16] border border-[#4d3a25] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-[#d9a657]" />
              <span className="text-2xl font-departure text-[#d9a657]">0</span>
            </div>
            <div className="text-[#bca782] text-sm">AVG ENGAGEMENT</div>
          </motion.div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-departure text-[#e6d2ac]">EVENTS MANAGEMENT</h2>
            <button 
              onClick={loadEvents}
              className="console-button text-sm"
            >
              REFRESH
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#e2b045] border-t-transparent rounded-full mx-auto animate-spin mb-4"></div>
              <p className="text-[#bca782]">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-[#4d3a25] mx-auto mb-4" />
              <p className="text-[#bca782] mb-4">No events found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="console-button console-button-play"
              >
                CREATE FIRST EVENT
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  onEdit={() => setSelectedEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onView={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadEvents();
          }}
        />

        {/* View/Edit Event Modal */}
        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onUpdated={() => {
              setSelectedEvent(null);
              loadEvents();
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

// Event Card Component
function EventCard({ 
  event, 
  onEdit, 
  onDelete, 
  onView 
}: { 
  event: WeeklyEvent; 
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const now = new Date();
  const isActive = event.isActive && 
    new Date(event.startDate) <= now && 
    new Date(event.endDate) >= now;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#241c16] border border-[#4d3a25] p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-departure text-[#e6d2ac]">{event.title}</h3>
            {isActive && (
              <span className="px-2 py-1 bg-[#9ac44d] text-[#1a1410] text-xs font-departure rounded">
                ACTIVE
              </span>
            )}
            {!event.isActive && (
              <span className="px-2 py-1 bg-[#6a6a6a] text-[#e6d2ac] text-xs font-departure rounded">
                INACTIVE
              </span>
            )}
          </div>
          
          <p className="text-sm text-[#bca782] mb-3">{event.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-[#bca782]">
            <span>Type: {event.eventType}</span>
            <span>•</span>
            <span>Start: {new Date(event.startDate).toLocaleDateString()}</span>
            <span>•</span>
            <span>End: {new Date(event.endDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="console-button text-sm px-3 py-2"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={onEdit}
            className="console-button text-sm px-3 py-2"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onDelete}
            className="console-button console-button-error text-sm px-3 py-2"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Create Event Modal
function CreateEventModal({ 
  isOpen, 
  onClose, 
  onCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    eventType: 'SHADOW_GLORY_RUSH' as EventType,
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
    multiplier: 2,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      await apiClient.post('/admin/events', {
        ...formData,
        config: {
          multiplier: formData.multiplier,
          bonusForFirstBattles: {
            count: 3,
            bonus: 50,
          },
        },
      });

      alert('Event created successfully!');
      onCreated();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event: ' + (error as any)?.response?.data?.error || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1410] border-4 border-[#4d3a25] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-departure text-[#e2b045] mb-6">CREATE NEW EVENT</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#bca782] mb-2 text-sm">Event Type</label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value as EventType })}
              className="console-input w-full"
              disabled={isSubmitting}
            >
              <option value="SHADOW_GLORY_RUSH">Shadow Glory Rush</option>
              <option value="TOURNAMENT">Tournament</option>
              <option value="BOSS_RAID">Boss Raid</option>
              <option value="ARCHETYPE_MASTERY">Archetype Mastery</option>
              <option value="PERFECT_WARRIOR">Perfect Warrior</option>
            </select>
          </div>

          <div>
            <label className="block text-[#bca782] mb-2 text-sm">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="console-input w-full"
              placeholder="SHADOW GLORY RUSH x2"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-[#bca782] mb-2 text-sm">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="console-input w-full h-24"
              placeholder="All Shadow Glory rewards are doubled!"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#bca782] mb-2 text-sm">Start Date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="console-input w-full"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-[#bca782] mb-2 text-sm">End Date</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="console-input w-full"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {formData.eventType === 'SHADOW_GLORY_RUSH' && (
            <div>
              <label className="block text-[#bca782] mb-2 text-sm">Multiplier</label>
              <input
                type="number"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: parseInt(e.target.value) })}
                className="console-input w-full"
                min="1"
                max="5"
                required
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5"
              disabled={isSubmitting}
            />
            <label htmlFor="isActive" className="text-[#bca782] text-sm cursor-pointer">
              Activate immediately
            </label>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              className="console-button console-button-play flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'CREATING...' : 'CREATE EVENT'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="console-button console-button-exit flex-1"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Event Details Modal (placeholder)
function EventDetailsModal({ 
  event, 
  onClose, 
  onUpdated 
}: { 
  event: WeeklyEvent; 
  onClose: () => void;
  onUpdated: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1410] border-4 border-[#4d3a25] p-6 max-w-2xl w-full"
      >
        <h2 className="text-2xl font-departure text-[#e2b045] mb-4">{event.title}</h2>
        <p className="text-[#bca782] mb-6">{event.description}</p>
        
        <div className="space-y-2 text-sm text-[#bca782] mb-6">
          <div>Type: {event.eventType}</div>
          <div>Start: {new Date(event.startDate).toLocaleString()}</div>
          <div>End: {new Date(event.endDate).toLocaleString()}</div>
          <div>Active: {event.isActive ? 'Yes' : 'No'}</div>
        </div>

        <button
          onClick={onClose}
          className="console-button console-button-exit w-full"
        >
          CLOSE
        </button>
      </motion.div>
    </div>
  );
}

