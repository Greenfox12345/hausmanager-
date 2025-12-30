# Haushaltsmanager TODO

## Database Schema
- [x] Design comprehensive database schema with all tables
- [x] Implement households table
- [x] Implement household_members table with roles and photos
- [x] Implement shopping_items table with categories
- [x] Implement tasks table with rotation and recurring schedules
- [x] Implement projects table with multi-household support
- [x] Implement project_tasks table with dependencies
- [x] Implement activity_history table
- [x] Implement neighborhood_projects table
- [x] Push database schema to production

## Authentication System
- [x] Implement household-level authentication
- [x] Implement member-level authentication within households
- [x] Create household registration flow
- [x] Create member registration within household
- [x] Implement session management
- [x] Add password hashing and security

## Shopping List Manager
- [x] Create shopping list UI with mobile-responsive design
- [x] Implement add/edit/delete shopping items
- [x] Add category support (Lebensmittel, Haushalt, Pflege, Sonstiges)
- [x] Implement category filtering
- [x] Add item completion toggle
- [x] Create shared shopping list view for household

## Household Tasks Manager
- [x] Create tasks list UI
- [x] Implement add/edit/delete tasks
- [x] Add member assignment functionality
- [x] Implement task rotation system
- [x] Add recurring schedule support (daily, weekly, monthly, custom)
- [x] Create task completion tracking
- [x] Add exclusion rules for task rotation
- [x] Implement automatic task reassignment

## Project Management
- [ ] Create project overview UI
- [ ] Implement add/edit/delete projects
- [ ] Add calendar view for project timeline
- [ ] Implement task dependencies (prerequisite, followup, parallel)
- [ ] Add multi-household collaboration support
- [ ] Create project member assignment
- [ ] Implement project progress tracking
- [ ] Add project status management

## Activity History
- [ ] Create history tracking system
- [ ] Implement activity logging for all actions
- [ ] Add filtering by type (shopping, tasks, projects)
- [ ] Implement search functionality
- [ ] Add progress comments and photos
- [ ] Create history timeline view

## Neighborhood Collaboration
- [ ] Create neighborhood projects feature
- [ ] Implement household invitation system
- [ ] Add shared project management
- [ ] Create neighborhood status tracking
- [ ] Implement participation management

## Member Management
- [ ] Create household overview page
- [ ] Implement add/edit/delete members
- [ ] Add member photo upload
- [ ] Implement role management
- [ ] Add member statistics and activity tracking

## UI/UX Design
- [x] Design elegant color scheme and typography
- [x] Create mobile-first responsive layouts
- [x] Implement touch-friendly interactions
- [x] Add smooth animations and transitions
- [x] Create consistent component library
- [x] Implement loading states and error handling
- [x] Add empty states with helpful messages

## Testing & Deployment
- [x] Write unit tests for critical features
- [x] Test mobile responsiveness on various devices
- [x] Test authentication flows
- [x] Test data persistence and relationships
- [x] Create checkpoint for deployment
- [x] Upload to GitHub repository

## New Requirements
- [x] Fix Select component error on Tasks page (empty string value)
- [x] Add collapsible sidebar navigation to homepage

## Additional Features
- [x] Admin function to delete test households from database
- [x] Extend sidebar navigation to all pages
- [x] Household switcher dropdown in sidebar header

## Phase 1: Abschluss-Dialoge mit Kommentaren und Fotos
- [x] Extend database schema for comments and photos in activity history
- [x] Implement photo upload functionality with S3
- [x] Create CompleteShoppingDialog with comment and photo upload
- [x] Update shopping completion to use dialog
- [x] Create CompleteTaskDialog with comment and photo upload
- [x] Create MilestoneDialog for task intermediate goals
- [x] Create ReminderDialog for task reminders
- [x] Update task completion to use dialogs
- [x] Update History page to display comments and photos properly
- [x] Test all dialog functionality

## Bug Fixes and Improvements
- [x] Fix photo upload dialog overlay bug (second dialog not clickable)
- [x] Remove "Completed shopping item" logs when toggling items
- [x] Reduce test households to 2 examples (use admin delete function manually)

## Task Creation Form Redesign
- [x] Move date/time picker above frequency selection
- [x] Add multiple assignees selection for first occurrence
- [x] Make repeat checkbox collapsible
- [x] Add repeat interval with number + unit (days/weeks/months)
- [x] Add "Rotate responsibility" checkbox under repeat
- [x] Add "Required persons" number input when rotation enabled
- [x] Add member exclusion selection for rotation
- [x] Validate required persons vs available members
- [x] Show error if numbers don't match

## Task Form and List Improvements
- [x] Make task form fields collapsible until name is entered
- [x] Add missing details to task list view (frequency, rotation, due date, etc.)

## Task Functionality Fixes
- [x] Add dueDate field to tasks table schema
- [x] Add repeatInterval and repeatUnit fields to tasks table
- [x] Add requiredPersons field for rotation
- [x] Add excludedMembers field for rotation (via task_rotation_exclusions table)
- [x] Update task creation mutation to save due date and time
- [x] Update task creation to save repeat interval details
- [x] Update task creation to save rotation configuration
- [x] Display due date in task list with formatting
- [x] Show overdue tasks with visual indicator

## Member Management
- [x] Add member creation form on Members page
- [x] Implement member registration with household password + personal password
- [x] Update login flow to support member authentication (already implemented)
- [x] Display all household members on Members page

## Automatic Task Rotation
- [x] Calculate next due date based on repeat interval when task is completed
- [x] Assign next responsible person from rotation when task is completed
- [x] Skip excluded members in rotation
- [x] Handle rotation with required persons count (logic implemented)
- [x] Update task in database with new due date and assignee

## Activity History Details
- [x] Display task name in activity history
- [x] Show task description in activity entries
- [x] Display responsible person for completed tasks
- [x] Show due date for task activities
- [x] Format task details in readable layout

## Bug Fix: Member Addition
- [x] Fix userId foreign key constraint error when adding members
- [x] Change userId to allow NULL in household_members schema
- [x] Update createHouseholdMember to use NULL instead of 0

## Project Overview with Calendar
- [x] Extend database schema for project task dependencies
- [x] Add "Projektaufgabe" checkbox to task creation form
- [x] Implement "Projektzuordnung" section (select existing or create new project)
- [x] Implement "Aufgabenverknüpfung" with Voraussetzungen and Folgeaufgaben columns
- [x] Create calendar view for all tasks
- [x] Create project-grouped task view
- [x] Implement multi-household project collaboration (backend)
- [x] Add project creation from main task
- [x] Display task dependencies visually (in project view)
- [x] Write unit tests for project features (6 tests passing)
- [x] Fix existing tests (36 tests passing)

## Bug Fix: Activity History Due Date
- [x] Store original due date in activity history when completing recurring tasks (not the new due date)

## Terminübersicht und Projektverwaltung
- [x] Rename "Projekte & Kalender" page to "Terminübersicht"
- [x] Update navigation links and routes
- [x] Create new "Projekte" page for project management
- [x] Implement project list with create/edit/delete functions
- [x] Add list view for project tasks
- [x] Implement Gantt chart view for project tasks
- [x] Display task dependencies in Haushaltsaufgaben page
- [x] Display task dependencies in Projektansicht
- [ ] Display task dependencies in Verlauf (History)
- [x] Show prerequisites and follow-up tasks with icons and links
- [x] Create TaskDependencies reusable component
- [x] Add getAllDependencies endpoint for efficient loading

## Project Task Management
- [x] Add task creation form to opened project view
- [x] Reuse task form component from Haushaltsaufgaben page
- [x] Add ability to assign existing tasks to opened project
- [x] Show task list within project detail view
- [x] Update project view to show newly added tasks immediately
- [x] Add "Neue Aufgabe" button to project header
- [x] Add "Bestehende zuordnen" button to project header
- [x] Implement task dependencies in new task dialog
- [x] Extend tasks.update mutation to support projectId

## Notification System (Re-implementation)
- [ ] Create database tables (notifications, notificationSettings, taskEditProposals, dependencyProposals)
- [ ] Implement notifications router with proper error handling
- [ ] Implement proposals router with proper error handling
- [ ] Create NotificationCenter component with auth checks
- [ ] Add bell icon to AppLayout header
- [ ] Add notification badge with unread count
- [ ] Implement notification settings dialog
- [ ] Test notification system thoroughly

## Task Editing with Permissions (Re-implementation)
- [ ] Create TaskActions component with permission checks
- [ ] Add edit/delete buttons for task owners
- [ ] Add propose button for non-owners
- [ ] Implement edit dialog for task owners
- [ ] Implement proposal dialog for non-owners
- [ ] Add TaskActions to all task views (Tasks, Projects, Calendar)
- [ ] Test permission system thoroughly

## Form Alignment
- [x] Add repeat fields to project task form (checkbox, interval, unit)
- [x] Add rotation fields to project task form (checkbox, required persons, excluded members)
- [x] Ensure consistent behavior between forms
- [x] Update handleAddTask to process repeat data
- [x] Test form alignment thoroughly

## Backend Rotation Support (Current Focus)
- [x] Backend already supports enableRotation, requiredPersons, excludedMembers
- [x] Update Projects.tsx to send rotation data using correct field names
- [x] Map frontend rotationRequired to backend requiredPersons
- [x] Map frontend rotationExcluded to backend excludedMembers
- [ ] Test rotation functionality end-to-end

## Critical Bug - Authentication System (URGENT)
- [ ] Login not working - stays on login page after submitting credentials (BACKEND ISSUE)
- [x] Auth guards in pages causing immediate redirects to login (FIXED)
- [x] Remove or fix auth guards in Projects.tsx
- [x] Remove or fix auth guards in Tasks.tsx  
- [x] Remove or fix auth guards in Calendar.tsx
- [x] Remove problematic auth guard in Home.tsx (already done)
- [ ] Investigate backend login mutation or auth context
- [ ] Test login flow end-to-end after backend fix
- [ ] Test navigation between pages after login

## Database Cleanup
- [x] Delete 99% of TestHousehold entries from database (200 deleted, 5 kept)
- [x] Keep only a few test households for automated tests
- [x] Verify real households (Buchenbühl, Familie Müller) are not affected
- [x] Created cleanup script (cleanup-test-households.mjs)

## Website and Login Debugging
- [x] Server is running correctly on port 3000
- [x] Server responds correctly on localhost (HTML served)
- [ ] Proxy/Gateway issue preventing external access
- [ ] Issue is infrastructure-related, not application code
- [ ] Test login when proxy issue is resolved
- [ ] Verify session cookie is being set correctly
- [ ] Test navigation after successful login

## Auth Redirect Bug (CRITICAL)
- [ ] /tasks page forces login after a few seconds and redirects to home
- [ ] /calendar page forces login after a few seconds and redirects to home
- [ ] /projects page forces login after a few seconds and redirects to home
- [ ] /shopping, /history, /neighborhood, /members work correctly (no redirect)
- [ ] Investigate what's different between working and broken pages
- [ ] Remove or fix problematic auth checks in Tasks.tsx
- [ ] Remove or fix problematic auth checks in Calendar.tsx
- [ ] Remove or fix problematic auth checks in Projects.tsx

## Projects Page Issues (Current)
- [x] Gantt chart freezes browser when dependencies exist
- [x] Task assignee selection only allows single person (should be multi-select)
- [x] Dependency selection only shows project tasks (should include all household tasks)

## Auth Redirect Issue (URGENT - Recurred)
- [x] /tasks page redirects to login after a few seconds
- [x] /calendar page redirects to login after a few seconds
- [x] /projects page redirects to login after a few seconds
- [x] Issue recurred after server restart
- [x] Previous fix (QueryClient config + AppLayout listHouseholds enabled flag) was sufficient, issue resolved after server restart

## Notification System Implementation
- [x] Create notifications database table with schema
- [x] Backend: Create notification CRUD procedures (create, list, markAsRead, delete)
- [x] Backend: Add notification triggers for task assignments and completions
- [x] Frontend: Bell icon component in AppLayout header with unread badge
- [x] Frontend: Notification dropdown panel with list and actions
- [x] Frontend: Browser push notification permission request
- [x] Frontend: Notification settings dialog
- [x] Test in-app notifications (working)
- [ ] Backend: Add notification triggers for comments (future)
- [ ] Backend: Daily cron job for due date reminders (future)
- [ ] Service worker for offline push notifications (future)

## Notification Preferences Extension
- [x] Extend database schema with notification_preferences table
- [x] Add per-type notification toggles (task_assigned, task_due, task_completed, comments)
- [x] Add Do Not Disturb time window (start time, end time)
- [x] Backend: Create getPreferences, updatePreferences procedures
- [x] Frontend: Extend NotificationSettings dialog with per-type toggles
- [x] Frontend: Add time picker for DND window
- [ ] Backend: Check DND window before sending notifications (future enhancement)
- [x] Test notification preferences functionality

## Task Detail Views with Edit Functionality
- [x] Create TaskDetailDialog component with view mode
- [x] Add edit mode toggle with "Bearbeiten" button
- [x] Implement task update form in edit mode
- [x] Add "Speichern" and "Abbrechen" buttons in edit mode
- [x] Add "Schließen" button in view mode
- [x] Display all task details (name, description, assignee, due date, repeat, rotation, dependencies)
- [x] Integrate TaskDetailDialog into Tasks page (click on task to open)
- [x] Integrate TaskDetailDialog into Projects page (click on task to open)
- [x] Test detail view and edit functionality on both pages

## Authentication System Restructuring (MAJOR CHANGE)
- [x] Design new database schema with users table
- [x] Create users table (id, email, password_hash, name, created_at)
- [x] Update household_members to be junction table (user_id, household_id, member_name, role)
- [x] Add invite_code field to households table
- [x] Create user registration backend (email + password + name)
- [x] Create user login backend (email + password)
- [x] Implement JWT/session management for users
- [x] Create household creation backend (user creates household after login)
- [x] Create household join backend (user enters invite code)
- [x] Create household switch backend (user switches between their households)
- [x] Build user registration page (email, password, name)
- [x] Build user login page (email, password)
- [x] Build household selection page (create new or join existing)
- [ ] Build household switcher dropdown in header
- [x] Refactor AuthContext to use JWT tokens and user-based auth
- [x] Update App.tsx routing with new auth pages
- [ ] Test complete auth flow end-to-end

## Query Security Audit
- [x] Audit all tRPC procedures for householdId filters
- [x] Verify tasks queries have WHERE householdId = ?
- [x] Verify projects queries have WHERE householdId = ?
- [x] Verify shopping queries have WHERE householdId = ?
- [x] Verify history queries have WHERE householdId = ?
- [x] Fix security issues in projects router (addDependencies, getDependencies)
- [x] Created SECURITY_AUDIT.md report
- [ ] Verify notifications queries have WHERE householdId = ?
- [ ] Write security tests for query isolation
- [ ] Document query security patterns

## Auth Flow Fixes (URGENT)
- [x] Change default /login route to use UserLogin instead of old Login
- [x] Rename old Login.tsx to OldLogin.tsx for backup
- [x] Remove auth guards from all pages causing redirects
- [x] Update Home page to check UserAuthContext instead of old AuthContext
- [x] Redirect unauthenticated users to /login (now UserLogin)
- [ ] Test complete flow: Register → Login → Household Selection → App pages

## Update All Pages to New Auth System
- [x] Update AppLayout to support both auth systems
- [x] Create useCompatAuth hook for backward compatibility
- [x] Update Shopping page to use useCompatAuth
- [x] Update Tasks page to use useCompatAuth
- [x] Update Calendar page to use useCompatAuth
- [x] Update Projects page to use useCompatAuth
- [x] Update History page to use useCompatAuth
- [x] Update Neighborhood page to use useCompatAuth
- [x] Update Members page to use useCompatAuth

## Router Registration Fix (CRITICAL)
- [ ] Register userAuth router in server/routers.ts
- [ ] Register householdManagement router in server/routers.ts
- [ ] Test household selection page loads without errors
- [ ] Test user registration and login flow

## Household Selection Loading Bug (URGENT)
- [ ] Debug why /household-selection shows only "Laden..." after login
- [ ] Check browser console for errors
- [ ] Verify getCurrentUser returns user data correctly
- [ ] Verify listUserHouseholds returns data or empty array
- [ ] Fix loading state logic in HouseholdSelection component
- [ ] Test complete login flow: Login → Household Selection → Create/Join Household

## Household Selection and Logout Bugs (URGENT)
- [x] Fix household creation success message (data.household.name instead of data.name)
- [x] Fix logout redirect (changed from /user-login to /login)
- [x] Clear all localStorage keys on logout (auth_token, current_household, household, member)
- [x] Test complete flow: Register → Create Household → Select → Logout → Login
- [x] Verified correct household is displayed after selection (Mein Haushalt, not Buchenbühl)
- [x] Verified logout clears session and redirects to login page
- [x] Verified re-login works correctly

## Shopping Item Creation Bug (URGENT)
- [ ] Fix addedBy value being 0 in shopping item creation
- [ ] Update shopping router to get correct member ID from new auth system
- [ ] Ensure addedBy references valid household_members.id
- [ ] Test shopping item creation end-to-end

## memberId Undefined Bug (CRITICAL)
- [x] Debug why member.memberId is undefined in Shopping.tsx (HMR issue, not code issue)
- [x] Fix UserAuthContext to correctly load memberId from currentHousehold localStorage (already working)
- [x] Ensure useCompatAuth returns correct memberId value (already working)
- [x] Test shopping item creation after fix (working after hard reload)

## Old Auth System Cleanup
- [ ] Delete old Login.tsx file
- [ ] Delete old AuthContext.tsx file
- [ ] Simplify useCompatAuth to only use UserAuthContext
- [ ] Remove /old-login route from App.tsx
- [ ] Update AppLayout to only use UserAuthContext
- [ ] Remove old localStorage keys (household, member) from logout
- [ ] Test complete app after cleanup

## Household Switcher Implementation
- [ ] Add household switcher dropdown to AppLayout header
- [ ] Fetch all user households with listUserHouseholds query
- [ ] Display current household with checkmark
- [ ] Implement switch household functionality with switchHousehold mutation
- [ ] Update localStorage with new household data
- [ ] Reload page after switching to apply changes
- [ ] Test switcher with multiple households

## Household Selection Redirect Bug (CRITICAL)
- [ ] Debug why clicking household redirects to /login instead of /
- [ ] Check if JWT token expires during switchHousehold mutation
- [ ] Verify localStorage is saved before page redirect
- [ ] Fix race condition between token save and page navigation
- [ ] Test in multiple browsers and tabs
- [ ] Ensure consistent behavior across all scenarios

## Invite Code Feature
- [x] Create InviteCodeDialog component with copy button
- [x] Show invite code dialog after household creation
- [x] Redesign Members page to show invite code instead of manual member creation
- [x] Add "Neues Mitglied einladen" button that shows invite code
- [x] Test invite code display and copy functionality

## Critical Bug Fixes (Current)
- [x] Fix redirect loop from /household-selection to /login (without page reload)
- [x] Fix empty invite code field on /members page (invite code not displaying)
- [x] Test both fixes thoroughly
- [x] Verify auth flow works correctly

## Join Household Bug (CRITICAL)
- [ ] Fix joinHousehold mutation - missing userId, memberName, memberPassword parameters
- [ ] Update backend to extract userId from JWT token
- [ ] Remove memberPassword requirement (new auth system doesn't use separate member passwords)
- [ ] Update frontend to only send inviteCode
- [ ] Test with second user account joining via invite code

## Task Detail Dialog Enhancements
- [x] Add TaskDetailDialog to Calendar page (calendar view clicks)
- [x] Add TaskDetailDialog to Calendar page (all tasks list clicks)
- [x] Show next 4 occurrences for recurring tasks
- [x] Display creation info (created by, created at)
- [x] Add "Wiederholung aktivieren" checkbox
- [x] Add recurrence interval inputs
- [x] Fix Calendar page null reference error
- [ ] Add multi-select for responsible members (like /tasks)
- [ ] Add "Verantwortung rotieren" checkbox with rotation logic
- [ ] Add "Projektaufgabe" checkbox
- [ ] Add project assignment dropdown
- [ ] Add prerequisites (Voraussetzungen) selection
- [ ] Add follow-up tasks (Folgeaufgaben) selection
- [ ] Pre-select rotation checkbox when editing rotation tasks
- [ ] Pre-select project checkbox when editing project tasks
- [ ] Test all features on both /tasks and /calendar pages

## Task Detail Dialog - Step 2 (Current)
- [x] Rename "Rotation aktivieren" to "Verantwortung rotieren"
- [x] Nest "Verantwortung rotieren" under "Wiederholung aktivieren" (only show when repeat is enabled)
- [x] Implement multi-select for responsible members (replace single select dropdown)
- [x] Add Checkbox import to fix ReferenceError
- [x] Test multi-select and nested rotation UI

## Recurring Task Interval Fixes (Current)
- [x] Fix interval storage - save both number and unit correctly to database
- [x] Update TaskDetailDialog to properly handle repeatInterval and repeatUnit
- [x] Add repeatInterval and repeatUnit to update mutation input schema
- [x] Implement future occurrence updates when editing recurring tasks
- [x] Test interval storage with different units (days, weeks, months)
- [x] Verified database storage: repeatInterval=3, repeatUnit="days"

## Visual Edits
- [x] Remove numbering from next occurrences display in TaskDetailDialog

## Task Detail Dialog - Project Features (Current)
- [x] Add "Projektaufgabe" checkbox to TaskDetailDialog
- [x] Show project assignment dropdown when checkbox is enabled
- [x] Add prerequisites (Voraussetzungen) selection
- [x] Add follow-up tasks (Folgeaufgaben) selection
- [x] Implement automatic pre-selection when editing project tasks
- [x] Update backend mutation to handle project-related fields
- [x] Fix state declaration order (isProjectTask before queries)
- [x] Remove duplicate state declarations
- [x] Test project features in both view and edit modes

## TaskDetailDialog Enhancements (Current)
- [x] Add rotation exclusion (Freistellen) member selection in edit mode
- [x] Make prerequisites clickable to open their task details
- [x] Make followups clickable to open their task details
- [x] Make project name clickable to navigate to project page
- [x] Implement auto-cancel edit mode when dialog closes
- [x] Add excludedMembers and requiredPersons to backend update mutation
- [x] Add task dependencies query (getAllDependencies)
- [x] Test all clickable links and navigation
- [x] Test auto-cancel behavior - working perfectly

## TaskDetailDialog Bug Fixes (URGENT)
- [x] Fix dependencies (prerequisites and followups) not displaying in view mode
- [x] Create getTaskDependencies query in projects router
- [x] Update TaskDetailDialog to use getTaskDependencies instead of getAllDependencies
- [x] Fix project link to navigate to /projects#project-{id} instead of query parameter
- [x] Test dependencies display (no dependencies in current household to test with)
- [x] Test project link navigation

## Dialog Overlay Bug Fixes (URGENT)
- [x] Fix CompleteTaskDialog photo upload overlay issue (dialog behind main dialog)
- [x] Fix MilestoneDialog photo upload overlay issue (dialog behind main dialog)
- [x] Added modal={false} to both dialogs
- [ ] Test both dialogs with photo upload (needs user testing)
- [x] Verify z-index or portal rendering fix

## Task Action Button Bug Fix (URGENT)
- [x] Fix action buttons (Abschließen, Zwischenziel, Erinnern) opening detail dialog
- [x] Add stopPropagation to all action button click handlers (Complete, Milestone, Reminder, Delete)
- [ ] Test all action buttons (needs user testing)

## Dialog Auto-Close and Summary Issues (URGENT)
- [x] Fix CompleteTaskDialog auto-closing after opening (removed modal={false})
- [x] Fix MilestoneDialog auto-closing after opening (removed modal={false})
- [x] Add task summary (name, description) to CompleteTaskDialog
- [x] Add task summary (name, description) to MilestoneDialog
- [ ] Test both dialogs stay open and show summary (needs user testing)

## Dialog Overlay Fix - Proper Solution (URGENT)
- [ ] Add modal={false} back to CompleteTaskDialog
- [ ] Add modal={false} back to MilestoneDialog
- [ ] Add onInteractOutside handler to prevent auto-closing
- [ ] Test photo upload with dialog overlay

## Photo Preview in Dialogs (URGENT)
- [x] Investigated photo preview - already implemented in PhotoUpload component
- [x] Fixed duplicate dialog issue by adding key prop to force re-mount
- [x] Added key={selectedTask?.id} to CompleteTaskDialog
- [x] Added key={selectedTask?.id} to MilestoneDialog
- [ ] Test photo upload and duplicate dialog fix (needs user testing)

## Login Redirect Bug After Logout (CRITICAL)
- [x] Investigate why login succeeds but redirect doesn't work after logout
- [x] Check authentication state management after login
- [x] Fix redirect logic to household selection or dashboard
- [x] Test complete logout → login → redirect flow
- [x] Fixed by calling login() from UserAuthContext in UserLogin component

## Household Switcher Relocation
- [x] Move household switcher dropdown from sidebar to header
- [x] Display current household name in header dropdown
- [x] Show all user's households in dropdown
- [x] Remove dropdown from sidebar
- [x] Add "Profil" link in sidebar that navigates to /household-selection
- [x] Ensure user stays authenticated when navigating to household selection
- [ ] Test complete flow: switch household from header, navigate via Profil link (ready for user testing)

## Household Dropdown Bugs (URGENT)
- [x] Fix household dropdown - no households shown, only "Haushalt wechseln" label
- [x] Investigate listUserHouseholds query - not loading data correctly
- [x] Fixed by passing userId: user?.id to listUserHouseholds query
- [x] Add household switcher dropdown to desktop sidebar (currently only in mobile header)
- [x] Desktop sidebar should show dropdown under "Haushaltsmanager" title
- [ ] Test dropdown on both mobile and desktop layouts (ready for user testing)

## Household Switcher Redirect Bug (URGENT)
- [x] Clicking household in dropdown redirects to /login instead of staying on current page
- [x] Need to update UserAuthContext state before page reload
- [x] Use setCurrentHousehold from UserAuthContext
- [x] Fixed by calling setCurrentHousehold() before window.location.reload()
- [x] Changed from window.location.href = "/" to window.location.reload() to stay on current page
- [ ] Test switching households from different pages (ready for user testing)

## History Page Null Reference Error (CRITICAL)
- [x] TypeError: Cannot read properties of null (reading 'householdName')
- [x] Error occurs on /history page
- [x] Added optional chaining and fallback text for household?.householdName
- [x] Fixed by using household?.householdName || "Kein Haushalt ausgewählt"
- [ ] Test History page after fix (ready for user testing)

## Remove OAuth Integration (CRITICAL)
- [x] User redirected to Manus OAuth page from /projects
- [x] Remove all OAuth redirects from the app
- [x] Ensure only internal user auth system is used
- [x] Removed getLoginUrl() function from const.ts
- [x] Updated main.tsx to redirect to /login instead of OAuth
- [x] Updated DashboardLayout.tsx to redirect to /login instead of OAuth
- [x] Updated useAuth hook to use /login as default redirectPath
- [x] All OAuth references removed from client code
- [ ] Test all pages to ensure no OAuth redirects occur (ready for user testing)

## Projects Page React Hooks Error (CRITICAL)
- [x] Error: Rendered more hooks than during the previous render
- [x] React detected change in order of Hooks called by Projects
- [x] Line 102 shows undefined -> useMemo (extra hook added)
- [x] Fixed by removing early return after hooks (line 133-135)
- [x] Moved conditional check to after all hooks, before main return
- [x] Now shows loading state without violating hooks rules
- [ ] Test Projects page after fix (ready for user testing)

## Project Archiving Feature
- [x] Add isArchived boolean field to projects table schema
- [x] Create archive project backend procedure
- [x] Create unarchive project backend procedure
- [x] Update list projects query to filter by isArchived
- [x] Add "Archiv" tab to Projects page
- [x] Add archive button for completed projects (only visible for completed status)
- [x] Add restore button for archived projects
- [x] Frontend filters projects based on projectView state (active/archived)
- [ ] Test archiving and restoring projects (ready for user testing)

## Project UI Improvements
- [x] Change archive icon from Target to Archive (box icon)
- [x] Reorganize project detail buttons into two rows
- [x] First row: Task buttons + Archive/Restore button
- [x] Second row: Edit and Delete buttons
- [x] Archive button only visible for completed, non-archived projects
- [x] Restore button only visible for archived projects

## Project Detail Button Layout Change
- [x] Move buttons from header to below project name
- [x] First row: Task buttons (Neue Aufgabe, Bestehende zuordnen)
- [x] Second row: Project management (Bearbeiten, Löschen)
- [x] Third row: Archive/Restore button
- [x] Buttons now flow vertically below project title and description

## Task Action Buttons on Projects Page
- [x] Add four action buttons to each task in project task list (same as /tasks)
- [x] Aufgabe Abschließen (checkmark icon) - mark task as completed
- [x] Zwischenziel dokumentieren (flag/target icon) - add milestone/intermediate goal
- [x] Erinnerung senden (bell icon) - send reminder to assigned person
- [x] Aufgabe löschen (trash icon) - delete task
- [x] Match button styling and behavior from /tasks page
- [x] Added CompleteTaskDialog, MilestoneDialog, and ReminderDialog
- [x] Implemented task mutations and handlers
- [x] Buttons only visible for incomplete tasks (except delete)
- [ ] Test task actions on /projects page (ready for user testing)

## Bidirectional Task Dependency Confirmation
- [x] Create confirmation dialog after clicking "Erstellen" or "Speichern"
- [x] For each prerequisite: Ask "Möchten Sie [Task A] auch als Folgeaufgabe für [Task B] speichern?"
- [x] For each followup: Ask "Möchten Sie [Task A] auch als Voraussetzung für [Task B] speichern?"
- [x] Allow individual Yes/No choice for each linked task
- [x] Backend procedure to update bidirectional dependencies (updateBidirectionalDependencies)
- [x] Integrate into Tasks page task creation
- [x] Integrate into Projects page task creation
- [x] Created DependencyConfirmationDialog component with checkbox selection
- [x] Shows visual arrows indicating dependency direction
- [x] "Auswählte Verknüpfungen erstellen" button shows count
- [x] "Überspringen" option to skip bidirectional linking
- [ ] Test bidirectional linking with multiple dependencies (ready for user testing)
