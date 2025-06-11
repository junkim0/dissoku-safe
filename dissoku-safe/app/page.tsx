'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/friend')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
      })
      .then((txt) => {
        if (!txt) {
          throw new Error('No content received from API');
        }
        setHtml(txt);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <main style={{minHeight: '100vh', padding: '1rem', background: '#f5f5f5'}}>
      <h1 style={{fontSize: '1.75rem', fontWeight: 'bold', textAlign: 'center'}}>Dissoku Safe Mirror</h1>
      {loading && <p style={{textAlign: 'center'}}>Loading…</p>}
      {error && <p style={{textAlign: 'center', color: 'red'}}>Error: {error}</p>}
      {/* eslint-disable-next-line react/no-danger */}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </main>
  );
} 