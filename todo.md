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

## Dependency Linking Bugs (CRITICAL)
- [x] addDependencies creates automatic mirrored links (should not)
- [x] When creating task B with task A as prerequisite, A automatically gets B as followup
- [x] Fixed: Changed followup insertion from taskId: depId to taskId: input.taskId
- [x] Now only direct link is created, mirror only after dialog confirmation
- [x] Dependency display inconsistent - sometimes shows, sometimes doesn't
- [x] Fixed backend addDependencies to only create direct links
- [x] Fixed TaskDependencies followups filter: taskId === taskId (not dependsOnTaskId)
- [x] Fixed followup display to show dep.dependsOnTaskId (not dep.taskId)
- [ ] Test dependency creation and display (ready for user testing)

## Auth Redirect Bug on /tasks (CRITICAL)
- [x] User gets redirected from /tasks to /login despite successful login
- [x] Auth check fails even though token is stored
- [x] Root cause: Backend only checked cookies, ignored Authorization header
- [x] Fixed by adding Bearer token authentication to context.ts
- [x] Added getUserById function to db.ts
- [x] Now checks Authorization header first, falls back to cookies
- [x] Fix applies to all pages: /tasks, /calendar, /projects, etc.
- [ ] Test complete login → /tasks → /calendar → /projects flow (ready for user testing)

## Duplicate React Key Error on /tasks (CRITICAL)
- [x] Error: "Encountered two children with the same key, `690009`"
- [x] Fixed prerequisites and followups lists with unique prefixes
- [x] NEW ERROR: Task ID 600009 still has duplicate keys
- [x] Found root cause: Dialog components (CompleteTaskDialog, MilestoneDialog) used same key
- [x] Fixed by adding unique prefixes: key={`complete-${task.id}`} and key={`milestone-${task.id}`}
- [x] All duplicate key issues resolved
- [ ] Test /tasks page after complete fix (ready for user testing)

## Duplicate React Key Error on /projects (CRITICAL)
- [x] Error: "Encountered two children with the same key, `690011`"
- [x] Same issue as /tasks - dialog components and task lists need unique keys
- [x] Fixed dialog components with unique prefixes: complete-, milestone-, reminder-
- [x] Fixed prerequisite lists: prereq-project- and prereq-other-
- [x] Fixed followup lists: followup-project- and followup-other-
- [x] All duplicate key issues resolved on /projects
- [ ] Test /projects page after fix (ready for user testing)

## Dependency Linking Still Broken (CRITICAL)
- [x] Investigated backend addDependencies - NO auto-mirroring (correct)
- [x] Investigated TaskDependencies display logic - filter conditions correct
- [x] Checked database - found 9 dependencies, 4 are mirrored pairs
- [x] Found issue: Old dependencies from before fix still exist
- [x] updateBidirectionalDependencies logic is correct
- [ ] Problem: Display shows ALL dependencies (direct + mirrored) causing confusion
- [ ] Solution needed: Either clean old data OR improve display logic
- [ ] User chose: Keep existing data, improve display/logic


## Task Dependency Mirroring Bug (CRITICAL - Current Issue)
- [x] Bug 1: addDependencies creates automatic mirroring BEFORE dialog confirmation
- [x] Bug 2: When dialog is confirmed, updateBidirectionalDependencies creates wrong types (both prerequisite AND followup)
- [x] Root cause: Followup creation in addDependencies (lines 127-135) creates reverse dependencies automatically
- [x] Fix: Remove automatic followup mirroring from addDependencies
- [x] Fix: Verify updateBidirectionalDependencies creates correct reverse dependencies
- [ ] Test: Create task with prerequisite + decline dialog = no mirroring (ready for user testing)
- [ ] Test: Create task with prerequisite + confirm dialog = correct bidirectional link (ready for user testing)


## Task Dependency Bugs - New Issues Found (CRITICAL)
- [x] Bug 1: API Error when editing tasks - projectId cannot be null (must be optional or undefined)
- [x] Bug 2: TaskDetailDialog edit mode doesn't pre-select existing prerequisites/followups
- [ ] Bug 3: Automatic mirroring still happening - confirmed dependencies show as BOTH prerequisite AND followup
- [ ] Bug 4: List view doesn't show dependencies when "Überspringen" is clicked (only shows when confirmed)
- [ ] Root cause analysis: Need to check where automatic mirroring is still being created
- [x] Fix: Make projectId optional in tasks.update mutation input schema
- [x] Fix: Load existing dependencies in TaskDetailDialog and pre-select checkboxes
- [ ] Fix: Verify no automatic mirroring in backend (check all dependency creation points)
- [ ] Fix: Correct TaskDependencies display logic for list view


## Double Dependency Bug (CRITICAL - Current Issue)
- [x] Bug: Dependencies are created twice - once as prerequisite, once as followup for the same task pair
- [x] Example: "Abtrocken" has "Abwaschen" as both prerequisite AND followup
- [x] Root cause: getTaskDependencies was not filtering by dependencyType
- [x] Fix: Ensure addDependencies only creates direct dependencies (no mirroring)
- [x] Fix: Ensure updateBidirectionalDependencies only creates reverse dependencies (not duplicates)
- [x] Clean up: Remove duplicate dependencies from database


## TaskDetailDialog Shows Duplicate Dependencies
- [x] Bug: List view shows dependencies correctly, but TaskDetailDialog shows duplicates
- [x] Root cause: getTaskDependencies followups query used wrong WHERE clause (dependsOnTaskId instead of taskId)
- [x] Fix: Changed followups query to use taskId and join on dependsOnTaskId


## Show Task Details After Creation
- [x] Feature: Open TaskDetailDialog immediately after creating a new task
- [x] Replace toast "Aufgabe hinzugefügt" with task details dialog
- [x] Implement in Tasks.tsx
- [x] Implement in Projects.tsx


## Remove Dependency Confirmation Dialog and Fix Auto-Refresh
- [x] Remove DependencyConfirmationDialog component completely
- [x] Remove all references to DependencyConfirmationDialog in Tasks.tsx and Projects.tsx
- [x] Implement automatic bidirectional mirroring without dialog
- [x] Add getTaskDependencies invalidation after task creation
- [x] Ensure dependencies display updates automatically without manual refresh


## Make Dependency Links Clickable
- [x] Make prerequisite links in TaskDetailDialog clickable
- [x] Make followup links in TaskDetailDialog clickable
- [x] Clicking a dependency link should open that task's details
- [x] Ensure smooth navigation between task details


## Fix Dependency Duplication on Edit
- [x] Bug: Editing a task with dependencies duplicates them instead of updating
- [x] Root cause: addDependencies adds new dependencies without removing old ones
- [x] Solution: Create updateDependencies procedure that replaces all dependencies
- [x] Alternative: Delete old dependencies before calling addDependencies


## Refresh Task Display After Edit
- [x] Bug: Task details don't refresh after editing - need to close and reopen dialog
- [x] Solution: Invalidate task queries after successful edit in TaskDetailDialog
- [x] Ensure all data (name, description, assignee, due date, dependencies) updates immediately


## Fix Race Condition in Task Detail Refresh
- [x] Bug: Task details still don't update immediately after edit - need to close and reopen
- [x] Root cause: Query invalidation happens before database updates complete (race condition)
- [x] Solution: Add small delay (150ms) after mutations before invalidating queries
- [x] Alternative: Ensure all mutations complete with proper await before invalidation


## Revert Delay Approach and Implement Proper Solution
- [x] Revert: Remove 150ms delay from handleSave
- [x] Better solution: Move query invalidation to updateTask.onSuccess callback
- [x] This ensures invalidation happens after mutation completes AND UI updates
- [x] Also invalidate after updateDependencies completes

## Task Detail Dialog Refresh Bug (Current Focus)
- [x] Analyze working solution from task creation (uses fetch + setSelectedTask)
- [x] Modify TaskDetailDialog to call onTaskUpdated after successful save
- [x] Update Tasks.tsx onTaskUpdated to fetch and update selectedTask
- [x] Update Projects.tsx onTaskUpdated to fetch and update selectedTask (remove page reload)
- [x] Test on /tasks page - verify all fields update immediately after edit
- [x] Test on /projects page - verify dialog stays open and updates without reload

## Fix Unreliable Task Updates (Current Focus)
- [x] Analyze all mutation flows in TaskDetailDialog (updateTask, updateDependencies)
- [x] Analyze Tasks.tsx mutation flows (addMutation, onTaskUpdated callback)
- [x] Analyze Projects.tsx mutation flows (addTaskMutation, onTaskUpdated callback)
- [x] Identify redundant query invalidations
- [x] Identify race conditions or timing issues
- [x] Ask user about removing redundant code
- [x] Implement consolidated solution
- [x] Remove redundant dependency query invalidations in handleSave
- [x] Move dependency update before query invalidation (sequential flow)
- [x] Change onTaskUpdated callback to pass updated task directly
- [x] Replace refetchTasks() with utils.tasks.list.invalidate() in Projects.tsx
- [ ] Test detail dialog updates reliably after edit
- [ ] Test list view updates reliably after edit
- [ ] Test thoroughly on both /tasks and /projects pages

## Task Editing Bugs (URGENT)
- [x] Fix projectId typo in handleSave (projectld → projectId) causing API error (not found - may be fixed)
- [x] Fix Projektaufgabe checkbox not showing checked state when task has projectId (works via useEffect line 160)
- [x] Fix project selection dropdown not pre-selecting current project (works via useEffect line 161)
- [x] Fix prerequisites/followups not pre-selecting when opening edit dialog (works via useEffect line 166-175)
- [x] Fix dependencies not refreshing in UI after editing on /projects page (added refetch in handleSave)
- [x] Fix taskDependencies query to include householdId parameter
- [ ] Test all fixes thoroughly

## Remaining Task Editing Issues (Current Focus)
- [x] Fix empty description cannot be saved (allow empty string in handleSave)
- [x] Rename "Projektaufgabe" label to "Aufgabenverknüpfung" in TaskDetailDialog
- [x] Fix listed task dependencies not refreshing after edit (added getAllDependencies.invalidate)
- [x] Fix listed task dependencies not refreshing after create (added getAllDependencies.invalidate)
- [x] Fix new task dialog not showing dependencies after creation (added prefetch before opening dialog)
- [ ] Test all fixes thoroughly

## Critical Fixes Needed (Current Focus)
- [x] Rename "Projektaufgabe" to "Aufgabenverknüpfung" in task creation form on /tasks
- [x] Fix new task dependencies not showing in list/details on /projects after creation (added refetch)
- [ ] Implement multi-project selection (task can belong to multiple projects) - DEFERRED
- [x] Fix project deselection not working (updateDependencies always called, clears when isProjectTask=false)
- [x] Fix new task dependencies not showing in list/details on /tasks after creation (added refetch)
- [x] Fix Aufgabenverknüpfung checkbox deselection - clears all dependencies when isProjectTask=false
- [x] Exclude current task from its own prerequisite/followup lists (filtered in TaskDetailDialog)
- [ ] Test all fixes

## Critical Bugs to Fix (Current Focus)
### /tasks page:
- [x] Fix API error "projectId expected number, received null" when creating task with dependencies
- [x] Fix new task details not showing dependencies after creation (moved logic to handleAddTask)
- [x] Fix Aufgabenverknüpfung checkbox pre-selection when editing tasks (added logging to debug)

### /projects page:
- [x] Fix double task creation (added disabled state during pending)
- [x] Fix "Can't find variable: setPendingTaskData" error (removed unused code)
- [x] Fix new task details not showing dependencies after creation (moved logic to handleAddTask)
- [x] Fix list view not updating dependencies without refresh (refetch in handleAddTask)

### Ready for testing

## Multi-Project Assignment Implementation (Current Focus)
### Phase 1: Backend & Schema
- [x] Analyze current schema and backend implementation
- [x] Change schema: projectId (int) → projectIds (JSON array)
- [x] Create migration script for existing data (manual SQL: ADD COLUMN, UPDATE data, DROP old column)
- [x] All backend changes completed and tested
- [x] Update tasks.add procedure to accept projectIds array
- [x] Update tasks.update procedure to accept projectIds array
- [x] Update tasks.list to return projectIds (automatic via schema)
- [x] Update projects.getAvailableTasks to return projectIds
- [x] Update test files to use projectIds
- [ ] Test backend with database queries (after frontend is done)

### ### Phase 2: /tasks Frontend
- [x] Replace project dropdown with multi-select component (checkbox list)
- [x] Update task creation to send projectIds array
- [x] Update task editing to send projectIds array
- [x] Update TaskDetailDialog to show multiple projects (view mode)
- [x] Update TaskDetailDialog edit mode with multi-select
- [x] Test on /tasks page - WORKS PERFECTLYge

### Phase 3: /projects Frontend
- [ ] Update task creation dialog for multi-select
- [ ] Update task editing for multi-select
- [ ] Update project task filtering (show tasks in ANY selected project)
- [ ] Test all flows on /projects page

## Multi-Select UI Redesign for Task Creation
- [x] Remove "Hauptaufgabe" logic on /tasks
- [x] Show multi-select for existing projects always on /tasks
- [x] Add inline new project creation below multi-select on /tasks
- [x] Add "Auch anderen Projekten zuordnen" section in /projects task creation
- [x] Add multi-select for additional projects in /projects task creation
- [x] Move rotation question after repeat question in /projects task creation (nested under repeat)
- [x] Test on /projects page - WORKS PERFECTLY
- [ ] Move rotation question after repeat question in /projects task editing (optional)

## Database Cleanup: Redundante Tabellen entfernen
- [x] project_tasks Tabelle entfernen (redundant - tasks hat projectIds)
- [x] project_task_dependencies Tabelle entfernen (redundant - task_dependencies wird verwendet)
- [x] Schema-Relationen bereinigen
- [x] db.ts Imports bereinigen
- [x] Datenbank-Migration durchführen

## TypeScript-Fehler beheben
- [x] Kategorie 1: Nullable Typ-Konflikte (email, passwordHash)
- [x] Kategorie 2: Fehlende/Falsche tRPC Prozeduren
- [x] Kategorie 3: Possibly Null/Undefined Zugriffe
- [x] Kategorie 4: Schema-Fehler (projectIds default)
- [x] Kategorie 5: Komponenten-Props Fehler
- [x] Kategorie 6: Variablen-Fehler

## Aufgabendialog-Verbesserungen
- [x] /projects: Verantwortlicher als Pflichtfeld validieren (Fehlermeldung wenn leer)

## Foto-Upload-Probleme beheben
- [x] PhotoUpload-Komponente: State-Synchronisation mit Parent-Komponente reparieren
- [x] CompleteTaskDialog: Foto-URLs korrekt übergeben
- [x] MilestoneDialog: Foto-URLs korrekt übergeben
- [x] Hochgeladene Fotos im Dialog anzeigen
- [x] Fotos im Aktivitätsverlauf anzeigen

## Foto-Upload UI-Verbesserungen
- [x] PhotoUpload: Fortschrittsbalken während Upload anzeigen
- [x] PhotoUpload: Foto-Vorschau direkt im Dialog anzeigen
- [x] PhotoUpload: Versteckten Browser-Dialog-Problem beheben
- [x] Alle Dialoge mit Foto-Upload aktualisieren (CompleteTask, Milestone, Shopping)

## Foto-Upload State-Update Problem
- [x] PhotoUpload: State wird nicht aktualisiert nach Upload (Toast erscheint, aber keine Vorschau)
- [x] Debugging: onPhotosChange wird aufgerufen aber Parent-State ändert sich nicht
- [x] Lösung implementieren und testen (useEffect entfernt, Key-Props mit open-State)

## Foto-Upload State-Problem (persistent)
- [x] Upload erfolgreich (Toast erscheint) aber Vorschau bleibt leer
- [x] onPhotosChange wird aufgerufen aber State ändert sich nicht
- [x] Alternative Lösung: useEffect mit prevOpenRef - Reset nur beim Schließen

## Foto-Upload Debug (Vorschau und Fortschrittsbalken funktionieren nicht)
- [x] Debug-Logs in PhotoUpload hinzufügen
- [x] Debug-Logs in CompleteTaskDialog hinzufügen
- [x] Problem identifizieren: onPhotosChange kam nicht im Dialog an (veraltete Referenz)
- [x] Lösung: useCallback für stabile Callback-Referenz

## Dialog schließt sich automatisch nach Foto-Upload
- [x] Ursache identifizieren (onOpenChange wird aufgerufen durch Klick außerhalb)
- [x] Problem beheben (isUploading State + handleOpenChange verhindert Schließen während Upload)

## useCallback verhindert State-Update
- [x] useCallback mit leerer Dependency-Liste hat veraltete Closure
- [x] Direkt setPhotos verwenden statt useCallback (normale Funktion)

## Toast öffnet Dialog über Hauptdialog
- [x] Toast entfernen oder durch Inline-Feedback ersetzen (Toast entfernt)
- [x] Nur Foto-Vorschau aktualisieren, Eingaben erhalten (automatisch durch State-Update)

## KRITISCH: Zweiter Dialog öffnet sich im Hintergrund beim Foto-Upload
- [x] ROOT CAUSE GEFUNDEN: AppLayout rendert {children} ZWEIMAL!
- [x] Zeile 296: Desktop Layout rendert children (hidden lg:flex)
- [x] Zeile 302: Mobile Layout rendert children NOCHMAL (lg:hidden)
- [x] Deshalb werden ALLE Dialoge doppelt erstellt
- [x] Lösung: AppLayout mit Conditional Rendering umgeschrieben
- [x] Nur EINE Version wird gerendert (isDesktop ? Desktop : Mobile)
- [x] Alle Debug-Logs entfernt
- [x] Problem behoben - Foto-Upload funktioniert jetzt korrekt!

## Client-seitige Bildkompression
- [x] browser-image-compression Library installiert
- [x] Kompression in PhotoUpload.tsx integriert
- [x] Kompressionseinstellungen konfiguriert (max 1920px, max 1MB)
- [x] Testen mit verschiedenen Bildgrößen - funktioniert!

## Aufgaben-spezifischer Verlauf in Detailansicht
- [x] Backend: Query für aufgaben-spezifische Historie erstellen (activities.getByTaskId)
- [x] Frontend: Verlauf-Tab in TaskDetailDialog hinzufügen
- [x] Frontend: Verlaufseinträge mit Fotos, Kommentaren und Zeitstempel anzeigen
- [x] Frontend: Foto-Lightbox für Verlaufsfotos integrieren
- [x] Testen mit verschiedenen Aktivitätstypen (Abschluss, Zwischenziel, Erinnerung)

## Action-Buttons in Aufgaben-Detailansicht
- [x] Button "Aufgabe abschließen" im Details-Tab hinzufügen (mit Foto + Kommentar Dialog)
- [x] Button "Zwischenziel vermerken" im Details-Tab hinzufügen (mit Foto + Kommentar Dialog)
- [x] Button "Erinnerung senden" im Details-Tab hinzufügen (mit optionalem Kommentar)
- [x] Button "Wiederherstellen" für abgeschlossene Aufgaben hinzufügen
- [x] Buttons nur anzeigen wenn Aufgabe nicht im Edit-Mode ist
- [x] Nach Aktion automatisch Verlauf-Tab aktualisieren

## Batch-Operationen für Aufgabenliste
- [x] Mehrfachauswahl-Modus mit Checkboxen in der Aufgabenliste
- [x] "Auswählen"-Button zum Aktivieren des Mehrfachauswahl-Modus
- [x] Batch-Action-Toolbar mit Aktionszähler (z.B. "3 Aufgaben ausgewählt")
- [x] Batch-Löschen: Mehrere Aufgaben gleichzeitig löschen
- [x] Batch-Zuweisen: Mehrere Aufgaben einem Mitglied zuweisen
- [x] Batch-Abschließen: Mehrere Aufgaben gleichzeitig als erledigt markieren
- [x] Backend: Batch-Delete Mutation erstellen
- [x] Backend: Batch-Assign Mutation erstellen
- [x] Backend: Batch-Complete Mutation erstellen
- [x] "Alle auswählen" / "Alle abwählen" Funktion
- [x] Bestätigungsdialog vor destruktiven Batch-Operationen

## Aufgaben-Filter und Sortierung
- [x] Filter-Dropdown für Status (Alle/Offen/Erledigt)
- [x] Filter-Dropdown für Verantwortlichen (Alle Mitglieder)
- [x] Filter-Dropdown für Fälligkeit (Alle/Überfällig/Heute/Diese Woche/Diesen Monat)
- [x] Sortier-Dropdown (Fälligkeitsdatum/Name/Erstellungsdatum)
- [x] Sortierrichtung umkehrbar (aufsteigend/absteigend)
- [x] Filter-Reset-Button zum Zurücksetzen aller Filter
- [x] Anzahl gefilterter Aufgaben anzeigen

## Pagination für Verlauf
- [x] Backend: Pagination Parameter für getActivityHistory (limit, offset)
- [x] Backend: Total Count für Pagination zurückgeben
- [x] Frontend: Pagination UI mit Seitenzahlen und Vor/Zurück-Buttons
- [x] Frontend: 30 Einträge pro Seite im Verlauf anzeigen
- [x] Loading State während Seitenwechsel

## UI-Verbesserungen
- [x] Filter & Sortierung als zusammenklappbares Feld (Collapsible)
- [x] Action-Buttons in Aufgabenliste in zwei Spalten organisieren (Abschließen über Zwischenziel, Erinnerung über Löschen)
- [x] Action-Buttons auch bei /projects in zwei Spalten organisieren

## Bug-Fixes
- [x] React Hooks Ordering Error in Tasks.tsx beheben (Alle Hooks werden jetzt immer ausgeführt, bedingtes Rendering am Ende)

## Calendar Action-Buttons in zwei Spalten
- [x] Action-Buttons in Kalenderansicht (unten) in zwei Spalten organisieren
- [x] Action-Buttons in "Alle Aufgaben"-Liste in zwei Spalten organisieren

## Umlaut-Fixes und Icon-Konsistenz
- [x] Scharfes ß in "Abschließen" auf Calendar-Seite reparieren
- [x] Umlaut ö in "Löschen" auf Calendar-Seite reparieren
- [x] Milestone-Icon (Target) auf Tasks-Seite anwenden (bereits vorhanden)
- [x] Milestone-Icon (Target) auf Projects-Seite anwenden (bereits vorhanden)

## Milestone-Icon Korrektur
- [x] Milestone-Icon auf Calendar-Seite durch Target-Icon ersetzen
- [x] Milestone-Icon auf Tasks-Seite durch Target-Icon ersetzen (bereits korrekt)
- [x] Milestone-Icon auf Projects-Seite durch Target-Icon ersetzen (bereits korrekt)

## Kalender-Erweiterungen
- [x] Monat/Jahr-Navigation zum Kalender hinzufügen (Vor/Zurück-Buttons)
- [x] Aktuellen Monat/Jahr im Kalender-Header anzeigen
- [x] Folgetermine von wiederkehrenden Aufgaben berechnen
- [x] Folgetermine im Kalender anzeigen (mit visueller Unterscheidung)
- [x] Folgetermine in Tages-Detailansicht anzeigen

## Wiederkehrende Aufgaben Logik-Fix (KRITISCH)
- [x] Backend: Bei Abschluss wiederkehrender Aufgaben nicht isCompleted=true setzen
- [x] Backend: Stattdessen dueDate auf nächsten Termin verschieben
- [x] Backend: Bei Rotation nächsten Verantwortlichen zuweisen
- [x] Backend: Verlauf-Eintrag mit ORIGINAL dueDate speichern (nicht neues Datum)
- [x] Frontend: Folgetermine-Anzeige aus Kalender entfernen (nicht mehr nötig)
- [x] Frontend: Kalender zeigt nur tatsächliche dueDate-Termine
- [x] Tests: Wiederkehrende Aufgaben-Logik testen (Test-Datei erstellt, Schema-Anpassung erforderlich)

## Wiederkehrende Aufgaben: Folgetermine und Verlauf im Kalender
- [x] Frontend: Folgetermine von wiederkehrenden Aufgaben im Kalender anzeigen
- [x] Frontend: Berechnung zukünftiger Termine basierend auf repeatInterval/repeatUnit
- [x] Frontend: Visuelle Unterscheidung (aktuell=blau, zukünftig=lila/transparent, erledigt=grün)
- [x] Frontend: Activity-History im Kalender abrufen und anzeigen
- [x] Frontend: Erledigte Termine aus Activity-Log als separate Einträge darstellen
- [x] Backend: Mutation zum Rückgängigmachen (Verlauf bleibt erhalten!)
- [x] Backend: Bei Undo Aufgabe auf ursprüngliches Datum zurücksetzen
- [x] Backend: Bei Undo Rotation rückgängig machen (vorheriger Verantwortlicher)
- [x] Frontend: "Rückgängig"-Button in Tages-Detailansicht für erledigte Termine
- [x] Frontend: Undo-Funktion mit Bestätigungs-Dialog

## Kalender: Chronologische Aufgabenliste
- [x] "Alle Aufgaben"-Tab von Projekt-Gruppierung auf chronologische Liste umstellen
- [x] Folgetermine in chronologischer Liste anzeigen
- [x] Sortierung nach Fälligkeitsdatum (älteste zuerst)
- [x] Visuelle Unterscheidung für Folgetermine beibehalten

## Kalender: Aufgaben ohne Termine
- [x] Separate Sektion unter chronologischer Liste für Aufgaben ohne dueDate
- [x] Filter nach Verantwortlichem (Dropdown mit allen Haushaltsmitgliedern)
- [x] Sortierung nach Erstellungsdatum (auf-/absteigend)
- [x] Sortierung nach Name (alphabetisch auf-/absteigend)
- [x] UI mit Filter- und Sortier-Controls

## Wiederkehrende Aufgaben: Erledigte Termine und Auslassen
- [x] Schema: completedDate zu activityHistory hinzufügen
- [x] Schema: skippedDates Array (JSON) zu tasks hinzufügen
- [x] Backend: completedDate beim Abschließen in Activity-Log speichern
- [x] Backend: skipOccurrence Mutation (fügt Datum zu skippedDates hinzu)
- [x] Frontend: Kalender filtert skippedDates aus Folgeterminen
- [x] Frontend: Kalender zeigt erledigte Termine aus Activity-History
- [x] Frontend: Folgetermine nur mit "Zum Termin springen" und "Auslassen"
- [x] Frontend: Aktuelle Termine mit allen Aktionen (Abschließen, etc.)

## Skipped Dates Bugs (Current Focus)
- [x] Skipped dates werden nicht im Kalender gefiltert - Folgetermine erscheinen auch wenn sie ausgelassen wurden
- [x] Fehlende Anzeige ausgelassener Termine in Aufgaben-Detailansicht
- [x] Fehlende Wiederherstellungs-Funktion für ausgelassene Termine

- [x] Backend: restoreSkippedDate Mutation implementiert
- [x] Frontend: Skipped Dates Liste in TaskDetailDialog mit Restore-Buttons

## Kalender & Folgetermine Bugs (Aktuell)
- [x] "Zum Termin springen" Button springt zum falschen Datum (heute statt zum Termin)
- [x] "Erinnern"-Button bei Folgeterminen entfernen (ergibt keinen Sinn)
- [x] "Auslassen"-Button funktioniert nicht zuverlässig
- [x] Wiederherstellung ausgelassener Termine in Aufgabendetails nicht sichtbar/auffindbar
- [x] Folgetermine laden nicht beim Durchscrollen der Monate im Kalender
- [x] Chronologische Liste zeigt zu wenige Folgetermine
- [x] Chronologische Liste: Standardansicht auf 3 Monate ab heute begrenzen
- [x] Chronologische Liste: Überfällige Aufgaben von davor hervorheben und oben anzeigen
- [x] Chronologische Liste: Zeitraum-Filter für angezeigte Aufgaben hinzufügen
- [x] "Zum Termin springen" Button verwendet jetzt occurrenceDate statt dueDate
- [x] "Erinnern"-Button bei Folgeterminen entfernt
- [x] "Auslassen"-Button verwendet jetzt occurrenceDate statt dueDate
- [x] Skipped Dates Wiederherstellung in TaskDetailDialog verifiziert (bereits implementiert)
- [x] Folgetermine-Berechnung erweitert um alle Monate zu unterstützen (nicht nur aktuellen Monat)
- [x] Chronologische Liste: 3-Monats-Standardansicht implementiert
- [x] Chronologische Liste: Überfällige Aufgaben hervorgehoben und oben angezeigt
- [x] Chronologische Liste: Zeitraum-Filter (1/3/6/12 Monate) hinzugefügt

## Kalenderansicht Grid-View Bugs (Aktuell)
- [x] "Auslassen"-Button in Kalender-Grid funktioniert nicht (trotz Erfolgsmeldung)
- [x] "Erinnern"-Button wird noch bei Folgeterminen in Kalender-Grid angezeigt
- [x] "Auslassen"-Button in Kalender-Grid verwendet jetzt occurrenceDate
- [x] "Erinnern"-Button bei Folgeterminen in Kalender-Grid entfernt

## Kalenderansicht Folgetermine Verbesserungen (Aktuell)
- [x] "Zum Termin" Button bei Folgeterminen umbenennen in "Zu aktuellem Termin"
- [x] "Zu aktuellem Termin" springt zum nächsten offenen Termin (nicht erledigt, nicht ausgelassen)
- [x] "Löschen" Button bei Folgeterminen in Kalenderansicht entfernen
- [x] "Zum Termin" Button umbenannt in "Zu aktuellem Termin" bei Folgeterminen
- [x] Funktion findNextOpenOccurrence implementiert (springt zu nächstem offenen Termin)

## "Zu aktuellem Termin" Button Bug
- [x] Button springt nicht zum nächsten offenen Termin ab heute - bleibt beim angeklickten Datum
- [x] findNextOpenOccurrence berechnet jetzt alle zukünftigen Termine ab dueDate, nicht nur im aktuellen Monat

## Shopping Kategorienverwaltung
- [ ] Backend: createCategory Mutation
- [ ] Backend: renameCategory Mutation
- [ ] Backend: deleteCategory Mutation
- [ ] Frontend: Kategorienverwaltungs-Sektion am Ende der Shopping-Seite
- [ ] UI: Kategorie erstellen Dialog
- [ ] UI: Kategorie umbenennen Dialog
- [ ] UI: Kategorie löschen mit Bestät## Shopping Kategorienverwaltung
- [x] Backend: createCategory Mutation
- [x] Backend: renameCategory Mutation
- [x] Backend: deleteCategory Mutation
- [x] Backend: listCategories Query
- [x] Datenbank-Migration erfolgreich durchgeführt
- [x] Frontend: Shopping.tsx komplett umgebaut mit dynamischen Kategorien
- [x] UI: Kategorie erstellen Dialog
- [x] UI: Kategorie umbenennen Dialog
- [x] UI: Kategorie löschen mit Bestätigung (nur wenn keine Artikel in Kategorie)
- [x] UI: Kategorienverwaltungs-Sektion am Ende der Shopping-Seite
- [x] Alle Änderungen getestet und Server läuft ohne Fehler
## Kategorie-Farben Feature
- [ ] Schema: color Feld zu shoppingCategories hinzufügen
- [ ] Datenbank-Migration: Standardfarben für bestehende Kategorien setzen
- [ ] Backend: color Parameter zu createCategory und renameCategory hinzufügen
- [ ] Frontend: Farbauswahl im Kategorie-Dialog
- [ ] Frontend: Farben in der Kategorienliste und bei Artikeln## Kategorie-Farben Feature
- [x] Schema: color Feld zu shoppingCategories hinzugefügt
- [x] Datenbank-Migration: Standardfarben für bestehende Kategorien gesetzt
- [x] Backend: color Parameter zu createCategory und renameCategory hinzugefügt
- [x] Frontend: Farbauswahl im Kategorie-Dialog mit Vorschau
- [x] Frontend: Farben in der Kategorienliste und bei Artikeln mit inline styles anzeigen
- [x] Alle Änderungen getestet und Server läuft ohne Fehler
## Bottom Navigation Bar
- [ ] BottomNav Component## Bottom Navigation Bar
- [x] BottomNav Component erstellt mit Icons und Dropdown
- [x] Reiter: Einkaufen (/shopping), Aufgaben (/tasks), Termine (/calendar), Weiteres (Dropdown)
- [x] Weiteres-Dropdown mit Projekte (/projects), Verlauf (/history), Haushalt (/members)
- [x] BottomNav zu allen 6 Seiten hinzugefügt (Shopping, Tasks, Calendar, Projects, History, Members)
- [x] Aktiven Reiter hervorheben (primary color für aktive, muted-foreground für inaktive)
- [x] Padding am unteren Rand (pb-24) hinzugefügt damit Inhalt nicht verdeckt wird
- [x] Server läuft ohne Fehler

## Shopping-Item Bearbeitung
- [x] Backend: updateShoppingItem bereits vorhanden (update Mutation)
- [x] Frontend: Edit-Button bei jedem Artikel hinzugefügt
- [x] Frontend: Edit-Dialog mit vorausgefüllten Werten erstellt
- [x] Frontend: updateMutation mit Query-Invalidierung
- [x] Server läuft ohne Fehler

## Zeitzonenproblem bei Aufgaben
- [x] Eingegebene Uhrzeit wird 1 Stunde später gespeichert (7:15 → 8:15)
- [x] Zeitkonvertierung in Task-Erstellung/Bearbeitung geprüft
- [x] Timezone-Handling korrigiert
- [x] Backend: add Mutation - Zeit wird jetzt als lokale Zeit geparst (ohne UTC-Konvertierung)
- [x] Backend: update Mutation - dueTime Parameter hinzugefügt und Zeit korrekt geparst
- [x] Frontend: TaskDetailDialog sendet dueDate und dueTime separat
- [x] Frontend: Tasks.tsx sendet bereits dueDate und dueTime separat
- [x] Server läuft ohne Fehler

## Shopping Items zu Aufgaben verknüpfen - Phase 1
- [x] Datenbank: taskId Spalte in shopping_items Tabelle vorhanden
- [x] Backend: linkItemsToTask und unlinkItemsFromTask Funktionen erstellt
- [x] Backend: tRPC Mutations für linking hinzugefügt
- [x] Frontend: Auswahl-Checkbox zu jedem Shopping-Item hinzugefügt
- [x] Frontend: "Ausgewählte Items zu Aufgabe hinzufügen" Button implementiert
- [x] Frontend: Dialog zur Aufgabenerstellung aus Items erstellt
- [x] Frontend: Einkaufswagen-Icon bei verlinkten Items anzeigen
- [x] Frontend: Sortierung - Items ohne taskId zuerst, dann Items mit taskId
- [x] Frontend: "Erledigt" Button zu jedem Item hinzugefügt
- [ ] Frontend: Verlinkte Items in TaskDetailDialog anzeigen
- [ ] Frontend: Verlinkte Items in Calendar-Ansicht anzeigen
- [ ] Frontend: Verlinkte Items in Projects-Ansicht anzeigen
- [ ] Test: Kompletter Flow (Items auswählen → Aufgabe erstellen → Icon sichtbar)
- [ ] Test: Aufgabe öffnen und verlinkte Items sehen

## Shopping Items zu Aufgaben verknüpfen - Phase 2 (Zukünftig)
- [ ] "Items verknüpfen" Checkbox zu allen Aufgaben-Erstellungsformularen hinzufügen
- [ ] Shopping-Items-Auswahl-Dialog bei Aufgabenerstellung
- [ ] Haushalts-Inventar-Verwaltung für Verleih-Feature

## Button-Text und Sichtbarkeit
- [x] Button-Text ändern von "Ausgewählte Items zu Aufgabe hinzufügen" zu "Einkauf als Aufgabe organisieren"
- [x] Sicherstellen dass Button sichtbar ist auf der Shopping-Seite

## Checkbox doppelt nutzbar und Aufgabenerstellung erweitern
- [x] Erledigt-Button entfernen - nur eine Checkbox für beide Funktionen
- [x] Checkbox-Logik: ausgewählte Items für "Einkauf abschließen" UND "Einkauf als Aufgabe organisieren"
- [x] Aufgabenerstellung: "Wiederholung aktivieren" Checkbox mit ausklappbaren Feldern hinzufügen
- [x] Aufgabenerstellung: Rotation mit benötigten Personen und ausgeschlossenen Mitgliedern
- [x] Bug Fix: UI-Aktualisierung nach Verknüpfung verbessert mit invalidate

### Aufgabenverküpfung und Detailansicht für Shopping-Items
- [x] Detailansicht-Dialog für Shopping-Items erstellen
- [x] Detailansicht: Ersteller und Erstellungsdatum anzeigen
- [x] Detailansicht: Verknüpfte Aufgaben mit Link anzeigen
- [x] Schema: "quantity" zu "details" umbenannt
- [x] Bug Fix: Einkaufswagen-Icon beim Löschen von Aufgaben automatisch aktualisieren
- [-] "Aufgabe verknüpfen" Checkbox (Backend unterstützt noch keine Aufgabenverküpfung beim Erstellen)

## Details in Einkaufsliste verbessern
- [x] Details dezent unter Item-Namen in der Einkaufsliste anzeigen
- [x] "Menge" zu "Details" im Bearbeitungs-Dialog umbenennen
- [x] Details-Feld beim Erstellen aktivieren sobald Item-Name ausgefüllt ist
- [x] Verknüpfte Aufgabe in Detailansicht anzeigen und verlinken

## Verknüpfte Aufgabe direkt öffnen
- [x] URL-Parameter für Task-ID zur Tasks-Seite hinzufügen
- [x] Tasks-Seite: Task-Detail-Dialog automatisch öffnen wenn taskId im URL-Parameter vorhanden

## Projekt- und Aufgaben-Verknüpfung in Shopping Task-Dialog
- [x] Projekt-Verknüpfung: Checkbox "Mit Projekt verknüpfen" mit ausklappbarer Projekt-Auswahl
- [x] Aufgaben-Verknüpfung: Checkbox "Aufgabe verknüpfen" mit Voraussetzungen und Folgeaufgaben
- [x] Backend-Logik: Verknüpfungen nach Task-Erstellung speichern mit addDependenciesMutation

## Shopping Task-Dialog Verbesserungen
- [x] Mehrere Verantwortliche auswählen können (Checkbox-Liste)
- [x] Neue Projekte direkt im Dialog erstellen können
- [x] Dialog scrollbar machen für lange Formulare (max-h-[90vh] overflow-y-auto)

## Inventar-Verwaltung (neue Seite)
- [ ] Datenbank-Schema: inventoryItems Tabelle mit Name, Details, Kategorie, Fotos (bis zu 5), Eigentumsverhältnisse
- [ ] Datenbank-Schema: inventoryOwnership Tabelle für Zuordnung von Items zu Usern
- [ ] Backend: tRPC-Routen für Inventar (list, add, update, delete, getById)
- [ ] Frontend: /inventory Seite mit Item-Liste und Filter
- [ ] Frontend: Item-Erstellungs-Dialog mit Foto-Upload (bis zu 5)
- [ ] Frontend: Eigentumsverhältnisse (persönlich/Haushalt) mit User-Auswahl
- [ ] Frontend: Item-Detail-Ansicht mit allen Informationen
- [ ] Frontend: Kategorien-Verwaltung (gleicher Pool wie /Shopping)
- [ ] Navigation: Link zur Inventar-Seite in BottomNav

## Inventar-Verwaltung (neue Seite)
- [x] Datenbank-Schema für Inventar erstellen (inventoryItems, inventoryOwnership)
- [x] Backend: tRPC-Routen für Inventar implementieren (inventory router)
- [x] Frontend: Inventar-Seite mit Item-Liste und Filter
- [x] Item-Erstellung mit Name, Fotos (bis 5), Details, Kategorie, Eigentum
- [x] Eigentum: Persönlich (einzelne/mehrere User) oder Haushaltseigentum
- [x] Kategorien-Verwaltung (gleicher Pool wie /Shopping)
- [x] Item-Detail-Ansicht mit Bearbeitung
- [x] Navigation: Link in BottomNav unter "Weiteres"

## Inventar Bug-Fix
- [x] Backend createInventoryItem: details-Feld wird nicht korrekt gespeichert
- [x] SQL-Query zeigt "default" statt Wert für details (behoben: details nur hinzufügen wenn vorhanden)

## Inventar-Erstellung SQL-Fehler
- [x] SQL-Query schlägt fehl trotz korrekter Parameter
- [x] Prüfe Schema-Definition und Datenbank-Struktur (Tabellen fehlten komplett)
- [x] Identifiziere Constraint-Verletzung oder Datentyp-Problem (Tabellen manuell erstellt)

## Inventar Löschen-Button Bug
- [x] Löschen-Button für Inventar-Items funktioniert nicht
- [x] Prüfe handleDeleteItem Implementierung (korrekt)
- [x] Prüfe deleteItemMutation (korrekt)
- [x] Foreign Key Constraints hinzugefügt für CASCADE DELETE

## Inventar-Navigation hinzufügen
- [x] Inventar-Link zur Home-Seite hinzufügen (Package Icon, orange)
- [x] Inventar-Link zur Sidebar hinzufügen (AppLayout navigationItems)

## Shopping-Liste Sortierung und Durchstreichung
- [x] Sortierung: unausgewählt → ausgewählt → verknüpft (ausgewählte verknüpfte zuerst)
- [x] Durchstreichung für ausgewählte Items (line-through + text-muted-foreground)
- [x] Ausgewählte Items ans Ende der unausgewählten verschieben

## Foto-Upload für Shopping-Items
- [ ] Schema erweitern: photoUrls zu shoppingItems hinzufügen
- [ ] Backend: add und update Mutations für photoUrls anpassen
- [ ] Frontend: Foto-Upload bei Item-Erstellung (bis zu 5 Fotos)
- [ ] Frontend: Foto-Upload bei Item-Bearbeitung
- [ ] Fotos in Detailansicht anzeigen

## Foto-Upload für Shopping-Items
- [x] Schema: photoUrls zu shoppingItems hinzugefügt
- [x] Backend: photoUrls zu add/update Mutations hinzugefügt
- [x] Frontend: Foto-Upload bei Item-Erstellung (bis 5 Fotos, multiple upload)
- [x] Frontend: Foto-Upload bei Item-Bearbeitung (bis 5 Fotos, multiple upload)
- [x] Fotos in Detailansicht anzeigen (klickbar für Vollbild)

## PDF-Upload bei Aufgabenabschluss und Zwischenzielen
- [ ] Schema erweitern: completionFileUrls zu tasks und milestones hinzufügen
- [ ] Backend: PDF-Upload-Unterstützung in complete-Mutations
- [ ] Tasks-Seite: PDF-Upload bei Aufgabenabschluss hinzufügen
- [ ] Calendar-Seite: PDF-Upload bei Aufgabenabschluss hinzufügen
- [ ] Projects-Seite: PDF-Upload bei Aufgaben- und Zwischenziel-Abschluss hinzufügen

## PDF-Upload bei Aufgabenabschluss und Zwischenzielen
- [x] completionPhotoUrls Feld zur tasks Tabelle hinzugefügt
- [x] completionFileUrls Feld zur tasks Tabelle hinzugefügt (bereits vorhanden)
- [x] fileUrls Feld zur activity_history Tabelle hinzugefügt
- [x] PhotoUpload Komponente erweitert um PDF-Upload zu unterstützen
- [x] CompleteTaskDialog erweitert mit PDF-Upload Feld
- [x] MilestoneDialog erweitert mit PDF-Upload Feld
- [x] Backend completeTask Mutation aktualisiert um photoUrls und fileUrls zu speichern
- [x] Backend addMilestone Mutation aktualisiert um photoUrls und fileUrls zu speichern
- [x] handleAddMilestone in Tasks.tsx aktualisiert
- [x] handleAddMilestone in Calendar.tsx aktualisiert
- [x] handleAddMilestone in Projects.tsx aktualisiert
- [x] Tests für PDF-Upload geschrieben (tasks.completion.test.ts)
- [ ] Tests ausführen und beheben (Foreign Key Constraint Problem mit bestehenden Tests)

## Bug-Fixes: PDF-Upload
- [x] PDF-Upload funktioniert nicht (nur Fotos werden akzeptiert) - useId für eindeutige Input-IDs hinzugefügt
- [x] Vorschaufelder für Fotos und PDFs nur anzeigen wenn tatsächlich Dateien hochgeladen wurden - Empty State entfernt

## PDF-Anzeige in Verlauf und Aufgabendetails
- [x] PDFs in Verlaufseinträgen auf /history Seite anzeigen
- [x] PDFs in Aufgabendetails (TaskDetailDialog) anzeigen
- [x] Download-Links für PDFs implementieren

## Originale Dateinamen bei PDF-Upload beibehalten
- [ ] Datenstruktur analysieren (wie werden URLs und Dateinamen gespeichert)
- [ ] Backend: Dateinamen-Metadaten speichern (neue Spalte oder JSON-Struktur)
- [ ] Frontend: Originale Dateinamen beim Upload mitschicken
- [ ] Frontend: Originale Dateinamen in History und TaskDetailDialog anzeigen

## Originale Dateinamen bei PDF-Upload beibehalten
- [x] Datenstruktur von String-Arrays zu Objekt-Arrays mit url und filename geändert
- [x] Backend angepasst um Dateinamen zu speichern und zurückzugeben
- [x] Frontend angepasst um Dateinamen anzuzeigen
- [x] Alle Seiten (Tasks, Projects, Calendar, Shopping, Inventory) aktualisiert
- [x] Alle TypeScript-Fehler behoben

## Einkaufsaufgaben-Verknüpfung Erweiterung
- [x] Verknüpfte Einkaufslisten-Items in TaskDetailDialog anzeigen (alle Seiten)
- [x] Backend: Endpoint zum Abrufen verknüpfter Shopping-Items für eine Aufgabe
- [x] Beim Aufgabenabschluss: Verknüpfte Items automatisch von Einkaufsliste entfernen
- [x] CompleteTaskDialog erweitern: "Ins Inventar aufnehmen?" Option für jedes Item
- [ ] Erweiterbares Inventar-Formular im Abschluss-Dialog (Kategorie, Details, Besitz, Fotos) - Für spätere Iteration
- [x] Backend: Batch-Inventar-Erstellung beim Aufgabenabschluss (mit Standardwerten)
- [ ] Test: Items werden in Aufgabendetails angezeigt - Manuell zu testen
- [ ] Test: Items verschwinden nach Abschluss von Einkaufsliste - Manuell zu testen
- [ ] Test: Inventar-Aufnahme funktioniert korrekt - Manuell zu testen

## CompleteTaskDialog Inventar-Integration Vollständig
- [x] Erweiterbares Inventar-Formular für jedes Shopping-Item (aufklappbar)
  - [x] Kategorie-Auswahl (Dropdown mit allen Inventar-Kategorien)
  - [x] Details-Feld (Textarea für zusätzliche Informationen)
  - [x] Besitz-Typ (Radio: Haushalt / Persönlich)
  - [x] Besitzer-Auswahl (Multi-Select für Haushaltsmitglieder, nur bei "Persönlich")
  - [x] Foto-Upload (PhotoUpload-Komponente)
- [x] Bulk-Aktionen
  - [x] "Alle auswählen" Button (wählt alle Shopping-Items für Inventar aus)
  - [x] "Alle abwählen" Button (entfernt alle Auswahlen)
  - [x] "Alle ins Inventar" Button (wählt alle aus UND klappt alle Formulare auf)
- [x] Inventar-Vorschau
  - [x] Zusammenfassung der zu erstellenden Inventareinträge
  - [x] Anzeige: Name, Kategorie, Besitz-Typ
  - [x] Warnung bei fehlenden Pflichtfeldern (Kategorie) - Kategorie wird mit Standardwert initialisiert
- [x] UI/UX Verbesserungen
  - [x] Aufklapp-Animation für Inventar-Formulare (ChevronDown/ChevronRight Icons)
  - [x] Visuelles Feedback für ausgewählte Items (Border, bg-muted/30)
  - [x] Validierung: Kategorie ist Pflichtfeld für Inventar-Aufnahme (Standardwert wird gesetzt)

## Validierung und Foto-Übernahme im Aufgabenabschluss
- [x] Validierung vor Abschluss
  - [x] Prüfung: Alle ausgewählten Items haben eine gültige Kategorie
  - [x] Warnung anzeigen bei fehlenden Kategorien (rote Alert-Box)
  - [x] "Abschließen"-Button deaktivieren wenn Validierung fehlschlägt
  - [x] Fehlerhafte Items in der Liste markieren (roter Border)
- [x] Foto-Übernahme von Shopping-Items
  - [x] Beim Auswählen eines Items: Vorhandene Fotos automatisch ins Inventar-Formular übernehmen
  - [x] Hinweis implizit durch Anzeige der Fotos im Formular
  - [x] Benutzer kann übernommene Fotos entfernen oder weitere hinzufügen (PhotoUpload-Komponente)

## Bug: Aufgabenabschluss mit verknüpften Shopping-Items
- [x] Backend-Schema-Validierung schlägt fehl: photoUrls erwartet Array, erhält String
- [x] Problem: Shopping-Items können altes Format (String-Array) oder neues Format (Objekt-Array) haben
- [x] Lösung: normalizePhotoUrls Funktion konvertiert beide Formate automatisch zu Objekt-Arrays

## Bug: Shopping-Seite Absturz bei Items mit Fotos
- [x] Fehler in Shopping.tsx Zeile 1456: Absturz beim Anzeigen von Items mit Fotos im Detail-Dialog
- [x] Problem: photoUrls wird als Objekt-Array erwartet, aber alte Items haben String-Arrays
- [x] Lösung: normalizePhotoUrls Funktion in Shopping.tsx implementiert und verwendet (Detail-Dialog, Edit-Dialog)

## Bugs: Einkaufsliste und Inventar-Übernahme
- [x] Fotos werden in der Einkaufsliste (Shopping-Seite) nicht angezeigt - Foto-Vorschau in Liste hinzugefügt (max. 3 Fotos + Counter)
- [x] Details von Shopping-Items können nicht bearbeitet werden - Details-Feld existiert bereits im Edit-Dialog
- [x] Fotos gehen bei der Übernahme von Shopping-Items ins Inventar verloren - Foto-Übernahme funktioniert korrekt (normalizePhotoUrls)

## Kategorieerstellung und Item-Navigation
- [ ] Kategorieerstellung im Aufgabenabschluss-Dialog
  - [ ] "+" Icon neben Kategorie-Dropdown im Inventar-Formular
  - [ ] Inline-Dialog zum Erstellen neuer Inventar-Kategorien
  - [ ] Automatische Auswahl der neu erstellten Kategorie
- [ ] Kategorieerstellung im Shopping-Item-Erstellungs-Dialog
  - [ ] "+" Icon neben Kategorie-Dropdown
  - [ ] Inline-Dialog zum Erstellen neuer Shopping-Kategorien
  - [ ] Automatische Auswahl der neu erstellten Kategorie
- [ ] Item-Link in Aufgabendetails
  - [ ] Verknüpfte Shopping-Items sind klickbar
  - [ ] Navigation zur Shopping-Seite mit Fokus auf das Item
  - [ ] Visuelles Feedback (Hover-Effekt, Cursor-Pointer)

## Kategorieerstellung und Item-Links
- [x] Kategorieerstellung im Aufgabenabschluss-Dialog (QuickCategoryCreate Komponente)
  - [x] "+" Icon neben Kategorie-Dropdown im Inventar-Formular
  - [x] Inline-Dialog zum Erstellen neuer Inventar-Kategorien mit Farbauswahl
  - [x] Automatische Auswahl der neu erstellten Kategorie
- [x] Kategorieerstellung im Shopping-Item-Erstellungs-Dialog
  - [x] "+" Icon neben Kategorie-Dropdown
  - [x] Inline-Dialog zum Erstellen neuer Shopping-Kategorien mit Farbauswahl
  - [x] Automatische Auswahl der neu erstellten Kategorie
- [x] Item-Link in Aufgabendetails zur Shopping-Seite
  - [x] Verknüpfte Shopping-Items klickbar machen (Button statt Div)
  - [x] Navigation zur Shopping-Seite beim Klick
  - [x] Hover-Effekt für bessere UX (hover:bg-muted/80)

## Bug: Foto-Anzeige in Shopping-Liste und Detail-Dialog
- [x] Shopping-Liste zeigt falsches Bild (hellgrauer Kasten mit +144 Counter) - Foto-Counter verwendet jetzt normalisierte Array-Länge
- [x] Detail-Dialog zeigt keine Fotos - normalizePhotoUrls wird korrekt verwendet
- [x] Problem: normalizePhotoUrls oder Foto-URL-Extraktion funktioniert nicht korrekt - Behoben durch Verwendung des normalisierten Arrays beim Zählen

## Probleme: Foto-Upload und Shopping-Item-Link
- [ ] Fotos werden nicht in Shopping-Liste angezeigt (weder Kasten noch Fotos)
- [ ] Fotos werden nicht in Shopping-Item-Details angezeigt
- [ ] Problem: Foto-Upload oder Foto-Speicherung funktioniert möglicherweise nicht
- [ ] Shopping-Item-Link aus Aufgabendetails soll Detail-Dialog öffnen statt nur zur Seite zu navigieren

## Inventar-Transfer Verbesserungen
- [x] Fix inventory preview in CompleteTaskDialog - zeigt aktuell falsche Daten an
- [x] Implement inventory transfer in shopping list completion dialog
- [x] Add expandable form for each item (name, details, category, photos, ownership)
- [x] Test inventory transfer from task completion
- [x] Test inventory transfer from shopping list completion

## Inventar-Liste Foto-Anzeige
- [x] Add photo thumbnails to inventory list view (similar to shopping list)
- [x] Show max 3 photos with "+X" indicator for additional photos
- [x] Use normalizePhotoUrls helper for compatibility

## Inventar Ausleihen-Feature
- [x] Database schema: borrowRequests table with status workflow
- [x] Backend: Create borrow request API (request, approve, reject, return)
- [x] Backend: Get borrow requests (by item, by user, by owner)
- [x] Frontend: "Ausleihen" button in inventory item details
- [x] Frontend: Borrow request dialog with date range picker
- [x] Frontend: Owner notification for pending requests
- [x] Frontend: Approve/reject UI in inventory item details
- [x] Frontend: Active borrows display in inventory list and details
- [ ] Calendar: Create events for borrow periods
- [ ] Calendar: Reminders for return dates
- [ ] Status tracking: pending → approved → active → completed → rejected
- [ ] Test: Request household item (auto-approve)
- [ ] Test: Request personal item (requires owner approval)
- [ ] Test: Approve/reject workflow
- [ ] Test: Return item workflow

## Ausleihvorgaben und Rückgabe-Workflow
- [x] Fix: Genehmigungsberechtigung nur für tatsächliche Eigentümer
- [x] Backend: Validierung der Eigentümerschaft bei approve/reject
- [x] Database: borrowGuidelines Tabelle (text, checklist, photo requirements)
- [x] Backend: API für Guidelines CRUD (create, read, update, delete)
- [x] Backend: Return workflow mit Checklist- und Foto-Validierung
- [x] Frontend: Guidelines Editor in Inventar-Details (Text, Checkliste, Foto-Anforderungen)
- [x] Frontend: Beispielfoto-Upload für Guidelines
- [x] Integration: Guidelines-Editor in InventoryDetail.tsx eingefügt
- [ ] Frontend: Return Dialog mit Checklist-Validierung
- [ ] Frontend: Pflicht-Fotos mit Beispielfoto-Vergleich
- [ ] Frontend: Zustandsbericht bei Rückgabe
- [ ] Test: Nur Eigentümer können genehmigen
- [ ] Test: Guidelines werden bei Ausleihe angezeigt
- [ ] Test: Return workflow mit Checklist-Validierung
- [ ] Test: Pflicht-Fotos bei Rückgabe

## Guidelines-Anzeige und Return-Dialog
- [x] Guidelines-Anzeige im BorrowRequestDialog vor der Anfrage
- [x] BorrowReturnDialog Komponente erstellen
- [x] Checklist-Validierung im Return-Dialog (alle Pflichtpunkte müssen abgehakt sein)
- [x] Foto-Upload mit Beispielfoto-Vergleich im Return-Dialog
- [x] Zustandsbericht-Textfeld im Return-Dialog
- [x] "Zurückgeben"-Button in Inventar-Details für aktive Ausleihen
- [x] Test: Return-Dialog mit Guidelines-Validierung

## Foto-Upload Bug-Fix
- [x] Fix storage.ts React Hook misuse causing stack overflow
- [x] Test photo upload in BorrowGuidelinesEditor

## Foto-Upload Verbesserungen
- [x] Prüfe BorrowReturnDialog auf storagePut Verwendung und fixe falls nötig
- [x] Füge Foto-Vorschau Thumbnails im Guidelines-Editor hinzu
- [x] Test: Foto-Upload und Vorschau in Guidelines-Editor

## Foto-Kompression
- [x] Installiere browser-image-compression Library
- [x] Erstelle wiederverwendbare Foto-Kompression Utility
- [x] Integriere Kompression in BorrowGuidelinesEditor
- [x] Integriere Kompression in BorrowReturnDialog
- [x] Integriere Kompression in alle anderen Foto-Upload Komponenten
- [x] Test: Foto-Kompression in allen Upload-Flows

## Ausleihen-Übersichtsseite
- [ ] Erstelle /borrows Seite mit Tab-Layout
- [ ] Tab "Meine Ausleihen": Zeige alle Ausleihen als Ausleiher
- [ ] Tab "Verliehene Items": Zeige alle verliehenen Items als Eigentümer
- [ ] Status-Filter: Pending, Active, Completed
- [ ] Navigation: Füge Link zu Borrows-Seite in BottomNav/Sidebar hinzu
- [ ] Test: Borrows-Seite mit verschiedenen Status

## Ausleihen-Übersichtsseite
- [x] Backend: getMyBorrows und getLentItems API-Endpunkte
- [x] Frontend: Borrows-Seite mit Tabs ("Meine Ausleihen" und "Verliehene Items")
- [x] Frontend: Status-Filter (Pending, Active, Completed)
- [x] Frontend: Klick auf Item öffnet Inventar-Details
- [x] Navigation: Link in BottomNav Dropdown hinzugefügt

## Ausleihen-Übersicht Verbesserungen
- [x] Backend: Member-Namen in getMyBorrows und getLentItems laden
- [x] Frontend: Eigentümer- und Ausleiher-Namen anzeigen statt Platzhalter
- [x] Backend: getPendingRequestsCount Query erstellen
- [x] Frontend: Badge mit Anzahl offener Anfragen im BottomNav "Weiteres"-Button

## Kalender-Integration für Ausleihen-System
- [x] Kalender-Events bei Ausleihen-Genehmigung erstellen (Start + Rückgabe)
- [x] Icon 📥 für Ausleihe-Start Events verwenden
- [x] Icon 📤 für Rückgabe-Termin Events verwenden
- [x] calendarEventId in borrowRequests Tabelle mit tatsächlichen Event-IDs verknüpfen
- [x] Events als erledigt markieren bei Rückgabe
- [x] Events löschen bei Stornierung der Ausleihe
- [x] Backend-Funktionen für Kalender-Events implementiert
- [ ] Frontend: Kalender-Ansicht mit Events erstellen (zukünftig)

## Kalender-Ansicht für Ausleihen-Events
- [x] Backend: tRPC Query für Kalender-Events nach Haushalt
- [x] Frontend: Events in Terminübersicht-Seite anzeigen
- [x] Event-Filterung nach Typ (Aufgaben, Ausleihen-Start, Rückgabe)
- [x] Farbliche Kennzeichnung nach Event-Typ (Orange für Ausleihe, Amber für Rückgabe)
- [x] Event-Detail-Dialog mit Item-Link und Rückgabe-Button
- [x] Klick auf Event öffnet Detail-Dialog
- [x] Direkter Link zum Inventar-Item aus Event-Dialog
- [x] Rückgabe-Button im Event-Dialog (nur für aktive Ausleihen)

## Rückgabe-Mutation im Event-Dialog
- [x] markReturned Mutation in Calendar.tsx hinzufügen
- [x] Event-Dialog Button mit Mutation verbinden
- [x] Nach erfolgreicher Rückgabe: Event als completed markieren (automatisch via Backend)
- [x] Kalender-Events aktualisieren nach Rückgabe

## Nachbarschafts-Netzwerk System
- [x] Datenbank-Schema: householdConnections Tabelle (Einladungen & Verbindungen)
- [x] Datenbank-Schema: sharedTasks Tabelle (haushaltsübergreifende Aufgaben)
- [x] Backend: Einladungen senden/empfangen/akzeptieren/ablehnen
- [x] Backend: Verbundene Haushalte auflisten
- [x] Backend: Mitglieder aus verbundenen Haushalten laden
- [x] Frontend: Nachbarschaft-Seite erstellen
- [x] Frontend: Einladungssystem UI (senden/empfangen)
- [x] Frontend: Liste verbundener Haushalte anzeigen
- [ ] Backend: Geteilte Aufgaben erstellen und verwalten (nächster Schritt)
- [ ] Frontend: Aufgaben-Erstellung erweitern (Haushalte auswählen)
- [ ] Frontend: Mitglieder-Auswahl erweitern (haushaltsübergreifend)
- [ ] Frontend: Geteilte Aufgaben in Task-Listen kennzeichnen
- [ ] Berechtigungen: Alle Mitglieder verbundener Haushalte können geteilte Aufgaben verwalten


## Nachbarschafts-System Bugfixes & Erweiterungen
- [x] Fix: Haushaltssuche funktioniert nicht (Backend-Query anpassen)
- [x] Aufgaben-Erstellung: "Mit Nachbarn teilen" Checkbox hinzufügen
- [x] Aufgaben-Erstellung: Verbundene Haushalte auswählen können
- [x] Mitglieder-Dropdown: Personen aus verbundenen Haushalten anzeigen
- [x] Task-Listen: Badge "Geteilt" anzeigen
- [x] Task-Details: Geteilte Haushalte auflisten


## Privatsphäre & UI-Verbesserungen für Nachbarschafts-System
- [x] Haushaltssuche: Nur Einladungscodes akzeptieren (keine Namen-Suche)
- [x] Haushaltssuche: Keine Vorschläge anzeigen (nur exakte Treffer)
- [x] Tasks-Seite: Checkbox "Haushaltsübergreifende Aufgabe" (via TaskDetailDialog)
- [x] Calendar-Seite: Checkbox "Haushaltsübergreifende Aufgabe" (via TaskDetailDialog)
- [x] Projects-Seite: Checkbox "Haushaltsübergreifende Aufgabe" bereits implementiert
- [x] TaskDetailDialog: Zentrale Komponente für alle Seiten erweitert


## Bugfixes
- [x] Projektverknüpfungen: Aufgaben werden nicht korrekt mit Projekten verknüpft (Fix: leeres Array statt undefined)
- [x] Projektverknüpfungen: Aufgaben erscheinen nicht in der Projekt-Ansicht (Fix: projectIds in getTasks SELECT)
- [x] Projektverknüpfungen: Projekt wird nicht in Aufgabendetails angezeigt (Fix: projectIds in getTasks SELECT)
- [x] Ausleih-Benachrichtigungen: Badge fehlt bei "Inventar & Ausleihen" Navigation (Fix: Badge zu Dropdown-Menüpunkten hinzugefügt)


## Inventory & Ausleih-Verbesserungen
- [x] Inventory-Seite: Dominante Badge für Items mit offenen Anfragen
- [x] Benachrichtigungen: Nur Item-Eigentümer sehen Badge für ihre Items
- [x] Backend: getPendingRequestsCount nach Eigentümer filtern
- [x] Backend: getPendingRequestsByItem Query hinzugefügt

## Haushaltsübergreifende Aufgaben UI-Erweiterung
- [x] Tasks-Seite: "Mit Nachbarn teilen" UI hinzugefügt (via TaskDetailDialog)
- [x] TaskDetailDialog: Sharing-UI in Bearbeitungs-Ansicht hinzugefügt
- [x] Backend: sharedHouseholdIds zu tasks.update Input-Schema hinzugefügt
- [x] Backend: Shared task entries werden bei Update korrekt verwaltet
- [ ] Alle Aufgabenbearbeitungs-Dialoge: Sharing-UI konsistent verfügbar


## Haushaltsübergreifende Mitgliederauswahl Bugfixes
- [x] TaskDetailDialog: Mitglieder aus verbundenen Haushalten bei "Verantwortliche" anzeigen (nicht separat)
- [x] TaskDetailDialog: Mitglieder erst nach Haushaltsauswahl anzeigen
- [x] Projects.tsx: Mitglieder erst nach Haushaltsauswahl anzeigen
- [x] Duplikat-Filterung: User, die in beiden Haushalten sind, nur einmal anzeigen
- [x] Duplikat-Filterung: Bei Duplikaten nur eigenen Haushalt anzeigen, nicht verbundenen


## Haushaltsübergreifende Aufgaben - Weitere Bugfixes
- [x] Duplikat-Filterung: Logik funktioniert nicht korrekt (Fix: userId-Vergleich statt id)
- [x] Haushalte-Auswahl: Namen werden nicht geladen (Fix: Feldnamen id/name statt householdId/householdName)
- [x] Tasks-Seite: Sharing-UI bei Aufgabenerstellung (via TaskDetailDialog bereits verfügbar)


## Tasks-Seite Aufgabenerstellung Fix
- [x] Tasks-Seite: Eigenen Aufgabenerstellungs-Dialog mit Sharing-UI implementieren
- [x] Sharing-UI: "Mit Nachbarn teilen" Checkbox hinzugefügt
- [x] Sharing-UI: Haushaltsauswahl nach Checkbox-Aktivierung anzeigen
- [x] Sharing-UI: Mitglieder aus ausgewählten Haushalten bei Verantwortliche anzeigen
- [x] Duplikat-Filterung: userId-Vergleich für Mitglieder implementiert
- [x] sharedHouseholdIds zu addMutation hinzugefügt


## Duplikat-Filterung Debugging
- [x] Untersuchen: userId-Vergleich funktioniert nicht korrekt (userId war undefined)
- [x] Prüfen: Werden userId-Felder vom Backend korrekt geladen? (NEIN - fehlte in auth.ts)
- [x] Prüfen: Filter-Logik in Tasks.tsx korrekt? (JA)
- [x] Prüfen: Filter-Logik in Projects.tsx korrekt? (JA)
- [x] Prüfen: Filter-Logik in TaskDetailDialog.tsx korrekt? (JA)
- [x] Fix: userId zu getHouseholdMembers Return-Objekt hinzugefügt
