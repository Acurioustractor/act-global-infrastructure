import { supabase } from '../supabase'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from '../timezone'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_daily_reflection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSaveDailyReflection(
  input: {
    voice_transcript: string
    lcaa_listen: string
    lcaa_curiosity: string
    lcaa_action: string
    lcaa_art: string
    loop_to_tomorrow?: string
    gratitude?: string[]
    challenges?: string[]
    learnings?: string[]
    intentions?: string[]
  },
  chatId?: number
): Promise<string> {
  if (!chatId) return JSON.stringify({ error: 'Reflections require Telegram context.' })

  const today = getBrisbaneDate()

  try {
    // Gather day stats for enrichment
    const [calResult, commsResult, knowledgeResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${today}T23:59:59Z`),
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),
      supabase
        .from('project_knowledge')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', `${today}T00:00:00Z`),
    ])

    const dayStats = {
      meetings: calResult.count || 0,
      communications: commsResult.count || 0,
      knowledge_entries: knowledgeResult.count || 0,
    }

    // Upsert (allow updating today's reflection)
    const { data, error } = await supabase
      .from('daily_reflections')
      .upsert(
        {
          chat_id: chatId,
          reflection_date: today,
          voice_transcript: input.voice_transcript,
          lcaa_listen: input.lcaa_listen,
          lcaa_curiosity: input.lcaa_curiosity,
          lcaa_action: input.lcaa_action,
          lcaa_art: input.lcaa_art,
          loop_to_tomorrow: input.loop_to_tomorrow || null,
          gratitude: input.gratitude || [],
          challenges: input.challenges || [],
          learnings: input.learnings || [],
          intentions: input.intentions || [],
          day_stats: dayStats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chat_id,reflection_date' }
      )
      .select()
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'reflection_saved',
      id: data.id,
      date: today,
      day_stats: dayStats,
      confirmation: `Reflection saved for ${today}. Your LCAA loop is complete.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_past_reflections
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSearchPastReflections(input: {
  query?: string
  days?: number
  limit?: number
}): Promise<string> {
  const days = input.days || 30
  const limit = input.limit || 7
  const lookback = getBrisbaneDateOffset(-days)

  try {
    let query = supabase
      .from('daily_reflections')
      .select(
        'id, reflection_date, lcaa_listen, lcaa_curiosity, lcaa_action, lcaa_art, loop_to_tomorrow, gratitude, challenges, learnings, intentions, day_stats'
      )
      .gte('reflection_date', lookback)
      .order('reflection_date', { ascending: false })
      .limit(limit)

    if (input.query) {
      const searchTerm = `%${input.query}%`
      query = query.or(
        `lcaa_listen.ilike.${searchTerm},lcaa_curiosity.ilike.${searchTerm},lcaa_action.ilike.${searchTerm},lcaa_art.ilike.${searchTerm},loop_to_tomorrow.ilike.${searchTerm},voice_transcript.ilike.${searchTerm}`
      )
    }

    const { data, error } = await query

    if (error) return JSON.stringify({ error: error.message })

    const reflections = (data || []).map((r) => ({
      id: r.id,
      date: r.reflection_date,
      listen: r.lcaa_listen,
      curiosity: r.lcaa_curiosity,
      action: r.lcaa_action,
      art: r.lcaa_art,
      loop: r.loop_to_tomorrow,
      gratitude: r.gratitude,
      challenges: r.challenges,
      learnings: r.learnings,
      intentions: r.intentions,
      day_stats: r.day_stats,
    }))

    return JSON.stringify({
      query: input.query || '(all recent)',
      lookback_days: days,
      count: reflections.length,
      reflections,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_writing_draft
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSaveWritingDraft(input: {
  title: string
  content: string
  append?: boolean
  project?: string
  tags?: string[]
}): Promise<string> {
  const { title, content, append, project, tags } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/writing/drafts/${filename}`

  // Build markdown content
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const tagLine = tags?.length ? `\ntags: [${tags.map(t => `"${t}"`).join(', ')}]` : ''

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug (any date prefix)
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/writing/drafts`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = files.find((f: { name: string }) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Appended ${now}*\n\n${content}`
            commitMessage = `writing: append to "${title}"`
          } else {
            fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
            commitMessage = `writing: new draft "${title}"`
          }
        } else {
          fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
          commitMessage = `writing: new draft "${title}"`
        }
      } else {
        fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
        commitMessage = `writing: new draft "${title}"`
      }
    } catch {
      fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
      commitMessage = `writing: new draft "${title}"`
    }
  } else {
    fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
    commitMessage = `writing: new draft "${title}"`
    // Check if file already exists — need SHA for overwrites
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
      }
    } catch {
      // File doesn't exist yet, no SHA needed
    }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      path: filepath,
      url: result.content?.html_url,
      message: `Draft "${title}" saved to ${filepath} and pushed to git. Pull on your laptop to start editing.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save draft: ${(err as Error).message}` })
  }
}

export function buildNewDraft(title: string, content: string, created: string, projectLine: string, tagLine: string): string {
  return `---
title: "${title}"
created: ${created}
status: draft${projectLine}${tagLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_planning_doc
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSavePlanningDoc(input: {
  horizon: string
  title: string
  content: string
  append?: boolean
  project?: string
}): Promise<string> {
  const { horizon, title, content, append, project } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const validHorizons = ['daily', 'weekly', 'yearly', 'decade']
  if (!validHorizons.includes(horizon)) {
    return JSON.stringify({ error: `Invalid horizon "${horizon}". Use: ${validHorizons.join(', ')}` })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/planning/${horizon}/${filename}`

  // Build frontmatter
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const horizonTemplates: Record<string, string> = {
    daily: 'type: daily-plan\nreview_cadence: daily',
    weekly: 'type: weekly-plan\nreview_cadence: weekly',
    yearly: 'type: yearly-goals\nreview_cadence: quarterly',
    decade: 'type: decade-vision\nreview_cadence: yearly',
  }

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/planning/${horizon}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = (files as { name: string; url: string }[]).find((f) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Updated ${now}*\n\n${content}`
            commitMessage = `planning(${horizon}): update "${title}"`
          } else {
            fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
            commitMessage = `planning(${horizon}): new "${title}"`
          }
        } else {
          fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
          commitMessage = `planning(${horizon}): new "${title}"`
        }
      } else {
        fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
        commitMessage = `planning(${horizon}): new "${title}"`
      }
    } catch {
      fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
      commitMessage = `planning(${horizon}): new "${title}"`
    }
  } else {
    fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
    commitMessage = `planning(${horizon}): new "${title}"`
    // Check if file already exists to get SHA (avoids 422 conflict)
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}?ref=${branch}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
        commitMessage = `planning(${horizon}): overwrite "${title}"`
      }
    } catch { /* new file, no sha needed */ }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      horizon,
      path: filepath,
      url: result.content?.html_url,
      message: `${horizon} plan "${title}" saved to ${filepath}. Syncs to Obsidian within 60 seconds.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save planning doc: ${(err as Error).message}` })
  }
}

export function buildPlanningDoc(title: string, content: string, created: string, horizon: string, typeBlock: string, projectLine: string): string {
  return `---
title: "${title}"
created: ${created}
${typeBlock}
status: active${projectLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: move_writing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeMoveWriting(input: {
  title_search?: string
  from_stage?: string
  to_stage: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'
  const fromStage = input.from_stage || 'drafts'
  const toStage = input.to_stage
  const basePath = 'thoughts/writing'

  if (fromStage === toStage) return JSON.stringify({ error: 'from_stage and to_stage must be different' })

  // List files in the source stage
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${basePath}/${fromStage}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) return JSON.stringify({ error: `Could not list ${fromStage}: ${listRes.status}` })

  const files = (await listRes.json()) as Array<{ name: string; path: string; sha: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  if (!input.title_search) {
    return JSON.stringify({
      stage: fromStage,
      files: mdFiles.map((f) => f.name),
      hint: 'Provide a title_search to move a specific piece.',
    })
  }

  const search = input.title_search.toLowerCase()
  const match = mdFiles.find((f) => f.name.toLowerCase().includes(search))
  if (!match) {
    return JSON.stringify({
      error: `No file matching "${input.title_search}" in ${fromStage}/`,
      available: mdFiles.map((f) => f.name),
    })
  }

  // Read the file content
  const fileRes = await fetch(match.download_url)
  if (!fileRes.ok) return JSON.stringify({ error: `Could not read ${match.name}` })
  const content = await fileRes.text()

  // Update frontmatter status
  const updatedContent = content.replace(
    /^(status:\s*).*$/m,
    `$1${toStage === 'published' ? 'published' : toStage === 'in-progress' ? 'in-progress' : 'draft'}`
  )

  // Create file in target stage
  const newPath = `${basePath}/${toStage}/${match.name}`
  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: move "${match.name}" from ${fromStage} to ${toStage}`,
        content: Buffer.from(updatedContent).toString('base64'),
        branch,
      }),
    }
  )
  if (!createRes.ok) {
    const err = await createRes.text()
    return JSON.stringify({ error: `Failed to create in ${toStage}: ${err}` })
  }

  // Delete from source stage
  const deleteRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${match.path}`,
    {
      method: 'DELETE',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: remove "${match.name}" from ${fromStage} (moved to ${toStage})`,
        sha: match.sha,
        branch,
      }),
    }
  )
  if (!deleteRes.ok) {
    return JSON.stringify({ moved_to: newPath, warning: 'File created in target but failed to delete from source — may be duplicated.' })
  }

  return JSON.stringify({
    moved: true,
    file: match.name,
    from: `${basePath}/${fromStage}/`,
    to: `${basePath}/${toStage}/`,
    message: `Moved "${match.name}" from ${fromStage} -> ${toStage}. Syncs to Obsidian within 60 seconds.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: review_planning_period
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeReviewPlanningPeriod(input: {
  period: string
  date?: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  const refDate = input.date ? new Date(input.date) : getBrisbaneNow()

  // Determine which folder to read and date range
  let folder: string
  let startDate: Date
  let endDate: Date

  if (input.period === 'week') {
    folder = 'thoughts/planning/daily'
    const day = refDate.getDay()
    const monday = new Date(refDate)
    monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1))
    startDate = monday
    endDate = new Date(monday)
    endDate.setDate(monday.getDate() + 6)
  } else if (input.period === 'month') {
    folder = 'thoughts/planning/weekly'
    startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
    endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  } else if (input.period === 'year') {
    folder = 'thoughts/reviews/monthly'
    startDate = new Date(refDate.getFullYear(), 0, 1)
    endDate = new Date(refDate.getFullYear(), 11, 31)
  } else {
    return JSON.stringify({ error: 'Invalid period. Use: week, month, year' })
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // List files in the folder
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) {
    return JSON.stringify({
      period: input.period,
      range: `${startStr} to ${endStr}`,
      documents: [],
      message: `No ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans found yet. Start by saving some!`,
    })
  }

  const files = (await listRes.json()) as Array<{ name: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  // Filter files by date range (files are named YYYY-MM-DD-slug.md)
  const dateRegex = /^(\d{4}-\d{2}-\d{2})/
  const inRange = mdFiles.filter((f) => {
    const match = f.name.match(dateRegex)
    if (!match) return false
    return match[1] >= startStr && match[1] <= endStr
  })

  // Read contents of matching files
  const contents: Array<{ name: string; date: string; content: string }> = []
  for (const file of inRange.slice(0, 15)) {
    try {
      const res = await fetch(file.download_url)
      if (res.ok) {
        const text = await res.text()
        const dateMatch = file.name.match(dateRegex)
        contents.push({
          name: file.name,
          date: dateMatch ? dateMatch[1] : 'unknown',
          content: text.slice(0, 2000), // Cap per doc to manage tokens
        })
      }
    } catch { /* skip failed reads */ }
  }

  return JSON.stringify({
    period: input.period,
    range: `${startStr} to ${endStr}`,
    document_count: contents.length,
    documents: contents,
    instruction: `Synthesize these ${contents.length} ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans into a ${input.period}ly review. Highlight: what was accomplished, what rolled over, themes, and intentions for next ${input.period}.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: moon_cycle_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeMoonCycleReview(input: {
  month?: string
  focus?: string
}): Promise<string> {
  const now = getBrisbaneNow()
  const monthStr = input.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearNum, monthNum] = monthStr.split('-').map(Number)
  const startDate = `${monthStr}-01`
  const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]
  const focus = input.focus || 'full'

  const sections: Record<string, unknown> = {
    month: monthStr,
    period: `${startDate} to ${endDate}`,
  }

  // Financial health
  if (focus === 'full' || focus === 'financial') {
    const [income, expenses, outstanding, subs] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('amount_due')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT']),
      supabase
        .from('subscriptions')
        .select('amount_aud, billing_cycle')
        .eq('status', 'active'),
    ])

    const totalIncome = (income.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = (expenses.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalOutstanding = (outstanding.data || []).reduce((s, i) => s + (parseFloat(String(i.amount_due)) || 0), 0)
    let monthlySubBurn = 0
    for (const sub of subs.data || []) {
      const amt = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') monthlySubBurn += amt
      else if (sub.billing_cycle === 'yearly') monthlySubBurn += amt / 12
      else if (sub.billing_cycle === 'quarterly') monthlySubBurn += amt / 3
    }

    sections.financial = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      outstanding: Math.round(totalOutstanding * 100) / 100,
      subscription_burn: Math.round(monthlySubBurn * 100) / 100,
    }
  }

  // Relationship health
  if (focus === 'full' || focus === 'relationships') {
    const [activeContacts, staleContacts, recentComms] = await Promise.all([
      supabase
        .from('ghl_contacts')
        .select('id')
        .in('engagement_status', ['active', 'prospect']),
      supabase
        .from('ghl_contacts')
        .select('full_name, company_name, last_contact_date')
        .in('engagement_status', ['active', 'prospect'])
        .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
        .order('last_contact_date', { ascending: true })
        .limit(10),
      supabase
        .from('communications')
        .select('id')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
    ])

    sections.relationships = {
      active_contacts: (activeContacts.data || []).length,
      going_cold: (staleContacts.data || []).length,
      coldest: (staleContacts.data || []).slice(0, 5).map((c) => ({
        name: c.full_name,
        company: c.company_name,
        last_contact: c.last_contact_date,
      })),
      communications_this_month: (recentComms.data || []).length,
    }
  }

  // Project health
  if (focus === 'full' || focus === 'projects') {
    const [projectActivity, recentKnowledge] = await Promise.all([
      supabase
        .from('project_knowledge')
        .select('project_code')
        .gte('recorded_at', startDate)
        .lte('recorded_at', endDate),
      supabase
        .from('project_knowledge')
        .select('project_code, title, knowledge_type')
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: false })
        .limit(20),
    ])

    const counts: Record<string, number> = {}
    for (const row of projectActivity.data || []) {
      counts[row.project_code] = (counts[row.project_code] || 0) + 1
    }

    sections.projects = {
      activity_by_project: Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([code, count]) => ({ code, activity: count })),
      recent_highlights: (recentKnowledge.data || []).slice(0, 10).map((k) => ({
        project: k.project_code,
        title: k.title,
        type: k.knowledge_type,
      })),
    }
  }

  // Wellbeing — reflections summary
  if (focus === 'full' || focus === 'wellbeing') {
    const reflections = await supabase
      .from('daily_reflections')
      .select('date, gratitude, challenges, learnings, lcaa_listen, lcaa_art')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(31)

    const refData = reflections.data || []
    sections.wellbeing = {
      reflections_logged: refData.length,
      themes: {
        gratitude_samples: refData.slice(0, 3).map((r) => r.gratitude).filter(Boolean),
        challenge_samples: refData.slice(0, 3).map((r) => r.challenges).filter(Boolean),
        learning_samples: refData.slice(0, 3).map((r) => r.learnings).filter(Boolean),
      },
    }
  }

  sections.instruction = `You have the month's data. Write a reflective moon cycle review with the user. Cover: what grew, what needs attention, what to release, and intentions for next month. Use a warm, spacious tone — this is reflection, not reporting. Save the final piece using save_planning_doc with horizon "monthly" or save_writing_draft.`

  return JSON.stringify(sections)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_dream
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function autoCategorizeDream(content: string): string {
  const lower = content.toLowerCase()
  if (/\b(imagine|vision|future|could be|one day|picture this|what if)\b/.test(lower)) return 'vision'
  if (/\b(dream|dreamt|dreaming|asleep|woke up)\b/.test(lower)) return 'dream'
  if (/\b(story|told me|remember when|once upon|narrative)\b/.test(lower)) return 'story'
  if (/\b(grateful|thankful|love|beautiful|heart|moved|tears)\b/.test(lower)) return 'love'
  if (/\b(excited|amazing|incredible|can't wait|pumped|stoked|fuck yeah)\b/.test(lower)) return 'excitement'
  if (/\b(idea|what if we|we could|concept|proposal|pitch)\b/.test(lower)) return 'idea'
  if (/\b(learned|realised|realized|reflect|thinking about|insight)\b/.test(lower)) return 'reflection'
  if (/\b(visited|went to|saw|experienced|felt|heard|tasted)\b/.test(lower)) return 'experience'
  return 'dream'
}

export function autoTagDream(content: string): string[] {
  const lower = content.toLowerCase()
  const tags: string[] = []
  const tagMap: Record<string, string[]> = {
    'the-harvest': ['harvest', 'witta', 'maleny', 'gumland', 'cafe', 'garden centre', 'market'],
    'black-cockatoo-valley': ['black cockatoo', 'cockatoo valley', 'bunya', 'farm', '40 acres', 'paddock', 'bush', 'regenerative land', 'glamping'],
    'palm-island': ['palm island', 'picc', 'elders', 'uncle allan', 'torres strait', 'first nations'],
    'goods': ['goods on country', 'orange sky', 'laundry', 'washing machine', 'fleet'],
    'empathy-ledger': ['empathy ledger', 'storytelling', 'narrative', 'stories'],
    'justicehub': ['justice', 'incarceration', 'legal', 'prison', 'contained'],
    'art': ['art', 'installation', 'sculpture', 'exhibition', 'gallery', 'projection'],
    'community': ['community', 'gathering', 'together', 'people', 'connection'],
    'nature': ['nature', 'trees', 'bush', 'creek', 'birds', 'wildlife', 'regenerative'],
    'technology': ['tech', 'iot', 'sensor', 'dashboard', 'spatial', 'ar', 'vr', 'ai'],
    'revenue': ['revenue', 'business model', 'income', 'funding', 'grant', 'commercial'],
  }
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => lower.includes(kw))) tags.push(tag)
  }
  return tags
}

export function generateDreamTitle(content: string): string {
  const firstLine = content.split(/[.!?\n]/)[0].trim()
  if (firstLine.length <= 60) return firstLine
  return firstLine.slice(0, 57) + '...'
}

export function findLinkedProjects(content: string): string[] {
  const lower = content.toLowerCase()
  const projects: string[] = []
  const projectKeywords: Record<string, string[]> = {
    'ACT-HV': ['harvest', 'witta', 'maleny', 'gumland', 'cafe'],
    'ACT-FM': ['black cockatoo', 'cockatoo valley', 'bunya', 'farm', '40 acres', 'paddock', 'glamping', 'art trail'],
    'ACT-PI': ['palm island', 'picc', 'elders', 'uncle allan'],
    'ACT-GD': ['goods on country', 'orange sky', 'laundry', 'washing'],
    'ACT-EL': ['empathy ledger', 'storytelling platform'],
    'ACT-JH': ['justicehub', 'justice hub', 'contained', 'incarceration'],
    'ACT-AR': ['art', 'installation', 'sculpture', 'studio practice'],
    'ACT-IN': ['bot', 'intelligence', 'alma', 'agent', 'telegram'],
  }
  for (const [code, keywords] of Object.entries(projectKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) projects.push(code)
  }
  return projects
}

export async function executeSaveDream(
  input: { content: string; title?: string; category?: string; tags?: string[]; media_url?: string; media_type?: string },
  chatId?: number
): Promise<string> {
  try {
    const content = input.content
    const category = input.category || autoCategorizeDream(content)
    const autoTags = autoTagDream(content)
    const tags = [...new Set([...(input.tags || []), ...autoTags])]
    const title = input.title || generateDreamTitle(content)
    const linkedProjects = findLinkedProjects(content)

    // Save to Supabase
    const entry = {
      title,
      content,
      category,
      tags,
      source: chatId ? 'telegram' : 'api',
      author: 'benjamin',
      telegram_chat_id: chatId || null,
      media_url: input.media_url || null,
      media_type: input.media_type || null,
      ai_linked_projects: linkedProjects,
      ai_themes: tags.slice(0, 5),
    }

    const { data, error } = await supabase
      .from('dream_journal')
      .insert(entry)
      .select('id, title, category, tags, ai_linked_projects')
      .single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    // Find related entries
    const { data: related } = await supabase
      .from('dream_journal')
      .select('id, title, category, tags')
      .neq('id', data.id)
      .overlaps('tags', tags.slice(0, 3))
      .order('created_at', { ascending: false })
      .limit(3)

    const emoji: Record<string, string> = {
      dream: '\u{1F319}', story: '\u{1F4D6}', reflection: '\u{1FA9E}', excitement: '\u{1F525}',
      idea: '\u{1F4A1}', experience: '\u{1F33F}', love: '\u{2764}\u{FE0F}', vision: '\u{1F52E}',
    }

    return JSON.stringify({
      saved: true,
      id: data.id,
      title: data.title,
      category: data.category,
      tags: data.tags,
      linkedProjects: data.ai_linked_projects,
      relatedEntries: related?.map(r => ({ id: r.id, title: r.title, category: r.category })) || [],
      message: `${emoji[category] || '\u{2728}'} Saved to Dream Journal as "${title}" [${category}]${tags.length ? ` — tagged: ${tags.join(', ')}` : ''}${linkedProjects.length ? ` — linked to: ${linkedProjects.join(', ')}` : ''}${related?.length ? `\n\n\u{1F517} Related dreams: ${related.map(r => `"${r.title}"`).join(', ')}` : ''}`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_dreams
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeSearchDreams(
  input: { query?: string; category?: string; limit?: number }
): Promise<string> {
  try {
    const limit = input.limit || 10

    let query = supabase
      .from('dream_journal')
      .select('id, title, content, category, tags, ai_linked_projects, ai_themes, source, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (input.category) {
      query = query.eq('category', input.category)
    }

    if (input.query) {
      query = query.or(`content.ilike.%${input.query}%,title.ilike.%${input.query}%`)
    }

    const { data, error } = await query

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      count: data?.length || 0,
      entries: data?.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        tags: e.tags,
        linkedProjects: e.ai_linked_projects,
        source: e.source,
        preview: e.content?.slice(0, 200),
        created: e.created_at,
      })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}
