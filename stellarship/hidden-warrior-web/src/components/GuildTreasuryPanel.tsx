'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GuildTreasury, GuildTransaction, TransactionType, TransactionStatus } from '@/types/guild';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';
import { Coins, Copy, Check, ArrowRight, Wallet, Info, X } from 'lucide-react';

interface GuildTreasuryPanelProps {
  guildId: number;
  isMember: boolean;
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  signature?: string;
}

const GuildTreasuryPanel: React.FC<GuildTreasuryPanelProps> = ({
  guildId,
  isMember
}) => {
  const [treasury, setTreasury] = useState<GuildTreasury | null>(null);
  const [transactions, setTransactions] = useState<GuildTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const showNotification = useCallback((type: NotificationType, title: string, message: string, signature?: string) => {
    setNotification({ type, title, message, signature });
  }, []);

  const loadTreasuryData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const [treasuryResponse, transactionsResponse] = await Promise.all([
        fetch(`/api/guilds/${guildId}/treasury`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/guilds/${guildId}/transactions?page=1&limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (treasuryResponse.ok) {
        const treasuryData = await treasuryResponse.json();
        setTreasury(treasuryData);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load treasury data:', error);
      showNotification('error', 'Loading Failed', 'Failed to load treasury data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [guildId, showNotification]);

  useEffect(() => {
    if (isMember) {
      loadTreasuryData();
    }
  }, [guildId, isMember, loadTreasuryData]);

  const closeNotification = () => {
    setNotification(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      showNotification('success', 'Copied!', 'Treasury wallet address copied to clipboard.');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      showNotification('error', 'Copy Failed', 'Could not copy to clipboard. Please copy manually.');
    }
  };

  const handleCopyWallet = () => {
    if (treasury?.wallet?.publicKey) {
      copyToClipboard(treasury.wallet.publicKey);
    }
  };

  const getTransactionTypeLabel = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.ENTRY_FEE: return 'Entry Fee';
      case TransactionType.TREASURY_SPEND: return 'Treasury Spend';
      case TransactionType.DEPOSIT: return 'Deposit';
      case TransactionType.AIRDROP: return 'Airdrop';
      default: return type;
    }
  };

  const getStatusColor = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.CONFIRMED: return 'text-green-600';
      case TransactionStatus.PENDING: return 'text-medieval-gold';
      case TransactionStatus.PROCESSING: return 'text-blue-400';
      case TransactionStatus.FAILED: return 'text-red-500';
      case TransactionStatus.CANCELLED: return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  if (!isMember) {
    return (
      <MedievalPanel className="p-6 text-center opacity-75">
        <p className="font-medieval text-medieval-text-secondary">Only guild members can view treasury information</p>
      </MedievalPanel>
    );
  }

  if (loading) {
    return (
      <MedievalPanel className="p-6 text-center">
        <div className="w-8 h-8 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto animate-spin mb-2"></div>
        <p className="font-serif-vintage text-medieval-text-secondary">Consulting the ledger...</p>
      </MedievalPanel>
    );
  }

  if (!treasury) {
    return (
      <MedievalPanel className="p-6 text-center border-red-900/50">
        <p className="font-medieval text-red-500">Failed to load treasury data</p>
      </MedievalPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Treasury Overview */}
      <MedievalPanel title="ROYAL TREASURY" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-4 text-center rounded">
            <div className="text-2xl font-bold font-medieval text-medieval-gold drop-shadow-sm flex items-center justify-center gap-2">
              <Coins className="w-6 h-6" />
              {treasury.totalBalance ? treasury.totalBalance.toFixed(4) : '0.0000'} SOL
            </div>
            <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mt-1">Total Balance</div>
          </div>

          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-4 text-center rounded">
            <div className="text-2xl font-bold font-medieval text-medieval-text flex items-center justify-center gap-2">
              {treasury.pendingBalance ? treasury.pendingBalance.toFixed(4) : '0.0000'} SOL
            </div>
            <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mt-1">Pending</div>
          </div>

          <div className="bg-medieval-bg/30 border border-medieval-border/50 p-4 text-center rounded">
            <div className="text-lg font-bold font-medieval text-medieval-text/80 truncate px-2">
              {treasury?.wallet?.publicKey ? treasury.wallet.publicKey.slice(0, 8) + '...' : 'No Wallet'}
            </div>
            <div className="text-xs font-serif-vintage text-medieval-text-secondary uppercase tracking-widest mt-1">Wallet Address</div>
          </div>
        </div>

        {/* Treasury Actions */}
        <div className="space-y-4">
          {/* Wallet Address Section */}
          <div className="bg-medieval-bg-dark/30 border border-medieval-border p-4 rounded">
            <h4 className="text-sm font-bold font-serif-vintage text-medieval-gold mb-3 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Treasury Wallet
            </h4>

            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-medieval-bg border border-medieval-border/50 p-2 flex-1 font-mono text-xs text-medieval-text break-all rounded">
                {treasury?.wallet?.publicKey || 'No wallet address'}
              </div>
              <MedievalButton
                onClick={handleCopyWallet}
                variant={copySuccess ? "primary" : "secondary"}
                className="text-xs px-3 py-2"
                disabled={!treasury?.wallet?.publicKey}
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </MedievalButton>
            </div>

            <div className="flex space-x-2">
              <MedievalButton
                onClick={() => setShowInstructions(true)}
                variant="gold"
                className="w-full md:w-auto"
              >
                HOW TO DEPOSIT
              </MedievalButton>
            </div>
          </div>
        </div>
      </MedievalPanel>

      {/* Recent Transactions */}
      <MedievalPanel title="LEDGER OF TRANSACTIONS" className="p-6">
        {transactions.length === 0 ? (
          <p className="text-medieval-text-secondary text-center font-serif-vintage italic">No transactions recorded in the royal ledger yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-medieval-bg/30 border border-medieval-border/30 p-3 flex justify-between items-center rounded hover:bg-medieval-bg/50 transition-colors"
              >
                <div>
                  <div className="font-medieval text-medieval-text">
                    {getTransactionTypeLabel(transaction.type)}
                  </div>
                  <div className="text-xs font-serif-vintage text-medieval-text-secondary italic">
                    {transaction.description || 'No description'}
                  </div>
                  <div className="text-[10px] text-medieval-text-secondary/70 mt-1">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medieval text-sm ${transaction.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(4)} SOL
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MedievalPanel>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <MedievalPanel className="max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" title="TREASURY DEPOSIT GUIDE">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-gold transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Step 1 */}
              <div className="bg-medieval-bg/50 border border-medieval-border p-4 rounded">
                <h4 className="text-lg font-medieval text-medieval-gold mb-3 flex items-center">
                  <span className="bg-medieval-gold text-medieval-bg rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold">1</span>
                  SWITCH PHANTOM TO DEVNET
                </h4>
                <div className="bg-medieval-bg-dark/30 p-4 space-y-2 rounded text-sm font-serif-vintage text-medieval-text-secondary">
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Open your Phantom wallet extension</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Click the settings gear in top right corner</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Navigate to Developer Settings</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Change Network from Mainnet to Devnet</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-medieval-bg/50 border border-medieval-border p-4 rounded">
                <h4 className="text-lg font-medieval text-medieval-gold mb-3 flex items-center">
                  <span className="bg-medieval-gold text-medieval-bg rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold">2</span>
                  GET DEVNET SOL (FREE!)
                </h4>
                <div className="bg-medieval-bg-dark/30 p-4 space-y-3 rounded text-sm font-serif-vintage">
                  <div className="bg-green-900/20 border border-green-800/50 p-3 rounded">
                    <div className="flex items-start space-x-2 mb-2">
                      <Info className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-bold tracking-wider text-xs">RECOMMENDED:</span>
                    </div>
                    <div className="text-medieval-text ml-6">Use the Arena Relic feature in our game!</div>
                  </div>
                  <div className="text-medieval-text-secondary text-center font-medieval">- OR -</div>
                  <div className="space-y-2 text-medieval-text-secondary">
                    <div className="flex items-start space-x-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                      <span>Visit: <code className="bg-medieval-bg-dark px-1 rounded text-medieval-text">faucet.solana.com</code></span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                      <span>Or use CLI: <code className="bg-medieval-bg-dark px-1 rounded text-medieval-text">solana airdrop 2</code></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-medieval-bg/50 border border-medieval-border p-4 rounded">
                <h4 className="text-lg font-medieval text-medieval-gold mb-3 flex items-center">
                  <span className="bg-medieval-gold text-medieval-bg rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold">3</span>
                  SEND SOL TO TREASURY
                </h4>
                <div className="bg-medieval-bg-dark/30 p-4 space-y-2 rounded text-sm font-serif-vintage text-medieval-text-secondary">
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Copy the treasury wallet address from above</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>In Phantom: Click Send</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Paste the treasury address</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Enter the amount you want to deposit</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-medieval-gold" />
                    <span>Confirm and send the transaction!</span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded">
                <h4 className="text-sm font-bold text-blue-400 mb-3 font-serif-vintage tracking-wider flex items-center uppercase">
                  <Info className="w-5 h-5 mr-2" />
                  IMPORTANT NOTES
                </h4>
                <div className="space-y-2 text-xs font-serif-vintage text-blue-200/80">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>This is <span className="font-bold text-green-500">DEVNET</span> - not real money!</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-medieval-gold font-bold">⏱</span>
                    <span>Transactions may take 10-30 seconds to appear in the treasury</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400 font-bold">🔄</span>
                    <span>If transactions seem stuck, refresh the page after sending</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-red-400 font-bold">⚠️</span>
                    <span>Make sure Phantom is set to <span className="font-bold text-green-500">DEVNET</span> before sending!</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="text-center pt-4">
                <MedievalButton
                  onClick={() => setShowInstructions(false)}
                  variant="primary"
                  className="w-full md:w-auto px-8"
                >
                  I UNDERSTAND
                </MedievalButton>
              </div>
            </div>
          </MedievalPanel>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 max-w-md p-4 border rounded shadow-lg z-50 font-medieval ${notification.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
            notification.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
              notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100' :
                'bg-blue-900/90 border-blue-700 text-blue-100'
          }`}>
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-bold text-lg mb-1">{notification.title}</h5>
              <p className="text-sm font-serif-vintage opacity-90">{notification.message}</p>
              {notification.signature && (
                <p className="text-xs opacity-70 mt-1 break-all font-mono">
                  Signature: {notification.signature}
                </p>
              )}
            </div>
            <button
              onClick={closeNotification}
              className="ml-4 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildTreasuryPanel;

