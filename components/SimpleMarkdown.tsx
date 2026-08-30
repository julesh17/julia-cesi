import React from 'react';

function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>;
  });
}

export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let numberBuffer: string[] = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    const items = bulletBuffer;
    bulletBuffer = [];
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="julia-list">
        {items.map((item, i) => <li key={i}>{inline(item, `b-${nodes.length}-${i}`)}</li>)}
      </ul>,
    );
  };

  const flushNumbers = () => {
    if (!numberBuffer.length) return;
    const items = numberBuffer;
    numberBuffer = [];
    nodes.push(
      <ol key={`ol-${nodes.length}`} className="julia-list numbered">
        {items.map((item, i) => <li key={i}>{inline(item, `n-${nodes.length}-${i}`)}</li>)}
      </ol>,
    );
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);

    if (line.startsWith('- ') || line.startsWith('• ')) {
      flushNumbers();
      bulletBuffer.push(line.slice(2).trim());
      return;
    }

    if (numbered) {
      flushBullets();
      numberBuffer.push(numbered[1]);
      return;
    }

    flushBullets();
    flushNumbers();

    if (!line) return;
    if (line.startsWith('### ')) {
      nodes.push(<h4 key={index}>{inline(line.slice(4), `h4-${index}`)}</h4>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h3 key={index}>{inline(line.slice(3), `h3-${index}`)}</h3>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={index}>{inline(line.slice(2), `h2-${index}`)}</h2>);
    } else if (line.startsWith('> ')) {
      nodes.push(<blockquote key={index}>{inline(line.slice(2), `q-${index}`)}</blockquote>);
    } else if (/^---+$/.test(line)) {
      nodes.push(<hr key={index} />);
    } else {
      nodes.push(<p key={index}>{inline(line, `p-${index}`)}</p>);
    }
  });

  flushBullets();
  flushNumbers();

  return <div className="markdown-content">{nodes}</div>;
}
