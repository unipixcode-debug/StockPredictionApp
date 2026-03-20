# CRITICAL VITE BUILD RULE (GHOST FILE PREVENTION)
1. **Index.html Entry Point:** Vite's `index.html` inside `frontend` folder MUST ALWAYS contain `<script type="module" src="/src/main.jsx"></script>`.
2. **Never Cache-Poison index.html:** NEVER overwrite `frontend/index.html` with `frontend/dist/index.html`. If you do, Vite will completely ignore `src/` and silently bundle old `.js` chunks forever. If changes aren't reflecting after `npm run build`, CHECK `index.html` FIRST!

# DEVELOPER PANEL - PACKAGE MANAGEMENT RULES
1. **Always Ensure Package IDs:** When fetching packages from the backend, always map over them to ensure each has a unique `id` (e.g. `pkg_init_...`). Without IDs, React's `filter` and `map` logic for deletions and updates will break.
2. **Immediate Deletion Sync:** For the best user experience, the "Delete" button should immediately persist the change to the database to avoid "broken button" complaints if the user forgets to click "Save All".
3. **Button Visibility:** Ensure the Trash/Delete button has `z-50` and is always partially visible (`opacity-50`) even on mobile devices to ensure it can be clicked.
