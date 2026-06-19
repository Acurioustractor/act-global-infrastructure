export type ConfidenceLabel = 'queried' | 'scenario' | 'needs SL confirmation' | 'unverified'
export type Tone = 'default' | 'good' | 'warn' | 'bad' | 'info'

export interface EofyTask {
  id: string
  task: string
  category: string
  status: string
  owner: string
  priority: string
  due: string | null
  doneDate: string | null
  daysUntilDue: number | null
  overdue: boolean
  blocked: boolean
  done: boolean
  evidence: string
  source: string
  url: string
}

export interface BurndownPoint {
  date: string
  ideal: number | null
  actual: number | null
  projected: number | null
}

export interface EofyTrackerResponse {
  generatedAt: string
  cutover: string
  daysToCutover: number
  weeksToCutover: number
  needsConnection?: boolean
  reason?: string
  totals?: {
    total: number
    open: number
    doing: number
    blocked: number
    done: number
    overdue: number
    pctComplete: number
  }
  byCategory?: Array<{ category: string; total: number; open: number; done: number; overdue: number }>
  byOwner?: Array<{ owner: string; open: number; overdue: number }>
  byPriority?: Array<{ priority: string; open: number; overdue: number }>
  atRisk?: EofyTask[]
  allOpen?: EofyTask[]
  tasks?: EofyTask[]
  burndown?: BurndownPoint[]
  forecastFinish?: string | null
}

export interface SourceReference {
  id: string
  label: string
  type: 'notion' | 'repo-doc' | 'config' | 'system'
  path?: string
  href?: string
  note: string
}

export interface CommandMetric {
  id: string
  label: string
  value: string
  detail: string
  tone: Tone
  confidence: ConfidenceLabel
  sourceId: string
}

export interface CriticalPathItem {
  id: string
  step: string
  owner: string
  due: string | null
  why: string
  status: string
  priority: string
  category: string
  tone: Tone
  daysUntilDue: number | null
  url?: string
  sourceId: string
  confidence: ConfidenceLabel
}

export interface DecisionItem {
  id: string
  title: string
  decision: string
  owner: string
  due: string
  status: string
  why: string
  sourceId: string
}

export interface MoneyRoute {
  id: string
  founder: string
  route: string
  amount: string
  confidence: ConfidenceLabel
  sourceId: string
  mechanics: string[]
  cautions: string[]
}

export interface MoneyRunSheetItem {
  id: string
  date: string
  phase: 'talk-through' | 'actualise'
  move: string
  from: string
  to: string
  amount: string
  owner: string
  status: string
  confidence: ConfidenceLabel
  requiredBeforeMove: string[]
  evidence: string[]
  sourceId: string
}

export interface RdWindowModel {
  title: string
  period: string
  basis: string
  refund: string
  confidence: ConfidenceLabel
  sourceId: string
  timeline: Array<{
    id: string
    label: string
    dateRange: string
    status: string
    tone: Tone
    note: string
  }>
}

export interface EntityMapNode {
  id: string
  label: string
  role: string
  status: string
  tone: Tone
  sourceId: string
}

export interface EntityMapEdge {
  from: string
  to: string
  label: string
}

export interface EntityMap {
  nodes: EntityMapNode[]
  edges: EntityMapEdge[]
}

export interface EofyCommandResponse {
  generatedAt: string
  title: string
  subtitle: string
  cutover: string
  ptyStarts: string
  notionUrl: string
  needsConnection?: boolean
  reason?: string
  tracker: Pick<EofyTrackerResponse, 'totals' | 'byCategory' | 'byOwner' | 'byPriority' | 'tasks' | 'burndown' | 'forecastFinish'>
  metrics: CommandMetric[]
  criticalPath: CriticalPathItem[]
  decisions: DecisionItem[]
  moneyRoutes: MoneyRoute[]
  moneyRunSheet: MoneyRunSheetItem[]
  rdWindow: RdWindowModel
  entityMap: EntityMap
  sources: SourceReference[]
  disclaimer: string
}

export interface EofyCommandConfig {
  title: string
  subtitle: string
  notionUrl: string
  cutover: string
  ptyStarts: string
  disclaimer: string
  metrics: Array<Omit<CommandMetric, 'value'> & { value?: string; dynamic?: 'daysToCutover' | 'p0Open' }>
  criticalPath: Array<Omit<CriticalPathItem, 'status' | 'tone' | 'daysUntilDue' | 'url' | 'category'> & {
    category?: string
    status?: string
    notionMatchers: string[]
  }>
  decisions: DecisionItem[]
  moneyRoutes: MoneyRoute[]
  moneyRunSheet: MoneyRunSheetItem[]
  rdWindow: RdWindowModel
  entityMap: EntityMap
  sources: SourceReference[]
}
