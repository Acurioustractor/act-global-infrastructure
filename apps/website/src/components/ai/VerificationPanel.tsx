/**
 * Human Verification Panel for AI-Generated Content
 *
 * This component provides real-time human review capabilities for AI-generated
 * content across all ACT projects. It tracks quality metrics and feeds back
 * into the continuous improvement loop.
 *
 * Usage:
 * import { VerificationPanel } from '@/components/ai/VerificationPanel';
 *
 * <VerificationPanel
 *   generatedContent={aiOutput}
 *   contentType="blog_article"
 *   projectSlug="justicehub"
 *   onVerified={(feedback) => handleVerification(feedback)}
 * />
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VerificationFeedback {
  brandVoice: 1 | 2 | 3 | 4 | 5;
  culturalSafety: 1 | 2 | 3 | 4 | 5;
  factualAccuracy: 1 | 2 | 3 | 4 | 5;
  communityVoice: 1 | 2 | 3 | 4 | 5;
  overallQuality: 1 | 2 | 3 | 4 | 5;
  notes: string;
  improvementSuggestions: string[];
  issuesFound: string[];
  finalContent?: string;
  status: 'approved' | 'revised' | 'rejected';
}

interface VerificationPanelProps {
  generatedContent: string;
  contentType: string;
  projectSlug?: string;
  contentId?: string;
  onVerified?: (feedback: VerificationFeedback) => void;
  requireElderReview?: boolean;
}

export function VerificationPanel({
  generatedContent,
  contentType,
  projectSlug,
  contentId,
  onVerified,
  requireElderReview = false,
}: VerificationPanelProps) {
  const [feedback, setFeedback] = useState<Partial<VerificationFeedback>>({
    notes: '',
    improvementSuggestions: [],
    issuesFound: [],
    finalContent: generatedContent,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newIssue, setNewIssue] = useState('');

  const supabase = createClient();

  const handleScoreChange = (
    criterion: keyof Pick<
      VerificationFeedback,
      'brandVoice' | 'culturalSafety' | 'factualAccuracy' | 'communityVoice' | 'overallQuality'
    >,
    value: 1 | 2 | 3 | 4 | 5
  ) => {
    setFeedback(prev => ({ ...prev, [criterion]: value }));
  };

  const addSuggestion = () => {
    if (newSuggestion.trim()) {
      setFeedback(prev => ({
        ...prev,
        improvementSuggestions: [...(prev.improvementSuggestions || []), newSuggestion.trim()],
      }));
      setNewSuggestion('');
    }
  };

  const addIssue = () => {
    if (newIssue.trim()) {
      setFeedback(prev => ({
        ...prev,
        issuesFound: [...(prev.issuesFound || []), newIssue.trim()],
      }));
      setNewIssue('');
    }
  };

  const removeSuggestion = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      improvementSuggestions: prev.improvementSuggestions?.filter((_, i) => i !== index) || [],
    }));
  };

  const removeIssue = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      issuesFound: prev.issuesFound?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (status: 'approved' | 'revised' | 'rejected') => {
    setIsSubmitting(true);

    try {
      const completeFeedback: VerificationFeedback = {
        brandVoice: feedback.brandVoice || 3,
        culturalSafety: feedback.culturalSafety || 3,
        factualAccuracy: feedback.factualAccuracy || 3,
        communityVoice: feedback.communityVoice || 3,
        overallQuality: feedback.overallQuality || 3,
        notes: feedback.notes || '',
        improvementSuggestions: feedback.improvementSuggestions || [],
        issuesFound: feedback.issuesFound || [],
        finalContent: feedback.finalContent || generatedContent,
        status,
      };

      // Save to database
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('ai_content_verifications').insert({
        content_id: contentId,
        content_type: contentType,
        project_slug: projectSlug,
        generated_content: generatedContent,
        final_content: completeFeedback.finalContent,
        brand_voice_score: completeFeedback.brandVoice,
        cultural_safety_score: completeFeedback.culturalSafety,
        factual_accuracy_score: completeFeedback.factualAccuracy,
        community_voice_score: completeFeedback.communityVoice,
        overall_quality_score: completeFeedback.overallQuality,
        human_notes: completeFeedback.notes,
        improvement_suggestions: completeFeedback.improvementSuggestions,
        issues_found: completeFeedback.issuesFound,
        verified_by: userData?.user?.id,
        status,
        requires_elder_review: requireElderReview,
      });

      if (error) throw error;

      // Trigger callback
      if (onVerified) {
        onVerified(completeFeedback);
      }

      // Show success message
      alert('Verification submitted successfully!');
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ScoreButton = ({
    value,
    currentValue,
    onChange,
  }: {
    value: 1 | 2 | 3 | 4 | 5;
    currentValue?: number;
    onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`w-10 h-10 rounded-full border-2 transition-all ${
        currentValue === value
          ? 'bg-green-600 text-white border-green-600 scale-110'
          : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
      }`}
    >
      {value}
    </button>
  );

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Human Verification Panel</h3>

      {requireElderReview && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Elder Review Required</strong> - This content contains cultural material
            and must be reviewed by appropriate cultural authorities before publication.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Brand Voice Consistency */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Brand Voice Consistency
            <span className="text-gray-500 text-xs ml-2">
              (Does it sound like ACT? Grounded yet visionary, humble yet confident)
            </span>
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(val => (
              <ScoreButton
                key={val}
                value={val}
                currentValue={feedback.brandVoice}
                onChange={val => handleScoreChange('brandVoice', val)}
              />
            ))}
          </div>
        </div>

        {/* Cultural Safety */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Cultural Safety
            <span className="text-gray-500 text-xs ml-2">
              (Respects OCAP®, consent, Indigenous protocols)
            </span>
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(val => (
              <ScoreButton
                key={val}
                value={val}
                currentValue={feedback.culturalSafety}
                onChange={val => handleScoreChange('culturalSafety', val)}
              />
            ))}
          </div>
        </div>

        {/* Factual Accuracy */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Factual Accuracy
            <span className="text-gray-500 text-xs ml-2">
              (Correct facts about ACT projects, methodology, values)
            </span>
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(val => (
              <ScoreButton
                key={val}
                value={val}
                currentValue={feedback.factualAccuracy}
                onChange={val => handleScoreChange('factualAccuracy', val)}
              />
            ))}
          </div>
        </div>

        {/* Community Voice */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Community Voice Centered
            <span className="text-gray-500 text-xs ml-2">
              (Centers community voices, not institutional)
            </span>
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(val => (
              <ScoreButton
                key={val}
                value={val}
                currentValue={feedback.communityVoice}
                onChange={val => handleScoreChange('communityVoice', val)}
              />
            ))}
          </div>
        </div>

        {/* Overall Quality */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Overall Quality
            <span className="text-gray-500 text-xs ml-2">(Would you publish this as-is?)</span>
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(val => (
              <ScoreButton
                key={val}
                value={val}
                currentValue={feedback.overallQuality}
                onChange={val => handleScoreChange('overallQuality', val)}
              />
            ))}
          </div>
        </div>

        {/* Edit Final Content */}
        <div>
          <label className="block text-sm font-medium mb-2">Final Content (Editable)</label>
          <textarea
            value={feedback.finalContent || generatedContent}
            onChange={e => setFeedback(prev => ({ ...prev, finalContent: e.target.value }))}
            className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={feedback.notes}
            onChange={e => setFeedback(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional context or observations..."
            className="w-full h-24 p-3 border rounded-lg"
          />
        </div>

        {/* Improvement Suggestions */}
        <div>
          <label className="block text-sm font-medium mb-2">Improvement Suggestions</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSuggestion}
              onChange={e => setNewSuggestion(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addSuggestion()}
              placeholder="Add a suggestion..."
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={addSuggestion}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {feedback.improvementSuggestions?.map((suggestion, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1 p-2 bg-gray-50 rounded">{suggestion}</span>
                <button
                  type="button"
                  onClick={() => removeSuggestion(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Issues Found */}
        <div>
          <label className="block text-sm font-medium mb-2">Issues Found</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newIssue}
              onChange={e => setNewIssue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addIssue()}
              placeholder="Add an issue..."
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={addIssue}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {feedback.issuesFound?.map((issue, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-1 p-2 bg-red-50 rounded">{issue}</span>
                <button
                  type="button"
                  onClick={() => removeIssue(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => handleSubmit('approved')}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Approve & Publish'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('revised')}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Save Revisions'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('rejected')}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
