import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletStatusPanelProps {
    connected: boolean;
    publicKey: any;
}

export const WalletStatusPanel: React.FC<WalletStatusPanelProps> = ({
    connected,
    publicKey
}) => {
    // Corner Ornament SVG (Same as CharacterStatsPanel but smaller/adjusted if needed)
    const Corner = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 10 10"
            className={`absolute w-3 h-3 text-[#8a6a35] opacity-80 ${className}`}
        >
            <path d="M1 1H9V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="3" y="3" width="2" height="2" fill="currentColor" />
        </svg>
    );

    return (
        <div className="relative w-full max-w-2xl mx-auto z-50">
            {/* Main Container with "Physical" feel - Matching CharacterStatsPanel */}
            <div className="relative bg-[#d4c5a0] border-2 border-[#8a6a35] rounded-lg shadow-[0px_4px_0px_0px_#5c4033] overflow-visible">

                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-20 bg-[url('/assets/noise.png')] mix-blend-multiply pointer-events-none rounded-lg" />

                {/* Inner Border */}
                <div className="absolute inset-[3px] border border-[#8a6a35]/30 rounded pointer-events-none" />

                {/* Corner Ornaments */}
                <Corner className="top-1.5 left-1.5" />
                <Corner className="top-1.5 right-1.5 rotate-90" />
                <Corner className="bottom-1.5 left-1.5 -rotate-90" />
                <Corner className="bottom-1.5 right-1.5 rotate-180" />

                <div className="relative z-10 p-3 flex items-center justify-between gap-4 px-6">

                    {/* Left Side: Status & Address */}
                    <div className="flex items-center gap-4 pl-2">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-2 bg-[#e6d5b0] border border-[#8a6a35]/30 px-3 py-1.5 rounded shadow-inner">
                            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-600 shadow-[0_0_4px_rgba(22,163,74,0.6)]' : 'bg-red-500'}`} />
                            <span className="font-medieval text-xs text-[#5c4033] tracking-wider uppercase">
                                {connected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>

                    {/* Right Side: Wallet Button */}
                    <div className="relative z-50">
                        {/* We override the button styles globally, but here we ensure it fits the container */}
                        <WalletMultiButton className="!h-10 !px-4 !text-sm !bg-[#2a2018] !text-[#d4c5a0] !border-[#8a6a35] hover:!bg-[#3a2c22] !transition-all" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletStatusPanel;
