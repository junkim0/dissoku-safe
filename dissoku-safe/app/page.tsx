'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/friend')
      .then((res) => res.text())
      .then((txt) => {
        setHtml(txt);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <main style={{minHeight: '100vh', padding: '1rem', background: '#f5f5f5'}}>
      <h1 style={{fontSize: '1.75rem', fontWeight: 'bold', textAlign: 'center'}}>Dissoku Safe Mirror</h1>
      {loading && <p style={{textAlign: 'center'}}>Loading…</p>}
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
} 