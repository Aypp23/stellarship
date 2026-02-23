'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';
import { CreateGuildData } from '@/types/guild';
import { X, Shield, Coins, AlertCircle, CheckCircle, Lock, Unlock, Edit, Users } from 'lucide-react';

interface CreateGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateGuildModal: React.FC<CreateGuildModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateGuildData>({
    name: '',
    description: '',
    maxMembers: 50,
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [mainnetBalance, setMainnetBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const { publicKey, connected } = useWallet();

  // Check mainnet balance for the connected wallet
  const checkMainnetBalance = async () => {
    if (!publicKey || !connected) {
      setError('Please connect your wallet first');
      return;
    }

    setCheckingBalance(true);
    setError(null);

    try {
      // Create direct connection to mainnet using Alchemy RPC
      const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const alchemyRPC = 'https://solana-mainnet.g.alchemy.com/v2/qAvNaH_2eO6W8EERXSNnwOrcR9uJqlu7';
      const mainnetConnection = new Connection(alchemyRPC, 'confirmed');

      console.log('Checking mainnet balance for:', publicKey.toString());
      console.log('Using Alchemy RPC:', alchemyRPC);

      const balance = await mainnetConnection.getBalance(new PublicKey(publicKey.toString()));
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      console.log('Mainnet balance:', balanceSOL, 'SOL');

      setMainnetBalance(balanceSOL);

      if (balanceSOL < 0.01) {
        setError(`Insufficient mainnet SOL balance. Required: 0.01 SOL, Current: ${balanceSOL.toFixed(4)} SOL`);
      } else {
        setError(null); // Clear error if balance is sufficient
      }
    } catch (err) {
      console.error('Failed to check mainnet balance:', err);
      setError('Failed to check mainnet balance. Please try again.');
    } finally {
      setCheckingBalance(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Guild name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Guild name must be at least 3 characters';
    } else if (formData.name.trim().length > 30) {
      errors.name = 'Guild name must be 30 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name.trim())) {
      errors.name = 'Guild name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Description validation
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description must be 200 characters or less';
    }

    // Max members validation
    if (formData.maxMembers !== undefined) {
      if (formData.maxMembers < 2) {
        errors.maxMembers = 'Guild must allow at least 2 members';
      } else if (formData.maxMembers > 100) {
        errors.maxMembers = 'Guild cannot have more than 100 members';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!publicKey || !connected) {
      setError('Please connect your wallet to create a guild');
      return;
    }

    // Check mainnet balance if not already checked
    if (mainnetBalance === null) {
      setError('Please check your mainnet balance first by clicking "Check Mainnet Balance"');
      return;
    }

    if (mainnetBalance < 0.01) {
      setError(`Insufficient mainnet SOL balance. Required: 0.01 SOL, Current: ${mainnetBalance.toFixed(4)} SOL`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/guilds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          maxMembers: formData.maxMembers,
          isPrivate: formData.isPrivate,
          userWalletAddress: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (errorData.code === 'INSUFFICIENT_MAINNET_BALANCE') {
          setError(`${errorData.message}\nPlease add more SOL to your mainnet wallet.`);
        } else if (errorData.code === 'WALLET_REQUIRED') {
          setError('Wallet connection is required to create a guild.');
        } else if (errorData.code === 'BALANCE_CHECK_FAILED') {
          setError('Failed to verify wallet balance. Please check your wallet connection.');
        } else {
          setError(errorData.message || `Error: ${response.status}`);
        }
        return;
      }

      // Success!
      onSuccess();
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create guild');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      maxMembers: 50,
      isPrivate: false,
    });
    setError(null);
    setValidationErrors({});
    setMainnetBalance(null);
    setCheckingBalance(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const handleInputChange = (field: keyof CreateGuildData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <MedievalPanel title="ESTABLISH GUILD" className="relative flex flex-col max-h-[90vh]">
              {/* Close Button */}
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="absolute top-4 right-4 text-medieval-text-secondary hover:text-red-500 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 pt-2 overflow-y-auto custom-scrollbar">
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="font-serif-vintage text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Guild Name */}
                  <div>
                    <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Guild Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter a legendary name..."
                      maxLength={30}
                      className={`w-full bg-medieval-bg-dark border px-4 py-3 font-medieval text-medieval-text text-lg focus:outline-none rounded transition-colors placeholder-medieval-text-secondary/30 ${validationErrors.name
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-medieval-border focus:border-medieval-gold'
                        }`}
                      disabled={isLoading}
                    />
                    {validationErrors.name && (
                      <p className="font-serif-vintage text-red-400 text-xs mt-1 ml-1">{validationErrors.name}</p>
                    )}
                    <p className="font-serif-vintage text-medieval-text-secondary/50 text-xs mt-1 text-right">
                      {formData.name.length}/30
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Edit className="w-3 h-3" /> Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe your guild's purpose and destiny..."
                      maxLength={200}
                      rows={3}
                      className={`w-full bg-medieval-bg-dark border px-4 py-3 font-serif-vintage text-medieval-text text-sm focus:outline-none placeholder-medieval-text-secondary/30 resize-none rounded transition-colors ${validationErrors.description
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-medieval-border focus:border-medieval-gold'
                        }`}
                      disabled={isLoading}
                    />
                    {validationErrors.description && (
                      <p className="font-serif-vintage text-red-400 text-xs mt-1 ml-1">{validationErrors.description}</p>
                    )}
                    <p className="font-serif-vintage text-medieval-text-secondary/50 text-xs mt-1 text-right">
                      {(formData.description || '').length}/200
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Max Members */}
                    <div>
                      <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users className="w-3 h-3" /> Max Members
                      </label>
                      <input
                        type="number"
                        value={formData.maxMembers}
                        onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value) || 2)}
                        min={2}
                        max={100}
                        className={`w-full bg-medieval-bg-dark border px-4 py-3 font-medieval text-medieval-text text-lg focus:outline-none rounded transition-colors ${validationErrors.maxMembers
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-medieval-border focus:border-medieval-gold'
                          }`}
                        disabled={isLoading}
                      />
                      {validationErrors.maxMembers && (
                        <p className="font-serif-vintage text-red-400 text-xs mt-1 ml-1">{validationErrors.maxMembers}</p>
                      )}
                    </div>

                    {/* Privacy Setting */}
                    <div>
                      <label className="block font-serif-vintage font-bold text-medieval-text-secondary text-xs uppercase tracking-wider mb-2">
                        Access Control
                      </label>
                      <div
                        onClick={() => !isLoading && handleInputChange('isPrivate', !formData.isPrivate)}
                        className={`w-full border px-4 py-3 rounded cursor-pointer flex items-center gap-3 transition-colors ${formData.isPrivate
                            ? 'bg-medieval-gold/10 border-medieval-gold'
                            : 'bg-medieval-bg-dark border-medieval-border hover:border-medieval-gold/50'
                          }`}
                      >
                        {formData.isPrivate ? (
                          <Lock className="w-5 h-5 text-medieval-gold" />
                        ) : (
                          <Unlock className="w-5 h-5 text-medieval-text-secondary" />
                        )}
                        <span className={`font-medieval text-sm ${formData.isPrivate ? 'text-medieval-gold' : 'text-medieval-text'}`}>
                          {formData.isPrivate ? 'Private (Invite Only)' : 'Public (Open to All)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mainnet Balance Check */}
                  <div className="bg-medieval-bg-dark/50 border border-medieval-border/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3 border-b border-medieval-border/30 pb-2">
                      <h3 className="font-medieval text-medieval-gold flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Mainnet Requirement
                      </h3>
                      {connected ? (
                        <span className="flex items-center gap-1 font-serif-vintage text-green-500 text-xs font-bold tracking-wider">
                          <CheckCircle className="w-3 h-3" /> WALLET CONNECTED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-serif-vintage text-red-400 text-xs font-bold tracking-wider">
                          <X className="w-3 h-3" /> DISCONNECTED
                        </span>
                      )}
                    </div>

                    <p className="font-serif-vintage text-medieval-text-secondary text-xs italic mb-4">
                      Establishing a guild requires proof of strength (0.01 SOL on Mainnet).
                    </p>

                    {connected && publicKey && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-medieval-text-secondary">Wallet:</span>
                          <span className="text-medieval-text">
                            {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-6)}
                          </span>
                        </div>

                        {mainnetBalance !== null && (
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-medieval-text-secondary">Balance:</span>
                            <span className={`flex items-center gap-1 ${mainnetBalance >= 0.01 ? 'text-green-500' : 'text-red-400'
                              }`}>
                              {mainnetBalance.toFixed(4)} SOL {mainnetBalance >= 0.01 ? '✓' : '✗'}
                            </span>
                          </div>
                        )}

                        <MedievalButton
                          type="button"
                          onClick={checkMainnetBalance}
                          variant="secondary"
                          className="w-full text-xs h-8"
                          disabled={checkingBalance || isLoading}
                        >
                          {checkingBalance ? 'VERIFYING TREASURY...' : 'VERIFY BALANCE'}
                        </MedievalButton>
                      </div>
                    )}

                    {!connected && (
                      <div className="text-center py-2">
                        <p className="font-serif-vintage text-red-400 text-xs">
                          Connect wallet to proceed
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-8 pt-4 border-t border-medieval-border/30">
                  <MedievalButton
                    type="button"
                    onClick={handleClose}
                    variant="secondary"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    CANCEL
                  </MedievalButton>
                  <MedievalButton
                    type="submit"
                    variant="gold"
                    className="flex-1"
                    disabled={
                      isLoading ||
                      !formData.name.trim() ||
                      !connected ||
                      mainnetBalance === null ||
                      mainnetBalance < 0.01
                    }
                  >
                    {isLoading ? 'ESTABLISHING...' : 'CREATE GUILD'}
                  </MedievalButton>
                </div>
              </form>
            </MedievalPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateGuildModal;
