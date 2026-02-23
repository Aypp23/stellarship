'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ProposalWithStats,
  ProposalType,
  ProposalStatus,
  VoteChoice,
  CreateProposalData
} from '@/types/guild';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';
import { useGuildToastContext } from '@/contexts/GuildToastContext';
import {
  Vote,
  UserMinus,
  Settings,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';

interface GuildVotingPanelProps {
  guildId: number;
  isLeader: boolean;
  isMember: boolean;
  userId: number;
}

const GuildVotingPanel: React.FC<GuildVotingPanelProps> = ({
  guildId,
  isLeader,
  isMember,
  userId
}) => {
  const toast = useGuildToastContext();
  const [proposals, setProposals] = useState<ProposalWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createData, setCreateData] = useState<CreateProposalData>({
    type: ProposalType.TREASURY_SPEND,
    title: '',
    description: '',
    amount: 0,
    targetUserId: undefined,
    targetAddress: '',
    expirationHours: 72
  });

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guilds/${guildId}/proposals?page=1&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    if (isMember) {
      loadProposals();
    }
  }, [guildId, isMember, loadProposals]);

  const handleCreateProposal = async () => {
    if (!createData.title || !createData.description) {
      toast.warning('Title and description are required');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guilds/${guildId}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createData)
      });

      if (!response.ok) throw new Error('Failed to create proposal');

      setShowCreateModal(false);
      setCreateData({
        type: ProposalType.TREASURY_SPEND,
        title: '',
        description: '',
        amount: 0,
        targetUserId: undefined,
        targetAddress: '',
        expirationHours: 72
      });
      await loadProposals();
      toast.success('Proposal created successfully!');
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast.error('Failed to create proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: number, voteChoice: VoteChoice) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/guilds/${guildId}/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voteChoice })
      });

      if (!response.ok) throw new Error('Failed to vote');

      await loadProposals(); // Reload to get updated stats
      toast.success(`Vote cast: ${voteChoice}`);
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getProposalTypeLabel = (type: ProposalType) => {
    switch (type) {
      case ProposalType.TREASURY_SPEND:
        return <><Coins className="w-4 h-4 mr-1 text-medieval-gold" /> Treasury Spend</>;
      case ProposalType.MEMBER_KICK:
        return <><UserMinus className="w-4 h-4 mr-1 text-red-500" /> Member Kick</>;
      case ProposalType.SETTINGS_CHANGE:
        return <><Settings className="w-4 h-4 mr-1 text-blue-400" /> Settings Change</>;
      default:
        return type;
    }
  };

  const getStatusColor = (status: ProposalStatus): string => {
    switch (status) {
      case ProposalStatus.ACTIVE: return 'text-blue-400';
      case ProposalStatus.APPROVED: return 'text-green-500';
      case ProposalStatus.REJECTED: return 'text-red-500';
      case ProposalStatus.EXPIRED: return 'text-gray-500';
      case ProposalStatus.CANCELLED: return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const userHasVoted = (proposal: ProposalWithStats): boolean => {
    return proposal.votes.some(vote => vote.voterId === userId);
  };

  const getUserVote = (proposal: ProposalWithStats): VoteChoice | null => {
    const vote = proposal.votes.find(vote => vote.voterId === userId);
    return vote ? vote.voteChoice : null;
  };

  if (!isMember) {
    return (
      <MedievalPanel className="p-6 text-center opacity-75">
        <p className="font-medieval text-medieval-text-secondary">Only guild members can view proposals</p>
      </MedievalPanel>
    );
  }

  if (loading) {
    return (
      <MedievalPanel className="p-6 text-center">
        <div className="w-8 h-8 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto animate-spin mb-2"></div>
        <p className="font-serif-vintage text-medieval-text-secondary">Summoning the council...</p>
      </MedievalPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MedievalPanel title="GUILD GOVERNANCE" className="p-6">
        <div className="flex justify-end -mt-12 mb-4">
          {isLeader && (
            <MedievalButton
              onClick={() => setShowCreateModal(true)}
              variant="gold"
              className="px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              CREATE PROPOSAL
            </MedievalButton>
          )}
        </div>

        <p className="font-serif-vintage text-medieval-text-secondary text-sm italic border-b border-medieval-border/50 pb-4 mb-4">
          Democratic decision-making for guild matters. Quorum: 50% | Approval: 60%
        </p>

        {/* Proposals List */}
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <p className="text-center font-medieval text-medieval-text-secondary py-8">No active proposals in the council.</p>
          ) : (
            proposals.map((proposal) => (
              <div key={proposal.id} className="bg-medieval-bg/30 border border-medieval-border/50 p-6 rounded shadow-sm hover:border-medieval-gold/30 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex-1 w-full">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-bold flex items-center bg-medieval-bg-dark/50 px-2 py-1 rounded text-white">
                        {getProposalTypeLabel(proposal.type)}
                      </span>
                      <span className={`text-sm font-bold uppercase tracking-wider flex items-center gap-1 ${getStatusColor(proposal.status)}`}>
                        {proposal.status === 'ACTIVE' && <Clock className="w-3 h-3" />}
                        {proposal.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                        {proposal.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {proposal.status}
                      </span>
                    </div>

                    <h4 className="text-xl font-medieval text-medieval-gold mb-2 drop-shadow-sm">
                      {proposal.title}
                    </h4>

                    <p className="font-serif-vintage text-medieval-text leading-relaxed text-sm bg-medieval-bg/20 p-3 rounded border border-medieval-border/20 mb-3">
                      {proposal.description}
                    </p>

                    {proposal.amount && (
                      <div className="text-green-500 font-bold mb-2 font-medieval text-lg flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Amount: {proposal.amount.toFixed(4)} SOL
                      </div>
                    )}

                    <div className="text-xs text-medieval-text-secondary font-serif-vintage flex items-center gap-2 flex-wrap">
                      <span>Proposed by: <span className="text-medieval-text">{proposal.proposer.walletAddress.slice(0, 8)}...</span></span>
                      <span className="text-medieval-border">•</span>
                      {proposal.status === ProposalStatus.ACTIVE && (
                        <span>Times remaining: <span className="text-medieval-gold">{getTimeRemaining(proposal.expiresAt)}</span></span>
                      )}
                      {proposal.status !== ProposalStatus.ACTIVE && (
                        <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Voting Stats */}
                <div className="bg-medieval-bg-dark/30 border border-medieval-border/30 p-4 rounded mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <div className="text-xl font-medieval text-green-500">
                        {proposal.stats.votesFor}
                      </div>
                      <div className="text-[10px] text-medieval-text-secondary uppercase tracking-widest">FOR</div>
                    </div>

                    <div>
                      <div className="text-xl font-medieval text-red-500">
                        {proposal.stats.votesAgainst}
                      </div>
                      <div className="text-[10px] text-medieval-text-secondary uppercase tracking-widest">AGAINST</div>
                    </div>

                    <div>
                      <div className="text-lg font-medieval text-blue-400">
                        {proposal.stats.participationRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-medieval-text-secondary uppercase tracking-widest">Turnout</div>
                    </div>

                    <div>
                      <div className="text-lg font-medieval text-medieval-gold">
                        {proposal.stats.approvalRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-medieval-text-secondary uppercase tracking-widest">Approval</div>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-medieval-text-secondary uppercase tracking-wider mb-1">
                        <span>Quorum (50%)</span>
                        <span>{proposal.stats.totalVotes}/{proposal.stats.totalMembers} votes</span>
                      </div>
                      <div className="w-full bg-medieval-bg-dark h-2 rounded-full overflow-hidden border border-medieval-border/30">
                        <div
                          className={`h-full transition-all duration-500 ${proposal.stats.quorumReached ? 'bg-green-600' : 'bg-yellow-600'}`}
                          style={{ width: `${proposal.stats.participationRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-medieval-text-secondary uppercase tracking-wider mb-1">
                        <span>Approval Threshold (60%)</span>
                        <span>{proposal.stats.approvalRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-medieval-bg-dark h-2 rounded-full overflow-hidden border border-medieval-border/30">
                        <div
                          className={`h-full transition-all duration-500 ${proposal.stats.approvalThresholdMet ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${Math.min(proposal.stats.approvalRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Buttons */}
                {proposal.status === ProposalStatus.ACTIVE && (
                  <div className="flex space-x-3 pt-2 border-t border-medieval-border/30">
                    {userHasVoted(proposal) ? (
                      <div className="text-center flex-1 py-2">
                        <div className="font-medieval text-medieval-gold mb-1 flex items-center justify-center gap-2">
                          {getUserVote(proposal) === 'FOR' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                          Your vote: {getUserVote(proposal)}
                        </div>
                        <div className="text-xs text-medieval-text-secondary font-serif-vintage italic">
                          The die is cast.
                        </div>
                      </div>
                    ) : (
                      <>
                        <MedievalButton
                          onClick={() => handleVote(proposal.id, VoteChoice.FOR)}
                          variant="primary"
                          disabled={submitting}
                          className="flex-1 bg-green-900/50 hover:bg-green-800 border-green-700 hover:border-green-500"
                        >
                          VOTE FOR
                        </MedievalButton>

                        <MedievalButton
                          onClick={() => handleVote(proposal.id, VoteChoice.AGAINST)}
                          variant="danger"
                          disabled={submitting}
                          className="flex-1"
                        >
                          VOTE AGAINST
                        </MedievalButton>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </MedievalPanel>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <MedievalPanel className="max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" title="DRAFT PROPOSAL">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-medieval-text-secondary hover:text-red-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                  Proposal Type
                </label>
                <select
                  value={createData.type}
                  onChange={(e) => setCreateData({
                    ...createData,
                    type: e.target.value as ProposalType
                  })}
                  className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-medieval rounded focus:border-medieval-gold focus:outline-none"
                >
                  <option value={ProposalType.TREASURY_SPEND}>Treasury Spend</option>
                  <option value={ProposalType.MEMBER_KICK}>Member Kick</option>
                  <option value={ProposalType.SETTINGS_CHANGE}>Settings Change</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={createData.title}
                  onChange={(e) => setCreateData({
                    ...createData,
                    title: e.target.value
                  })}
                  className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-serif-vintage rounded focus:border-medieval-gold focus:outline-none"
                  placeholder="Brief proposal title"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={createData.description}
                  onChange={(e) => setCreateData({
                    ...createData,
                    description: e.target.value
                  })}
                  className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-serif-vintage h-24 rounded focus:border-medieval-gold focus:outline-none"
                  placeholder="Detailed description of the proposal"
                  maxLength={500}
                />
              </div>

              {createData.type === ProposalType.TREASURY_SPEND && (
                <>
                  <div>
                    <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                      Amount (SOL)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={createData.amount}
                      onChange={(e) => setCreateData({
                        ...createData,
                        amount: parseFloat(e.target.value) || 0
                      })}
                      className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-mono rounded focus:border-medieval-gold focus:outline-none"
                      placeholder="0.0000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                      Target Address
                    </label>
                    <input
                      type="text"
                      value={createData.targetAddress}
                      onChange={(e) => setCreateData({
                        ...createData,
                        targetAddress: e.target.value
                      })}
                      className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-mono rounded focus:border-medieval-gold focus:outline-none"
                      placeholder="Recipient wallet address"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-serif-vintage font-bold text-medieval-text-secondary mb-2 uppercase tracking-wider">
                  Voting Period
                </label>
                <select
                  value={createData.expirationHours}
                  onChange={(e) => setCreateData({
                    ...createData,
                    expirationHours: parseInt(e.target.value)
                  })}
                  className="w-full p-2 bg-medieval-bg-dark border border-medieval-border text-medieval-text font-medieval rounded focus:border-medieval-gold focus:outline-none"
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours (default)</option>
                  <option value={168}>1 week</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 p-6 pt-0">
              <MedievalButton
                onClick={() => setShowCreateModal(false)}
                variant="secondary"
                disabled={submitting}
                className="flex-1"
              >
                CANCEL
              </MedievalButton>
              <MedievalButton
                onClick={handleCreateProposal}
                variant="gold"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'CREATING...' : 'SUBMIT PROPOSAL'}
              </MedievalButton>
            </div>
          </MedievalPanel>
        </div>
      )}
    </div>
  );
};

export default GuildVotingPanel;
