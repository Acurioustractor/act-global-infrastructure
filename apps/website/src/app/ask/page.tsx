import { AskACT } from '@/components/AskACT';

export const metadata = {
  title: 'Ask ACT | A Curious Tractor',
  description: 'Query the comprehensive ACT Intelligence Hub: LCAA methodology, partners, grants, workflows, projects, operations, and more.',
};

export default function AskPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white py-12">
      <AskACT />
    </main>
  );
}
