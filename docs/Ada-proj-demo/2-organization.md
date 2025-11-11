# Act 2: Organization & Collaboration

## Overview
The second act of the demo showcases Eden's hybrid team collaboration model, demonstrating how users can build teams with both human collaborators and AI agents. This section highlights real-time collaboration, AI automation of task blocks, and the review/override capabilities that maintain human oversight.

---

## Part 1: Organization Panel (Bottom Right Corner)

### Initial State
- **Location**: Bottom right corner of the project pipeline
- **Default View**: Empty state showing only a **"+"** button
- **Visual**: Circular avatars stacked vertically (when populated)

### Interaction Flow
1. User clicks the **"+"** button
2. An overlay appears with two primary options:
   - **Add Person** (by Eden username)
   - **Add AI** (create and name an AI agent)

---

## Part 2: Adding Team Members

### Adding People
1. Click **"+ Add Person"** in overlay
2. Enter Eden username (e.g., `Billy_Idol`)
3. Person joins the organization
4. Avatar appears in the organization stack

### Connecting People to Task Blocks
- From the **Task Pane**, users can connect people to specific nodes/blocks
- Connection grants access when the block becomes activatable
- Connected users can:
  - Edit the task block
  - Execute tasks
  - Collaborate in real-time

---

## Part 3: Creating & Using AI Agents

### AI Creation
1. Click **"+ Add AI"** in overlay
2. Name the AI (fun, personalized names encouraged)
3. AI agent is added to organization

### AI Automation
- **Connection**: User connects AI to a task block
- **Automation**: AI automates the entire task block
- **Demo Flow**: AI automates the next two task blocks (Design & Production)

---

## Part 4: AI Task Block Completion & Review

### Spring-Out Animation
1. After AI completes a task block, user taps the completed block
2. **Animation**: Task items "spring out" of the block
3. Task items display in an expanded view for review

### Task Item Review & Override
- User can review all AI-generated task items
- **Disagreement Flow**:
  1. User identifies a task item they disagree with
  2. User runs **Prompt Override** on the item
  3. User changes the need/requirement
  4. AI regenerates the outcome based on new input
- This demonstrates human oversight and control

---

## Part 5: Real-Time Collaboration (Billy_Idol Demo)

### Setup
1. User connects friend `Billy_Idol` to the **4th task block** (Marketing)
2. Friend receives notification on their device

### Real-Time Interaction
1. **iPhone Demo**: Show notification arriving
2. Friend accepts notification
3. **Live Updates in Pipeline**:
   - Task block displays: *"Billy_Idol is automating task block..."*
   - Real-time status updates visible to all org members

### Opening Active Task Block
- When user opens the task block Billy is working on:
  - See live edits happening
  - Real-time collaboration indicators
  - Changes reflected instantly

---

## Key Features Demonstrated

### 1. Hybrid Teams
- Seamless integration of humans and AI
- Equal treatment in the organization structure
- Flexible assignment to task blocks

### 2. AI Automation
- Full task block automation capability
- Human review and approval process
- Override system for corrections

### 3. Real-Time Collaboration
- Live status updates
- Multi-device notifications
- Synchronized editing across devices

### 4. Human Oversight
- Review AI outputs
- Approve or override decisions
- Maintain control over project direction

---

## Visual Elements

### Organization Stack (Bottom Right)
```
+----------------+
|      (👤)      |  <- User avatar
|      (🤖)      |  <- AI agent avatar
|      (👤)      |  <- Team member avatar
|      [+]       |  <- Add button
+----------------+
```

### Task Block States
- **Idle**: Standard 3D appearance
- **Automating**: Progress indicator + status text
- **Completed**: Checkmark, ready for review
- **Being Edited**: Live collaboration indicator

### Overlay Design
- Modal appearing over canvas
- Two primary CTAs:
  - **Add Person** (input for username)
  - **Add AI** (input for name + customization)

---

## Demo Flow Summary

1. **Start**: Only user in organization (+ button visible)
2. **Add AI**: Create AI agent, assign to Design & Production blocks
3. **AI Automates**: Watch first block complete, review task items
4. **Override Demo**: Show disagreement → prompt override → regeneration
5. **Second Block**: AI completes Production block
6. **Add Human**: Connect `Billy_Idol` to Marketing block
7. **Real-Time**: Show iPhone notification, live editing, collaboration

---

## Technical Requirements

### Components Needed
1. **OrganizationPanel** (bottom right)
2. **AddMemberOverlay** (modal for adding people/AI)
3. **TaskBlockReview** (spring-out animation for task items)
4. **PromptOverride** (modal for editing task requirements)
5. **CollaborationIndicators** (real-time status in task blocks)

### State Management
- Organization members list
- Member-to-task-block connections
- Real-time collaboration status
- Task block automation progress

### Events
- `ada-organization-member-added`
- `ada-ai-agent-created`
- `ada-task-block-assigned`
- `ada-task-block-automating`
- `ada-task-block-automation-complete`
- `ada-collaboration-active`
- `ada-task-item-override-requested`

---

## Next Steps
1. Implement organization panel UI
2. Create add member overlay
3. Build task block review/spring-out animation
4. Implement prompt override system
5. Add real-time collaboration indicators
6. Wire up all events and state management
