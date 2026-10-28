# Trac Casual Shared-Life Roadmap

## Summary

Position Trac as a warm, playful app for shared everyday life—not corporate project management. Focus on household lists, shopping, chores, trips, packing, and small plans with friends. Keep sharing lightweight and make task organization feel helpful rather than formal.

## Key Improvements

### Everyday shared lists

- Add list templates: **Shopping**, **Chores**, **Trip packing**, **Party planning**, **Weekend errands**, and **Gift ideas**.
- Let users choose a list emoji, color, and optional cover so lists are instantly recognizable.
- Add a lightweight **“I’ll do it”** task claim action instead of corporate-style assignee workflows.
- Add friendly activity wording such as “Onkar picked this up” or “Priya finished this chore.”
- Add quick reactions to completed tasks—such as 🎉, ❤️, or 👍—rather than full discussion threads.

### Helpful daily planning

- Add **Today**, **Upcoming**, and **Overdue** views across personal and shared lists.
- Add repeating tasks for routines: daily medication, weekly groceries, monthly bills, and recurring chores.
- Add optional reminders with simple presets: later today, tomorrow, this weekend, or custom date/time.
- Add a **My Day** view where users can pin a few tasks without moving them from their original list.
- Keep priority as an optional focus aid, not a required workflow field.

### Better casual list experiences

- Add shopping-item support: quantity, unit, category, and one-tap completion.
- Show completed shopping items in a collapsible “Bought” section.
- Add simple drag-to-reorder tasks and sections such as “Need soon” / “Later.”
- Support task notes, links, and photos for recipes, product references, packing lists, and event details.
- Add list sharing through an invite link, with the existing read/edit permission choices retained.
- Add archive and restore for tasks and lists instead of relying only on permanent deletion.

Microsoft To Do and Google Tasks demonstrate the everyday value of reminders, recurring tasks, steps, notes, tags, and “My Day” planning; Todoist adds templates, labels, views, and recurring dates. [Microsoft To Do](https://support.microsoft.com/en-us/todo/welcome-to-microsoft-to-do), [Google Tasks](https://support.google.com/tasks/answer/7675838?hl=en-GB), [Todoist features](https://www.todoist.com/help/todoist/features)

## UI/UX Direction

- Use a **warm, playful** identity: list emojis, soft colors, friendly empty states, and small completion celebrations.
- Keep task rows compact; show extra controls only when a task is opened.
- Use natural-language language: “Pick this up,” “Add to My Day,” “Due tomorrow,” and “Repeats every Sunday.”
- Keep the existing bottom navigation simple; add **Today** as the next top-level destination rather than expanding into a dense app menu.
- Preserve 44px practical touch controls and visible focus states for mobile usability. [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

## Recommended Release Sequence

### Release 1.1 — Shared household essentials

- List templates, emoji/color customization, task claim action, task notes, archive/restore, and Today view.
- Shopping-list quantity/category fields and collapsible completed items.
- Extend activity history for claims, notes, and restores.

### Release 1.2 — Routines and reminders

- Recurring tasks, My Day, Upcoming, overdue indicators, and reminder preferences.
- Start with in-app reminders; introduce browser notifications only after a notification delivery approach is selected.

### Release 1.3 — Shared moments

- Photo attachments, invite links, task reactions, trip/packing enhancements, and list favorites.
- Optional offline/installable web-app support for grocery-store and travel use.

## Assumptions

- Trac remains a casual app for individuals, friends, and families.
- Corporate concepts—workload reports, approval workflows, team hierarchy, sprint boards, and analytics—are out of scope.
- The existing Firebase sharing model remains the foundation, with new capabilities added incrementally.
