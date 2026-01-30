import fs from 'fs';
import path from 'path';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { VisionSearch } from '@/components/ui/VisionSearch';
import { Typewriter } from '@/components/ui/Typewriter';

export default async function EnginePage() {
    const filePath = path.join(process.cwd(), 'src/data/engine/workflow.md');
    const content = fs.readFileSync(filePath, 'utf8');

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <div className="py-10">
                <header className="mb-10 text-center space-y-4">
                    <h1 className="text-3xl font-bold text-emerald-900 tracking-wider">
                        THE NEURAL <span className="font-light text-emerald-600">ENGINE</span>
                    </h1>
                    <VisionSearch />
                </header>

                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl border border-stone-800 text-stone-300 font-mono text-sm leading-relaxed min-h-[80vh]">
                        <div className="flex items-center gap-2 mb-6 border-b border-stone-700 pb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="ml-2 text-stone-500">agent@act-engine:~/workflows</span>
                        </div>
                        <div className="mb-8 font-mono text-green-400">
                            <Typewriter text={"> INITIALIZING NEURAL ENGINE...\n> LOADING WORKFLOWS...\n> CONNECTING TO ACT ECOSYSTEM...\n> STATUS: ONLINE"} speed={40} />
                        </div>
                        <div className="animate-in fade-in duration-1000 delay-1000 fill-mode-both">
                            <MarkdownViewer content={content} variant="dark" />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
