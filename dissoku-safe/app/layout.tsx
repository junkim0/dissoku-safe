import './globals.css';
import * as React from 'react';

export const metadata = {
  title: 'Dissoku Safe Mirror',
  description: 'Browse Dissoku friend listings without 18+ content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
    </html>
  );
} 