'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [debug, setDebug] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    console.log(msg);
    setDebug(prev => [...prev, msg]);
  };

  useEffect(() => {
    addDebug('Starting to fetch data...');
    
    fetch('/api/friend')
      .then(async (res) => {
        addDebug(`Response status: ${res.status}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        }
        return res.text();
      })
      .then((txt) => {
        addDebug(`Received content length: ${txt.length}`);
        if (!txt) {
          throw new Error('No content received from API');
        }
        setHtml(txt);
        setLoading(false);
      })
      .catch((err) => {
        const errorMsg = err.message || 'Unknown error occurred';
        addDebug(`Error occurred: ${errorMsg}`);
        console.error('Error fetching data:', err);
        setError(errorMsg);
        setLoading(false);
      });
  }, []);

  return (
    <main style={{minHeight: '100vh', padding: '1rem', background: '#f5f5f5'}}>
      <h1 style={{fontSize: '1.75rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem'}}>
        Dissoku Safe Mirror
      </h1>
      {loading && (
        <p style={{textAlign: 'center', fontSize: '1.2rem'}}>Loading profiles...</p>
      )}
      {error && (
        <p style={{textAlign: 'center', color: 'red', fontSize: '1.2rem'}}>
          Error: {error}
        </p>
      )}
      {html && (
        <div 
          className="content-wrapper"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1rem'
          }}
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      )}
      {/* Debug information */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#eee',
        borderRadius: '4px',
        fontSize: '0.9rem',
        fontFamily: 'monospace'
      }}>
        <h2 style={{marginBottom: '1rem'}}>Debug Info:</h2>
        {debug.map((msg, i) => (
          <div key={i} style={{marginBottom: '0.5rem'}}>
            {msg}
          </div>
        ))}
      </div>
    </main>
  );
} 