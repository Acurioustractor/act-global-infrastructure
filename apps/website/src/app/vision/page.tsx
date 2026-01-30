import fs from 'fs';
import path from 'path';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { VisionSearch } from '@/components/ui/VisionSearch';

export default async function VisionPage() {
    const filePath = path.join(process.cwd(), 'src/data/vision/vision.md');
    const content = fs.readFileSync(filePath, 'utf8');

    return (
        <div className="min-h-screen bg-[#FDFBF7] bg-paper-texture relative overflow-hidden">
            {/* Mycelial Background Effect */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/50 rounded-full mix-blend-multiply filter blur-3xl animate-breathe" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-breathe" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-amber-100/50 rounded-full mix-blend-multiply filter blur-3xl animate-breathe" style={{ animationDelay: '4s' }}></div>
            </div>

            <div className="py-10 relative z-10 transition-all duration-1000 ease-out animate-in fade-in slide-in-from-bottom-4">
                <header className="mb-10 text-center space-y-4">
                    <h1 className="text-4xl font-bold text-emerald-900 tracking-wider font-serif">
                        ACT 2026
                    </h1>
                    <p className="text-stone-500 font-serif italic text-lg animate-float">"From Extraction to Connection"</p>
                    <VisionSearch />
                </header>

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-sm p-12 rounded-2xl shadow-xl border border-stone-100/50">
                    <MarkdownViewer content={content} />
                </main>
            </div>
        </div>
    );
}
