---
description: How to setup a new ACT Ecosystem Project (The "Engine" Workflow)
---

# ACT Ecosystem Setup Workflow

This workflow automates the creation of a new project within the ACT Ecosystem, ensuring it inherits the shared DNA (Standard Template + AI Skills).

## Prerequisites
- [ ] Name of the project (e.g., "goods-on-country")
- [ ] Description of the project
- [ ] Targeted "Pillar" (Land, Studio, or Harvest)

## Steps

1. **Clone the Standard Template**
   The `act-project-template` is the seed. It contains the standardized folder structure, CI/CD pipelines, and "Beautiful Obsolescence" documentation stubs.
   
   ```bash
   # (Conceptual command - in reality we would git clone)
   # git clone git@github.com:Acurioustractor/act-project-template.git [new-project-name]
   echo "Setting up project structure..."
   ```

2. **Inject the ACT AI Skills**
   Every project needs the "Brain". We install the `act-global-skills` package so the local agent has full context.
   
   ```bash
   # Link the global skills to the new project
   # ln -s /Users/benknight/act-global-skills .agent/skills
   echo "Injecting neural pathways (Skills)..."
   ```

3. **Configure the "Pillar" Context**
   We define which pillar this project serves to tailor the voice and metrics.
   
   *   If **Land**: Set `ACT_CONTEXT=land` (Conservation focus)
   *   If **Studio**: Set `ACT_CONTEXT=studio` (Tooling focus)
   *   If **Harvest**: Set `ACT_CONTEXT=harvest` (Enterprise focus)

4. **Initialize the "Placemat" Metadata**
   We create a `.act/manifest.json` file that allows this project to show up on the central dashboard.

   ```json
   {
     "name": "[Project Name]",
     "pillar": "[Pillar]",
     "stage": "Seed",
     "owner": "Community"
   }
   ```

5. **Handover**
   The agent confirms the setup and opens the `README.md` for the human to define the specific vision.

// turbo
echo "Workflow simulation complete. The Engine is ready."
