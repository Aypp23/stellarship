'use client';

import { useEffect, useState } from 'react';

export default function ProfileCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Discord connection...');

  useEffect(() => {
    // Check for Discord callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('discord_success');
    const error = urlParams.get('discord_error');

    console.log('🟢 [Profile Callback] Discord callback received');
    console.log('🟢 [Profile Callback] Success:', success || 'none');
    console.log('🟢 [Profile Callback] Error:', error || 'none');

    if (success === 'connected') {
      console.log('✅ [Profile Callback] Discord connected successfully!');
      setStatus('success');
      setMessage('Discord connected successfully!');
      
      // Success! Close popup after short delay
      setTimeout(() => {
        console.log('🟢 [Profile Callback] Closing popup...');
        window.close();
      }, 1500);
    } else if (error) {
      console.error('🔴 [Profile Callback] Discord error:', error);
      setStatus('error');
      
      // Decode error message and make it user-friendly
      let errorMessage = decodeURIComponent(error);
      
      // Custom error messages for common errors
      if (errorMessage.includes('already connected to another user')) {
        errorMessage = 'This Discord account is already linked to another wallet. Please use a different Discord account.';
      } else if (errorMessage.includes('already connected')) {
        errorMessage = 'This Discord account is already connected. You can only connect Discord once.';
      } else if (errorMessage.includes('expired')) {
        errorMessage = 'Connection expired. Please try again.';
      } else if (errorMessage.includes('invalid')) {
        errorMessage = 'Invalid connection attempt. Please try again.';
      } else {
        errorMessage = `Connection failed: ${errorMessage}`;
      }
      
      setMessage(errorMessage);
      
      // Error! Close popup after showing error
      setTimeout(() => {
        console.log('🟢 [Profile Callback] Closing popup...');
        window.close();
      }, 4000);
    } else {
      // No parameters, just close
      console.log('🟢 [Profile Callback] No callback parameters, closing...');
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen bg-console-gradient flex items-center justify-center console-cursor p-4">
      <div 
        className="console-panel text-center max-w-md p-8"
        style={{
          border: status === 'error' ? '3px solid #ff6b6b' : 
                 status === 'success' ? '3px solid #9ac44d' : 
                 '3px solid #4d3a25'
        }}
      >
        {/* Status Icon */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-16 h-16 mx-auto border-4 border-[#e6d2ac] border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto bg-[#9ac44d] border-4 border-[#e6d2ac] flex items-center justify-center">
              <div className="text-3xl text-[#1b1411]">✓</div>
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto bg-[#ff6b6b] border-4 border-[#e6d2ac] flex items-center justify-center">
              <div className="text-3xl text-[#1b1411]">✗</div>
            </div>
          )}
        </div>

        {/* Title */}
        <div 
          className={`console-text-title text-xl mb-4 ${
            status === 'success' ? 'text-[#9ac44d]' :
            status === 'error' ? 'text-[#ff6b6b]' :
            'text-[#e6d2ac]'
          }`}
        >
          {status === 'success' ? 'SUCCESS' :
           status === 'error' ? 'CONNECTION FAILED' :
           'CONNECTING'}
        </div>

        {/* Message */}
        <div className="console-text-subtitle text-sm text-[#e6d2ac] mb-6">
          {message}
        </div>

        {/* Auto-close message */}
        <div className="text-xs text-[#8a7a5e]">
          Window will close automatically...
        </div>
      </div>
    </div>
  );
}

