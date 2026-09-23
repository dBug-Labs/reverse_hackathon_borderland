'use client';

import React from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

interface UpiQrProps {
  /** UPI intent URI from buildUpiIntent(); empty while it's still loading */
  value: string;
  teamId: string;
}

/**
 * Payment QR for a UPI intent. Dark-on-white with a quiet zone so every
 * UPI app can scan it, even on the dark theme.
 */
export const UpiQr: React.FC<UpiQrProps> = ({ value, teamId }) => {
  if (!value) {
    return (
      <Image
        src="/qr-placeholder.svg"
        alt="UPI Payment QR Code Placeholder"
        width={240}
        height={240}
        className="w-full h-full object-contain"
        priority
      />
    );
  }

  return (
    <QRCodeSVG
      value={value}
      size={240}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#000000"
      title={`UPI payment QR for ${teamId}`}
      className="w-full h-full rounded-lg"
    />
  );
};
