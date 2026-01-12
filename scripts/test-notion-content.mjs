#!/usr/bin/env node
// Quick test of Notion Content Hub connection

const NOTION_TOKEN = process.env.NOTION_TOKEN || "<NOTION_TOKEN>";
const DATABASE_ID = "e400e93e-fd9d-4a21-810c-58d67ed9fe97"; // Content Hub source database

async function testNotion() {
  console.log("\n🔍 Testing Notion Content Hub connection...\n");

  const response = await fetch(`https://api.notion.com/v1/data_sources/${DATABASE_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03"
    },
    body: JSON.stringify({
      filter: {
        property: "Status",
        status: { equals: "Ready to Connect" }
      },
      page_size: 10
    })
  });

  if (!response.ok) {
    console.log("❌ Notion Error:", response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log("✅ Notion Content Hub connected!");
  console.log(`📋 Items ready for sync: ${data.results?.length || 0}`);

  if (data.results?.length > 0) {
    console.log("\n📝 Preview of content ready to sync:");
    data.results.forEach(page => {
      const title = page.properties?.['Content/Communication Name']?.title?.[0]?.plain_text || "Untitled";
      const commType = page.properties?.['Communication Type']?.select?.name || "unspecified";
      console.log(`  • "${title}" → ${commType}`);
    });
  } else {
    console.log("\n💡 No content with 'Ready to Connect' status found.");
    console.log("   Change a content item's status in Notion to test sync.");
  }

  console.log("\n");
}

testNotion().catch(console.error);
