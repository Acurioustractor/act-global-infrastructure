"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase/client";
import {
  blockTypeOptions,
  defaultBlockData,
  type BlockType,
} from "../../../../lib/content/blocks";

type ContentItem = {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  published_at: string | null;
};

type BlockState = {
  id: string;
  type: BlockType;
  position: number;
  dataText: string;
};

const statusOptions = ["draft", "scheduled", "published", "archived"];

const toInputDateTime = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default function ContentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState<BlockType>("hero");
  const [publishedAt, setPublishedAt] = useState("");
  const publicPath = item
    ? item.type === "project"
      ? `/projects/${item.slug}`
      : item.type === "page"
        ? `/${item.slug}`
        : item.type === "post"
          ? `/blog/${item.slug}`
          : `/${item.type}/${item.slug}`
    : "/";

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    const { data: contentData, error: contentError } = await supabase
      .from("content_items")
      .select("id, type, slug, title, summary, status, published_at")
      .eq("id", id)
      .single();

    if (contentError) {
      setError(contentError.message);
      setLoading(false);
      return;
    }

    const { data: blockData, error: blockError } = await supabase
      .from("content_blocks")
      .select("id, type, position, data")
      .eq("content_id", id)
      .order("position", { ascending: true });

    if (blockError) {
      setError(blockError.message);
    }

    setItem(contentData);
    setPublishedAt(toInputDateTime(contentData.published_at));
    setBlocks(
      (blockData ?? []).map((block) => ({
        id: block.id,
        type: block.type as BlockType,
        position: block.position,
        dataText: JSON.stringify(block.data ?? {}, null, 2),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    loadContent();
  }, [id]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("content_items")
      .update({
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        status: item.status,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice("Content saved.");
    }

    setSaving(false);
  };

  const handleAddBlock = async () => {
    setNotice(null);
    setError(null);

    const payload = {
      content_id: id,
      position: blocks.length,
      type: newBlockType,
      data: defaultBlockData[newBlockType] ?? {},
    };

    const { data, error: insertError } = await supabase
      .from("content_blocks")
      .insert(payload)
      .select("id, type, position, data")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data) {
      setBlocks((prev) => [
        ...prev,
        {
          id: data.id,
          type: data.type as BlockType,
          position: data.position,
          dataText: JSON.stringify(data.data ?? {}, null, 2),
        },
      ]);
    }
  };

  const handleSaveBlock = async (blockId: string) => {
    const block = blocks.find((entry) => entry.id === blockId);
    if (!block) return;

    setNotice(null);
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(block.dataText || "{}");
    } catch (parseError) {
      setError("Block JSON is invalid.");
      return;
    }

    const { error: updateError } = await supabase
      .from("content_blocks")
      .update({
        type: block.type,
        position: block.position,
        data: parsed,
      })
      .eq("id", blockId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice("Block saved.");
    }
  };

  const handleResetBlock = (blockId: string, type: BlockType) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              type,
              dataText: JSON.stringify(defaultBlockData[type] ?? {}, null, 2),
            }
          : block
      )
    );
  };

  const persistPositions = async (updated: BlockState[]) => {
    const payload = updated.map((block, index) => ({
      id: block.id,
      position: index,
    }));
    const { error: updateError } = await supabase
      .from("content_blocks")
      .upsert(payload, { onConflict: "id" });

    if (updateError) {
      setError(updateError.message);
    }
  };

  const handleMoveBlock = async (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const updated = [...blocks];
    const swap = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = swap;

    const withPositions = updated.map((block, idx) => ({
      ...block,
      position: idx,
    }));

    setBlocks(withPositions);
    await persistPositions(withPositions);
  };

  const handleDeleteBlock = async (blockId: string) => {
    const { error: deleteError } = await supabase
      .from("content_blocks")
      .delete()
      .eq("id", blockId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const updated = blocks
      .filter((block) => block.id !== blockId)
      .map((block, index) => ({ ...block, position: index }));
    setBlocks(updated);
    await persistPositions(updated);
  };

  const blockCount = useMemo(() => blocks.length, [blocks]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6 text-sm text-[#4D3F33]">
        Loading content...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <p className="text-sm text-[#4D3F33]">Content not found.</p>
        <Link
          href="/admin/content"
          className="mt-4 inline-flex rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
        >
          Back to content
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
              {item.type}
            </p>
            <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              Edit content
            </h2>
          </div>
          <Link
            href="/admin/content"
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
          >
            Back to library
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Title
            <input
              type="text"
              value={item.title}
              onChange={(event) =>
                setItem((prev) =>
                  prev ? { ...prev, title: event.target.value } : prev
                )
              }
              className="mt-2 w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Slug
            <input
              type="text"
              value={item.slug}
              onChange={(event) =>
                setItem((prev) =>
                  prev ? { ...prev, slug: event.target.value } : prev
                )
              }
              className="mt-2 w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Status
            <select
              value={item.status}
              onChange={(event) =>
                setItem((prev) =>
                  prev ? { ...prev, status: event.target.value } : prev
                )
              }
              className="mt-2 w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E]"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Publish date
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E]"
            />
          </label>
          <label className="md:col-span-2 text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Summary
            <textarea
              value={item.summary ?? ""}
              onChange={(event) =>
                setItem((prev) =>
                  prev ? { ...prev, summary: event.target.value } : prev
                )
              }
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-[#E3D4BA] bg-white px-4 py-3 text-sm text-[#2F3E2E]"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white"
          >
            {saving ? "Saving..." : "Save content"}
          </button>
          {notice ? (
            <span className="text-sm text-[#2F3E2E]">{notice}</span>
          ) : null}
          {error ? (
            <span className="text-sm text-[#B4321E]">{error}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
              Blocks ({blockCount})
            </h3>
            <p className="mt-1 text-sm text-[#4D3F33]">
              Add, reorder, and edit layout blocks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={newBlockType}
              onChange={(event) =>
                setNewBlockType(event.target.value as BlockType)
              }
              className="rounded-full border border-[#E3D4BA] bg-white px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#2F3E2E]"
            >
              {blockTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddBlock}
              className="rounded-full bg-[#2F3E2E] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
            >
              Add block
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={block.type}
                    onChange={(event) =>
                      setBlocks((prev) =>
                        prev.map((entry) =>
                          entry.id === block.id
                            ? {
                                ...entry,
                                type: event.target.value as BlockType,
                              }
                            : entry
                        )
                      )
                    }
                    className="rounded-full border border-[#E3D4BA] bg-white px-3 py-2 text-xs uppercase tracking-[0.3em] text-[#2F3E2E]"
                  >
                    {blockTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                    Position {block.position + 1}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, -1)}
                    className="rounded-full border border-[#E3D4BA] px-3 py-2 text-xs uppercase tracking-[0.3em]"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, 1)}
                    className="rounded-full border border-[#E3D4BA] px-3 py-2 text-xs uppercase tracking-[0.3em]"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetBlock(block.id, block.type)}
                    className="rounded-full border border-[#E3D4BA] px-3 py-2 text-xs uppercase tracking-[0.3em]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="rounded-full border border-[#E1A6A0] px-3 py-2 text-xs uppercase tracking-[0.3em] text-[#B4321E]"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <textarea
                value={block.dataText}
                onChange={(event) =>
                  setBlocks((prev) =>
                    prev.map((entry) =>
                      entry.id === block.id
                        ? { ...entry, dataText: event.target.value }
                        : entry
                    )
                  )
                }
                className="mt-4 min-h-[180px] w-full rounded-2xl border border-[#E3D4BA] bg-[#F7F2E8] px-4 py-3 text-xs text-[#2F3E2E]"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveBlock(block.id)}
                  className="rounded-full bg-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
                >
                  Save block
                </button>
              </div>
            </div>
          ))}
          {blocks.length === 0 ? (
            <p className="text-sm text-[#4D3F33]">
              No blocks yet. Add your first block to start building this page.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h3 className="text-lg font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Content settings
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push(publicPath)}
            className="rounded-full border border-[#4CAF50] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2F3E2E]"
          >
            View public page
          </button>
        </div>
      </section>
    </div>
  );
}
