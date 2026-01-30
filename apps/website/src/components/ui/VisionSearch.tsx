'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export function VisionSearch() {
    const [query, setQuery] = useState('');

    return (
        <div className="relative max-w-2xl mx-auto w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-4 border border-stone-200 rounded-2xl leading-5 bg-stone-50 placeholder-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                placeholder="Search the 2026 Vision (e.g. 'Harvest', 'LCAA', 'Agents')..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {/* Search results would go here in a real implementation */}
            {query && (
                <div className="absolute mt-2 w-full bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50">
                    <p className="p-3 text-sm text-stone-500 italic">Searching '{query}'...</p>
                    {/* Mock results for MVP */}
                    <div className="border-t border-stone-100 mt-1 pt-1">
                        <a href="/vision" className="block p-3 hover:bg-emerald-50 rounded-lg group">
                            <p className="font-semibold text-emerald-900 group-hover:text-emerald-700">ACT 2026: The Harvest Year</p>
                            <p className="text-sm text-stone-500">Vision Book</p>
                        </a>
                        <a href="/engine" className="block p-3 hover:bg-emerald-50 rounded-lg group">
                            <p className="font-semibold text-emerald-900 group-hover:text-emerald-700">Ecosystem Setup Workflow</p>
                            <p className="text-sm text-stone-500">The Engine</p>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
