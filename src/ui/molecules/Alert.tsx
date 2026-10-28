import React from 'react';
import { MessagePill } from './MessagePill';

interface AlertProps {
  tone: 'warning' | 'info';
  message: string;
}

// Legacy API kept for existing screens: 'warning' is the error look with a
// glyph, 'info' the blue pill. New code should use MessagePill directly.
export const Alert: React.FC<AlertProps> = ({ tone, message }) =>
  tone === 'warning' ? (
    <MessagePill tone="error" icon="warning" message={message} />
  ) : (
    <MessagePill tone="info" message={message} />
  );
