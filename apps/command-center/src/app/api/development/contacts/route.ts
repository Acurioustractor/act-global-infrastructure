import { NextRequest, NextResponse } from 'next/server'

// repo_contacts table removed from DB — returns empty / no-ops until a backend exists

// GET — list repo-contact tags (optionally filter by repo_name)
export async function GET(_request: NextRequest) {
  return NextResponse.json({ contacts: [] })
}

// POST — tag a contact to a repo
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { repoName, contactId } = body

  if (!repoName || !contactId) {
    return NextResponse.json(
      { error: 'repoName and contactId are required' },
      { status: 400 }
    )
  }

  // No persistence layer available — accept the request without storing.
  return NextResponse.json({ contact: null })
}

// DELETE — remove a contact tag from a repo
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { repoName, contactId } = body

  if (!repoName || !contactId) {
    return NextResponse.json(
      { error: 'repoName and contactId are required' },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
