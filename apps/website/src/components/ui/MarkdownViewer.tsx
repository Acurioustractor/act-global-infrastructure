import React from 'react';

interface MarkdownViewerProps {
    content: string;
    variant?: 'default' | 'dark';
}

export function MarkdownViewer({ content, variant = 'default' }: MarkdownViewerProps) {
    // Simple regex based parser to avoid heavy dependencies for this MVP
    // Supports headers, bold, lists, and images
    const lines = content.split('\n');

    const styles = {
        default: {
            h1: "text-4xl font-bold text-emerald-900 mt-8 mb-4",
            h2: "text-2xl font-semibold text-emerald-800 mt-6 mb-3 border-b border-stone-200 pb-2",
            h3: "text-xl font-medium text-emerald-700 mt-4 mb-2",
            p: "text-lg leading-relaxed text-stone-800",
            li: "ml-4 list-disc text-stone-700",
            blockquote: "border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-50 italic text-emerald-900 my-4",
            hr: "my-8 border-stone-300",
            link: "text-blue-600 hover:underline",
            strong: "font-bold text-stone-900",
            em: "italic text-stone-800"
        },
        dark: {
            h1: "text-3xl font-bold text-green-400 mt-8 mb-4 font-mono",
            h2: "text-xl font-semibold text-green-300 mt-6 mb-3 border-b border-stone-700 pb-2 font-mono",
            h3: "text-lg font-medium text-green-200 mt-4 mb-2 font-mono",
            p: "text-sm leading-relaxed text-stone-300 font-mono",
            li: "ml-4 list-disc text-stone-300 font-mono",
            blockquote: "border-l-2 border-stone-600 pl-4 py-2 bg-stone-800/50 italic text-stone-400 my-4 font-mono",
            hr: "my-8 border-stone-700",
            link: "text-blue-400 hover:underline",
            strong: "font-bold text-stone-100",
            em: "italic text-stone-200"
        }
    };

    const theme = styles[variant];

    // Helper for inline parsing with theme awareness
    const parseInterior = (text: string) => {
        let parsed = text;
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, `<strong class="${theme.strong}">$1</strong>`);
        parsed = parsed.replace(/\*(.*?)\*/g, `<em class="${theme.em}">$1</em>`);
        parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" class="${theme.link}">$1</a>`);
        // Basic code ticks for dark mode
        if (variant === 'dark') {
            parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-stone-800 px-1 py-0.5 rounded text-yellow-300">$1</code>');
        }
        return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
    };

    return (
        <div className={`max-w-none space-y-4 ${variant === 'default' ? 'font-serif' : 'font-mono'}`}>
            {lines.map((line, index) => {
                // Headers
                if (line.startsWith('# ')) return <h1 key={index} className={theme.h1}>{line.replace('# ', '')}</h1>;
                if (line.startsWith('## ')) return <h2 key={index} className={theme.h2}>{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={index} className={theme.h3}>{line.replace('### ', '')}</h3>;

                // Images
                const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
                if (imgMatch) {
                    const src = imgMatch[2].includes('poster') ? '/act_placemat_2026_poster.png' : imgMatch[2];
                    return (
                        <div key={index} className={`my-8 rounded-xl overflow-hidden ${variant === 'default' ? 'shadow-2xl border-4 border-emerald-900/10' : 'border border-stone-700'}`}>
                            <img src={src} alt={imgMatch[1]} className="w-full h-auto" />
                            <p className={`text-center text-sm mt-2 ${variant === 'default' ? 'text-stone-500 font-sans' : 'text-stone-500 font-mono'}`}>{imgMatch[1]}</p>
                        </div>
                    )
                }

                // Lists
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    return <li key={index} className={theme.li}>{parseInterior(line.substring(2))}</li>
                }

                // Blockquotes
                if (line.startsWith('> ')) {
                    return <blockquote key={index} className={theme.blockquote}>{parseInterior(line.replace('> ', ''))}</blockquote>
                }

                // Horizontal Rule
                if (line.startsWith('---')) return <hr key={index} className={theme.hr} />;

                // Empty lines
                if (line.trim() === '') return <div key={index} className="h-2" />;

                // Paragraphs
                return <p key={index} className={theme.p}>{parseInterior(line)}</p>;
            })}
        </div>
    );
}
