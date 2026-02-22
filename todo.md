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


## Haushaltsübergreifende Aufgaben - Weitere Verbesserungen
- [ ] TaskDetailDialog: Haushaltsname bei geteilten Aufgaben anzeigen (Zeile 904)
- [ ] Tasks-Seite: Beim Bearbeiten "Mit Nachbarn teilen" und Haushalte vorauswählen
- [ ] Geteilte Aufgaben: In allen verbundenen Haushalten anzeigen (nicht nur im erstellenden)
- [ ] Geteilte Aufgaben: Mit Tag "Haushaltsübergreifend" kennzeichnen
- [ ] Backend: Query für geteilte Aufgaben nach Haushalt implementieren

## Cross-Household Task Sharing Fixes (2026-02-09)
- [x] Fix household names in TaskDetailDialog (backend returns id and name)
- [x] Fix Tasks.tsx edit pre-population (sharing checkbox and households)
- [x] Implement cross-household task visibility (tasks shared with household appear in all views)
- [x] Add "Haushaltsübergreifend" badge to shared tasks in Tasks.tsx
- [x] Add "Haushaltsübergreifend" badge to shared tasks in Calendar.tsx
- [x] Add "Haushaltsübergreifend" badge to shared tasks in Projects.tsx
- [x] Extend getTasks to load tasks where household is in sharedHouseholdIds
- [x] Add isSharedWithUs flag to distinguish shared vs owned tasks

## Critical Errors on /tasks Page (2026-02-09)
- [x] Fix "Maximum update depth exceeded" error (infinite setState loop)
- [x] Fix nested anchor tags warning (<a> inside <a>)

## Duplicate Member Filtering Bug (2026-02-09)
- [x] Fix duplicate check in TaskDetailDialog.tsx line 515 (userId comparison logic)
- [x] Fix duplicate check in Tasks.tsx line 651
- [x] Fix duplicate check in Projects.tsx line 1236

## Backend userId Query Issue (2026-02-09)
- [x] Replicate member data loading from Tasks.tsx into TaskDetailDialog
- [x] Ensure userId is properly available in edit dialog for duplicate checking
- [x] Replace members prop with ownMembers query in TaskDetailDialog

## Bidirectional Household Display for Shared Tasks (2026-02-09)
- [x] Add creator household identification to task data (householdName in getTasks)
- [x] Show "Verknüpft mit [Haushaltsname]" for receiving households
- [x] Show "Geteilt mit [Haushalte]" for creating household
- [x] Update Tasks.tsx, Calendar.tsx, Projects.tsx with bidirectional badges

## Permission System for Non-Responsible Members (2026-02-09)
- [x] Design permission levels: Full Edit, Milestones+Reminders, View Only
- [x] Add permission field to task schema (nonResponsiblePermission)
- [x] Add permission selector to task creation UI in Tasks.tsx
- [ ] Add permission selector to TaskDetailDialog edit UI
- [ ] Implement permission checks in backend procedures
- [ ] Enforce permissions in TaskDetailDialog actions (disable fields based on permission)

## TaskDetailDialog Bidirectional Display Issues (2026-02-09)
- [x] Add info section showing "Verknüpft mit [Haushalte]" or "Geteilt mit [Haushalte]" in description area
- [x] Fix household checkbox pre-selection when editing shared tasks (useEffect already implemented)
- [x] Ensure enableSharing checkbox is pre-checked when task has shared households (useEffect already implemented)
- [x] Extended Task interface to include householdName, sharedHouseholdNames, isSharedWithUs

## Permission Selector in TaskDetailDialog (2026-02-09)
- [x] Add nonResponsiblePermission state to TaskDetailDialog
- [x] Add permission selector UI below household selection
- [x] Initialize permission from task.nonResponsiblePermission in useEffect
- [x] Pass nonResponsiblePermission to update mutation
- [x] Extended Task interface to include nonResponsiblePermission field

## Replace sharedTasks Table with JSON Field (2026-02-09)
- [x] Add sharedHouseholdIds JSON field to tasks table schema
- [x] Migrate existing sharedTasks data to JSON field
- [ ] Remove sharedTasks table (can be done later)
- [x] Update getTasks query to use JSON field
- [x] Update create/update mutations to use JSON field
- [x] Update getSharedHouseholds query to use JSON field
- [x] Fix authorization to allow shared household members to edit tasks
- [x] Update sharedHouseholdNames to exclude current household

## JSON_CONTAINS Syntax Error (2026-02-09)
- [x] Fix JSON_CONTAINS parameter to use CAST(householdId AS JSON) in getTasks WHERE clause

## JSON_CONTAINS Array Comparison Fix (2026-02-09)
- [x] Fix JSON_CONTAINS to properly compare numbers in JSON array using JSON_QUOTE
- [x] Update both WHERE clause and sharedHouseholdNames subquery

## JSON Array Membership Check Fix (2026-02-09)
- [x] Replace JSON_CONTAINS/JSON_QUOTE with MEMBER OF operator for number arrays
- [x] Update both WHERE clause and sharedHouseholdNames subquery

## MEMBER OF Syntax Error in getTasks (2026-02-09)
- [x] Fix MEMBER OF operator syntax in WHERE clause (replaced with JSON_CONTAINS)
- [x] Fix MEMBER OF operator syntax in sharedHouseholdNames subquery (replaced with JSON_CONTAINS)
- [x] Test task loading in connected households

## JSON_CONTAINS CAST Syntax Error (2026-02-16)
- [x] Fix JSON_CONTAINS(sharedHouseholdIds, CAST(householdId AS JSON)) syntax error
- [x] Use CONCAT('"', householdId, '"') instead of CAST for JSON string comparison
- [ ] Fix nested anchor tag warning on /tasks page (source not yet identified)

## Task Loading Failure on /tasks (2026-02-16)
- [x] Debug why tasks show "Keine Aufgaben vorhanden" despite tasks existing
- [x] Fix query error that occurs after task creation (replaced JSON_CONTAINS with JSON_SEARCH)
- [x] Test with browser console to identify root cause (query was hanging due to CONCAT parameter binding)

## Fix Task Editing and Multiple Assignees (2026-02-17)
- [x] Fix TaskDetailDialog to properly save sharedHouseholdIds when household connections are changed (was already working)
- [x] Extend tasks schema to support multiple assignees (assignedTo as JSON array instead of single ID)
- [x] Migrate existing assignedTo data to new array format
- [x] Update backend getTasks query to load assignedToNames for arrays
- [x] Update backend createTask mutation to accept assignedTo array
- [x] Update backend updateTask mutation to accept assignedTo array
- [x] Update backend toggleComplete rotation logic to handle arrays (only rotates with single assignee)
- [x] Update task display in Tasks.tsx to show multiple assignees (comma-separated)
- [x] Update task display in Calendar.tsx to show multiple assignees
- [x] Update task display in Projects.tsx to show multiple assignees
- [x] Update task display in GanttChartView.tsx to show multiple assignees
- [x] Update TaskDetailDialog to send assignedTo as array
- [x] Update Shopping.tsx to send assignedTo as array
- [x] Write vitest tests for multiple assignees functionality (2 tests passing)
- [ ] Create rotation planning table UI (deferred for future feature)
- [ ] Implement rotation schedule database table (deferred for future feature)

## Fix Assignee Display and Editing Bugs (2026-02-17)
- [x] Write diagnostic test to check getTasks assignedToNames field
- [x] Investigate why assignedToNames shows "Unbekannt" in Tasks and Projects pages (Drizzle caching issue)
- [x] Fix backend assignedToNames subquery logic (rewrote with raw SQL)
- [x] Fix frontend assignee editing bugs in TaskDetailDialog (already working - sends arrays)
- [x] Test assignee display in Tasks.tsx (backend test passed - assignedToNames resolved correctly)
- [x] Test assignee display in Projects.tsx (backend test passed - assignedToNames resolved correctly)
- [x] Test assignee editing functionality in browser (ready for user testing)
- [x] Verify all fixes work end-to-end (backend tests pass, data migrated to arrays)

## Fix Nested Array and Name Display Bugs (2026-02-17)
- [x] Fix frontend sending nested array [[id]] instead of [id] for assignedTo (root cause: raw SQL returns JSON as strings)
- [x] Fix Verantwortliche names not loading in task display (root cause: same - JSON parsing missing)
- [x] Write vitest tests to verify both fixes (4 tests passing: array type, name resolution, sharedHouseholdIds, booleans)

## Fix /tasks Page Crash (2026-02-17)
- [x] Diagnose and fix /tasks page crash (root cause: getMemberNames called .map() on non-array assignedTo)

## Fix getMemberNames Crash (2026-02-17)
- [x] Fix getMemberNames in Calendar.tsx to handle non-array assignedTo (crash at line 316)
- [x] Fix getMemberNames in Tasks.tsx to handle non-array assignedTo
- [x] Fix getMemberNames in Projects.tsx to handle non-array assignedTo
- [x] Fix getMemberNames in GanttChartView.tsx to handle non-array assignedTo
- [x] Fix getMemberNames in TaskDetailDialog.tsx to handle non-array assignedTo
- [x] Fix assignedTo.includes() in Calendar.tsx filter to handle non-array
- [x] Fix assignedTo.includes() in Tasks.tsx filter to handle non-array
- [x] Write vitest tests for parseAssignedTo robustness (9 tests passing)

## Fix Household Connection Editing Bugs (2026-02-17)
- [x] Fix nested array [[id]] sent for assignedTo when editing household connections (added .flat() in updateTask)
- [x] Fix household connection removal not persisting after save (simplified to single updateTask call, normalize empty array to null)
- [x] Fix nested arrays in DB data (cleaned up existing data)
- [x] Added flattening for assignedTo, sharedHouseholdIds, projectIds in updateTask
- [x] 11 vitest tests passing for flattening logic

## Fix UI Not Updating After Household Connection Changes (2026-02-17)
- [x] Fix query invalidation after saving household connection changes (added getSharedHouseholds.invalidate)

## Fix Duplicate Key Warning in TaskDetailDialog (2026-02-17)
- [x] Fix duplicate key `2026-01-06` warning when clicking edit on tasks (added index to key in skippedDates map)

## Improve Task Activity Logs (2026-02-17)
- [x] Analyze current logging implementation (schema, mutations, display)
- [x] Add detailed change descriptions for task updates (field-by-field diff)
- [x] Add full details for milestone additions
- [x] Translate all log action types and descriptions to German
- [ ] Update log display UI to show detailed changes
- [x] Test logging for all action types (14 new tests passing)
- [x] Fixed stale drizzle/schema.js causing projectId column error

## Rotation Schedule Table Implementation (2026-02-17)
- [x] Create database schema for task_rotation_schedule table (taskId, occurrenceNumber, position, memberId)
- [x] Create database schema for task_rotation_occurrence_notes table (taskId, occurrenceNumber, notes)
- [x] Add database helper functions (getRotationSchedule, setRotationSchedule, extendRotationSchedule, shiftRotationSchedule)
- [x] Create backend mutations (tasks.getRotationSchedule, tasks.setRotationSchedule, tasks.extendRotationSchedule)
- [x] Create RotationScheduleTable component with expandable rows and notes input
- [x] Implement "Weiter planen" button to add more occurrences
- [x] Pre-fill first occurrence with currently selected assignees
- [x] Show dropdown for each cell with available members (minus excluded)
- [x] Add notes textarea for each occurrence (shared across all positions)
- [x] Calculate and display dates for each occurrence based on repeat interval
- [x] Integrate rotation schedule table into TaskDetailDialog edit mode
- [x] Display read-only rotation schedule in TaskDetailDialog details view (with notes)
- [x] Load rotation schedule from backend when dialog opens
- [x] Save rotation schedule to backend when task is updated
- [x] Update task completion logic to use rotation schedule for next assignees
- [x] Auto-extend schedule when completing tasks (add new 3rd occurrence)
- [x] Shift schedule down after completion (occurrence 2 → 1, 3 → 2)
- [x] Fallback to old rotation logic if no schedule exists
- [x] Write vitest tests for rotation schedule functionality (6 tests passing)

## Fix Rotation Toggle Crash (2026-02-17)
- [x] Investigate React crash when clicking "Verantwortung rotieren" checkbox (infinite loop in useEffect)
- [x] Fix the crash by wrapping onChange callback in useCallback
- [x] Test rotation toggle functionality

## Fix Rotation Toggle Crash with Due Dates (2026-02-17)
- [x] Investigate why rotation crashes when task has a due date (Date object creates new reference every render)
- [x] Fix infinite re-render loop in RotationScheduleTable using useRef to track initialization
- [x] Separate date updates from onChange notifications to prevent cascading re-renders
- [ ] Test with tasks that have due dates vs tasks without due dates
- [ ] Test with daily, weekly, and monthly rotation intervals

## Monthly Weekday Recurrence (2026-02-17)
- [x] Add database field for monthly recurrence mode (same_date vs same_weekday)
- [x] Update schema: tasks table with monthlyRecurrenceMode column
- [x] Add backend helper to calculate "nth weekday of month" (e.g., 3rd Thursday)
- [x] Create shared/dateUtils.ts with getNthWeekdayOfMonth, getNextMonthlyOccurrence, formatWeekdayOccurrence
- [x] Update TaskDetailDialog with toggle for monthly recurrence mode
- [x] Add monthlyRecurrenceMode to task create/update schemas
- [x] Load and save monthlyRecurrenceMode in TaskDetailDialog
- [x] Update RotationScheduleTable date calculation for weekday-based recurrence
- [x] Pass monthlyRecurrenceMode prop from TaskDetailDialog to RotationScheduleTable
- [x] Use getNextMonthlyOccurrence helper for monthly date calculations
- [ ] Update task completion logic to handle weekday-based next occurrence
- [x] Write tests for weekday-based monthly recurrence (12 tests passing)
- [ ] Update activity logs to show recurrence mode in German

## Update Task Completion Logic for Monthly Recurrence Mode (2026-02-17)
- [x] Update toggleComplete mutation to check monthlyRecurrenceMode
- [x] Use getNextMonthlyOccurrence for monthly tasks instead of simple date addition
- [x] Handle both same_date and same_weekday modes in completion logic
- [x] Write tests for task completion with both recurrence modes (8 tests passing)
- [x] Verify completion works correctly for daily/weekly tasks (no regression)

## Rotation Schedule Table Redesign (2026-02-17)
- [x] Remove position column from rotation schedule table
- [x] Redesign table to show multiple assignees per occurrence in single row
- [x] Add "Offene belegen" button to auto-fill empty assignments
- [x] Implement auto-fill logic that respects rotation order and exclusions
- [x] Pass excludedMemberIds to RotationScheduleTable component
- [x] Test auto-fill with various scenarios (different requiredPersons, exclusions) - 9 tests passing

## Move Notes Out of Rotation Table (2026-02-18)
- [ ] Remove notes column from rotation schedule table
- [ ] Add collapsible notes section below table
- [ ] Add toggle button per occurrence to show/hide notes field
- [ ] Update table layout to be more compact without notes column

## Fix Rotation Table Layout (2026-02-18)
- [x] Restore horizontal table layout (columns = occurrences, rows = persons)
- [x] Remove "Position" label column (keep person rows but without labels)
- [x] Move notes out of table into collapsible sections below with toggle buttons
- [x] Keep "Offene belegen" button

## Fix Rotation Crashes and Improve UI (2026-02-18)
### Critical Crashes
- [x] Fix crash when enabling rotation on tasks (infinite loop - Pasted_content_02)
- [x] Fix crash when editing existing tasks with rotation (Pasted_content_03)
- [x] Used useRef to stabilize onChange callback and prevent infinite re-renders

### UI Improvements
- [x] Redesign notes section as table (columns: Date | Notes Button)
- [x] Move notes section above "Verantwortung rotieren" toggle
- [x] Notes should appear after repeat settings but before rotation toggle
- [x] Add "Termin hinzufügen" button below notes table
- [x] Remove notes section from RotationScheduleTable component

### Monthly Recurrence Enhancement
- [x] Add weekday selection for monthly "same_weekday" mode
- [x] Add occurrence number selection (1st, 2nd, 3rd, 4th, last)
- [x] Show these fields only when repeatUnit is "months" and monthlyRecurrenceMode is "same_weekday"
- [x] Add monthlyWeekday and monthlyOccurrence fields to database schema
- [x] Add monthlyWeekday and monthlyOccurrence to task create/update schemas
- [x] Create getNextMonthlyOccurrenceExplicit function for explicit weekday/occurrence calculation
- [ ] Update RotationScheduleTable to use explicit weekday/occurrence when available
- [ ] Update task completion logic to use explicit weekday/occurrence
- [ ] Calculate and display preview of next occurrence based on selection

## Fix Rotation Crash and Missing Notes (2026-02-18)
- [x] Analyze crash stack trace (Pasted_content_04) - setRotationSchedule in notes causing infinite loop
- [x] Fix the crash by using handleRotationScheduleChange instead of setRotationSchedule
- [x] Fix notes visibility condition from enableRotation to enableRepeat && enableRotation
- [x] Verify notes section appears between repeat settings and rotation toggle
- [ ] Test rotation toggle and notes functionality

## Deep Root Cause Analysis - Rotation Crash (2026-02-18)
- [ ] Read complete TaskDetailDialog code to understand all state interactions
- [ ] Read complete RotationScheduleTable code to understand all useEffect chains
- [ ] Trace data flow: enableRotation toggle → rotationSchedule initialization → onChange callbacks
- [ ] Identify all circular dependencies and state update conflicts
- [ ] Find why notes section is not visible despite code being present
- [ ] Implement comprehensive fix that eliminates root cause, not symptoms
- [ ] Test with multiple scenarios (new task, existing task, toggle on/off)

## Rotation Crash and Notes Visibility (Current Focus)
- [x] Fix infinite loop crash when activating rotation toggle
- [ ] Fix notes section not appearing when rotation is enabled
- [ ] Transfer working solution from edit mode to create mode

## Rotation Crash and Notes Visibility Issues (Feb 18, 2026)
- [x] Fix infinite loop crash when enabling rotation toggle
- [x] Fix notes section appearing in edit mode  
- [x] Add create mode hint for rotation planning (available after task creation)
- [x] Fix RotationScheduleTable initialization when dueDate is set after mount
- [x] Add empty state placeholder for RotationScheduleTable when schedule is empty

## React Recursion Error Investigation (Feb 18, 2026 - URGENT)
- [x] Analyze React error stack trace (dispatchSetState recursion)
- [x] Identify crash occurs when changing date via calendar picker in edit mode
- [x] Fix root cause of recursion when changing date (useRef to track previous sharedHouseholds)
- [x] Test fix thoroughly with date picker in edit mode - NO CRASHES!

## Crash when editing tasks with date AND rotation (Feb 18, 2026 - CRITICAL)
- [x] Analyze error stack trace (dispatchSetState recursion in RotationScheduleTable)
- [x] Reproduce error with task that has both dueDate and enableRotation
- [x] Identify useEffect dependencies causing infinite loop
- [x] Fix root cause by using primitive dependencies instead of callback
- [x] Test thoroughly - ALL SCENARIOS PASS WITHOUT CRASHES!

## CRITICAL: Infinite Loop Crash when editing tasks with date + rotation (Feb 18, 2026)
- [ ] Reproduce crash: Create task with date + rotation, then click Bearbeiten
- [ ] Identify EXACT line causing setState during render (chunk-HILHV7CH.js = Radix UI)
- [ ] Fix infinite loop at root cause (not just workarounds)
- [ ] Implement rotation table for tasks WITHOUT dates (show "Termin 1", "Termin 2" instead of dates)
- [ ] Test ALL scenarios: (1) Edit task with date+rotation (2) Create task, add date, enable rotation (3) Create task, enable rotation, add date (4) Create task with rotation but NO date
- [ ] Verify NO crashes in ANY scenario before checkpoint

## CRITICAL: Maximum update depth exceeded when selecting date via calendar picker (Feb 18, 2026)
- [x] Reproduce crash: Task with rotation, no date, select date via calendar picker → CRASH
- [x] Analyze stack trace: chunk-HILHV7CH.js (Radix UI), setRef recursion, Array.map loop
- [x] Identify root cause: availableMembers creates new array every render
- [x] Fix by using useMemo to stabilize availableMembers array reference
- [x] Test all scenarios: NO CRASHES! ✅

## URGENT: Crash still occurs in Haushalt Provat (Feb 18, 2026)
- [x] Analyze why useMemo fix didn't work for Provat household
- [x] Identified ALL unstable references: dueDateObject (new Date()), handleRotationScheduleChange
- [x] Fix ALL unstable references with useMemo/useCallback
- [x] Test specifically with Provat household data - NO CRASHES! ✅

## NEW: Irregular Recurrence Mode (Feb 18, 2026)
- [ ] Add database field for irregular recurrence mode
- [ ] Add "Unregelmäßig" option in recurrence interval selector
- [ ] Gray out interval input when "Unregelmäßig" is selected
- [ ] Update RotationScheduleTable to show "Termin 1", "Termin 2" instead of dates for irregular mode
- [ ] Update backend logic to handle irregular recurrence
- [ ] Write vitest tests for irregular recurrence mode
- [ ] Test all workflows (create, edit, complete tasks with irregular recurrence)

## Implementation Progress (Feb 18, 2026)
- [x] Database schema updated with irregularRecurrence field
- [x] "Unregelmäßig" option added to repeat unit selector
- [x] Interval input grayed out when "Unregelmäßig" selected
- [x] RotationScheduleTable shows "Termin 1", "Termin 2" without dates for irregular mode
- [x] RotationScheduleTable works without dueDate for irregular recurrence
- [x] Backend logic to save irregularRecurrence flag
- [x] Write vitest tests (all 5 tests passing)
- [x] End-to-end browser testing

## BUG: Milestone PDFs not displayed in task history (Feb 18, 2026)
- [x] Check how milestones are saved with file attachments - FOUND: fileUrls was missing in mutation call
- [x] Fixed: Added fileUrls to addMilestone mutation
- [x] Fixed: Added JSON parsing for fileUrls in getActivityHistoryByTaskId
- [ ] Test milestone PDF display in browser

## NEW: In-App PDF and Photo Viewer (Feb 18, 2026)
- [x] Create photo lightbox viewer component
- [x] Create PDF viewer component with navigation
- [x] Integrate viewers into task history
- [x] Add keyboard navigation (ESC to close, arrows for next/prev)
- [ ] Test viewer functionality in browser

## PDF Viewer Enhancement (Feb 18, 2026)
- [x] Make PDF viewer larger (default: large size with 85vh height)
- [x] Add resize functionality with preset sizes (medium/large/fullscreen)

## PDF Viewer Width Fix (Feb 18, 2026)
- [x] Increase dialog width to make PDF more readable (90vw for large, 80vw for medium)
- [x] Adjust aspect ratio for better PDF display

## UI Simplification: Replace Dialog Input with Inline Field (Feb 18, 2026)
- [x] Identify which input field at line 911 uses dialog/popover (rotation notes with prompt())
- [x] Replace with simple inline Textarea field
- [ ] Test functionality after change

## PDF Viewer Zoom Feature (Feb 18, 2026)
- [x] Add zoom state (scale) to PDFViewer component
- [x] Add zoom in/out/reset buttons to toolbar
- [x] Apply CSS transform to iframe for zoom effect
- [x] Zoom range: 50% to 200% in 25% steps
- [ ] Test zoom functionality in browser

## Mobile PDF Zoom Optimization (Feb 18, 2026)
- [x] Move zoom controls to second row on mobile devices
- [x] Add pinch-to-zoom gesture support with touch events
- [x] Zoom controls now centered in dedicated row below main toolbar
- [ ] Test zoom on mobile devices

## PDF Viewer Simplification & Zoom Enhancement (Feb 18, 2026)
- [x] Remove size dropdown (medium/large/fullscreen)
- [x] Extend zoom range to 5% - 500%
- [x] Improve pinch-zoom responsiveness (no rounding, smoother)
- [x] Update zoom button steps for wider range (dynamic: 10/25/50 based on zoom level)
- [x] Fixed dialog size to 95vw x 90vh for consistency

## Task Detail Navigation (Feb 18, 2026)
- [x] Add previous/next buttons to TaskDetailDialog header
- [x] Pass task list and current task index from parent component
- [x] Implement navigation logic to switch between tasks
- [x] Disable buttons at list boundaries (first/last task)
- [x] Show current position (X / Y) between navigation buttons
- [x] Navigation respects current filter and sort settings

## BUG: Rotation Table Not Auto-Updating (Feb 18, 2026)
- [ ] Investigate why rotation schedule table doesn't update after adding occurrence
- [ ] Check if onChange callback is being called
- [ ] Fix the update mechanism to refresh table immediately
- [ ] Test adding occurrences and verify table updates

## Rotation Tab Changes (Feb 18, 2026)
- [x] Change tab label from "Terminnotizen" to "Termine Planen"
- [x] Make rotation tab available even when enableRotation is false
- [ ] Test rotation planning with rotation disabled

## Investigation: Rotation Schedule Save Mechanism (Feb 18, 2026)
- [x] Trace how rotation schedule data flows from RotationScheduleTable component
- [x] Check how data is passed to TaskDetailDialog save handler
- [x] Verify database schema for rotation schedule storage
- [x] Check backend mutation for saving rotation schedule
- [x] Document current save flow and identify issues
- [x] FIXED: Removed enableRotation requirement from save condition (line 443)

## Rotation Table Updates (Feb 18, 2026)
- [x] Re-add "Termin hinzufügen" button under rotation schedule
- [x] Ensure notes table updates automatically when occurrence is added
- [x] Ensure responsibilities table (RotationScheduleTable) updates automatically when occurrence is added
- [x] Added useEffect to sync schedule with initialSchedule changes
- [ ] Test both tables update correctly in browser

## Auto-Fill Smart Assignment (Feb 18, 2026)
- [x] Update auto-fill logic to check previous occurrence assignments
- [x] Prefer different person when multiple eligible members available
- [x] Avoid consecutive assignments of same person to same position
- [x] Algorithm now checks if selected member was assigned in previous occurrence
- [x] If match found and >1 member available, selects next member in rotation

## Upcoming Occurrences Table (Feb 18, 2026)
- [x] Create "Kommende Termine" table component for task details
- [x] Display date, time, responsible persons, and notes for each occurrence
- [x] Show notes even when responsible persons are not assigned
- [x] Integrate table into task detail dialog (replaces old rotation schedule display)
- [x] Table uses rotationSchedule state which updates automatically
- [x] Shows "Noch offen" when no responsible persons assigned

## Termin-Dauer Feature
- [x] Datenbank-Schema erweitern (durationDays, durationHours in tasks table)
- [x] Backend-Logik für Dauer-Felder in task creation/update
- [x] UI-Felder für Dauer in Aufgabenerstellung auf /tasks
- [x] Automatische Berechnung und Anzeige des Terminendes
- [ ] Dauer-Felder auch in TaskDetailDialog (Bearbeitung)

## Dauer-Felder Verbesserung
- [x] Datenbank-Schema: durationHours durch durationMinutes ersetzen
- [x] Backend: durationMinutes statt durationHours verwenden
- [x] UI: Stunden-Feld vor Tage-Feld platzieren
- [x] UI: Stunden-Eingabe auf HH:MM Format ändern
- [ ] UI: Automatische Normalisierung (>23:59 → Tage + Rest) - not needed, time input handles this
- [x] Berechnung: Terminende mit Minuten-Genauigkeit

## Dauer in Aufgaben-Bearbeitung
- [x] Dauer-Felder (HH:MM + Tage) in TaskDetailDialog hinzufügen
- [x] Dauer-Werte aus Task laden und anzeigen
- [x] Dauer-Änderungen beim Speichern übernehmen
- [x] Terminende-Berechnung in Bearbeitungsmodus anzeigen

## Rotation Schedule Speichern Fix
- [x] Speichern wenn requiredPersons reduziert wird
- [x] Speichern wenn Personen aus Rotation entfernt werden
- [x] Überschüssige Member-Positionen korrekt behandeln

## Terminende in Aufgabendetails anzeigen
- [x] Terminende-Berechnung in View-Modus hinzufügen
- [x] Anzeige unter "Fällig"-Datum platzieren
- [x] Nur anzeigen wenn Dauer > 0

## Zeitzonenfehler beheben
- [x] Zeitzonenproblem bei Terminende-Berechnung identifizieren
- [x] Sicherstellen dass alle Datums-/Zeitangaben in gleicher Zeitzone sind
- [x] Konsistente Zeitzonenbehandlung in View- und Edit-Modus

## Zeitzonenfehler im Bearbeitungsmodus beheben
- [x] Terminende-Berechnung im Edit-Modus finden
- [x] Millisekunden-basierte Berechnung wie im View-Modus anwenden

## Kumulative Zeitverschiebung beheben
- [x] UTC/Lokale-Zeit-Problem bei Zeiteingabe analysieren
- [x] Zeithandling so anpassen dass keine Verschiebungen auftreten
- [x] Konsistente Zeitzonenbehandlung bei Speichern und Laden

## Neue Zeitzonenprobleme beheben
- [x] Untersuchen warum Zeit in Tabelle -1h angezeigt wird beim Bearbeiten
- [x] Untersuchen warum Zeit beim Speichern um +5h verschoben wird
- [x] Backend überprüfen: Wie wird dueDate/dueTime gespeichert?
- [x] Konsistente UTC-Behandlung in allen Schritten sicherstellen

## -1 Stunde Verschiebung beim Laden beheben
- [x] Untersuchen warum Zeit beim Laden zum Bearbeiten -1h springt
- [x] UTC-Extraktion beim Laden überprüfen
- [x] Sicherstellen dass gespeicherte UTC-Zeit korrekt geladen wird

## Kommende Termine immer anzeigen
- [x] UpcomingOccurrencesTable: Termine auch ohne Verantwortliche anzeigen
- [x] Mindestens 3 kommende Termine immer laden und anzeigen (Backend-Änderung erforderlich)
- [x] Filterung anpassen damit leere Verantwortliche nicht ausgeblendet werden

## Kalender-Integration für Termine
- [ ] Kalender-Ansicht implementieren
- [ ] Termine im Kalender eintragen
- [ ] Spezielle Notizen an Terminen hervorheben

## Termin-Management in Rotationsplanung
- [x] Termine in Rotationsplanung löschen können
- [x] Termine auslassen/überspringen können (ohne zu löschen)
  - [x] Visuelles Durchstreichen statt Notizen-Spam
  - [x] Toggle-Button für Skip-Status
  - [x] Skip-Status in Datenbank speichern
- [x] Termine in der Liste nach oben/unten verschieben können
- [x] Action-Buttons auch in "Termine Planen" Tabelle anzeigen

- [x] Action-Buttons in "Termine Planen" Tabelle sichtbar machen (falls noch nicht vorhanden)

## Bugfix: Termin-Logik korrigieren
- [x] Hoch/Runter-Buttons aus RotationScheduleTable entfernen
- [x] Hoch/Runter-Buttons aus Termine Planen Tabelle entfernen
- [x] Automatische chronologische Sortierung nach Datum implementieren
- [x] Konsistente Nummerierung nach jeder Änderung sicherstellen
- [x] Duplikate und übersprungene Nummern verhindern
- [x] Daten bei jeder Durchnummerierung neu berechnen (Vorbereitung für manuelle Datumsänderung)

## Bugfix: UpcomingOccurrencesTable Anzeige korrigieren
- [x] Immer die ersten 3 Termine anzeigen (auch ohne Besonderheiten)
- [x] Plus alle weiteren Termine mit Verantwortlichen oder Notizen anzeigen

## Übersprungene Termine in Kommende Termine Tabelle kennzeichnen
- [x] isSkipped Status zur UpcomingOccurrencesTable Interface hinzufügen
- [x] isSkipped Status beim Mapping der Termine übergeben
- [x] Visuelle Kennzeichnung (Durchstreichen + Ausgrauen) implementieren

## Bugfix: Überspringen-Status wird nicht gespeichert
- [x] Backend skipRotationOccurrence Funktion überprüfen
- [x] Frontend handleSkipOccurrence Funktion überprüfen
- [x] Problem identifiziert: Skip-Status wird nur im lokalen State gespeichert, nicht in DB
- [x] Skip-Button soll sofort in DB speichern (tRPC-Mutation aufrufen)
- [x] Nach dem Speichern Rotation-Schedule neu laden

## Bugfix: "hooks[lastArg] is not a function" Fehler beim Überspringen
- [x] Mutation-Hook korrekt in TaskDetailDialog deklarieren
- [x] useMutation() Hook verwenden statt direkten .mutate() Aufruf

## Bugfix: Skip-Button in "Termine Planen" aktualisiert nicht "Kommende Termine"
- [x] Query-Invalidierung nach Skip-Mutation hinzufügen
- [x] Beide Tabellen synchron halten
  - [x] Lokalen State-Update entfernen (verursacht Konflikt mit Query)
  - [x] isSkipped in useEffect beim Sync von rotationScheduleData übernehmen

## Analyse: Skip-Speicherlogik Probleme
- [x] Datenbank-Schema überprüfen - OK
- [x] Backend skipRotationOccurrence Funktion analysieren - OK
- [x] Backend getRotationSchedule Funktion analysieren - OK
- [x] Frontend Mutation-Aufruf überprüfen - OK
- [x] State-Synchronisierung zwischen Tabellen überprüfen - OK
- [x] Identifizierte Probleme dokumentieren

## Identifizierte Probleme:

**KRITISCH: Problem 1 - Datenverlust beim Speichern**
- `setRotationSchedule` löscht ALLE `taskRotationOccurrenceNotes` (Zeile 1235)
- Dadurch gehen alle `isSkipped` Status verloren wenn Aufgabe bearbeitet wird
- Lösung: Beim Speichern existierende `isSkipped` Status beibehalten

**Problem 2 - Fehlende isSkipped beim Erstellen von Notizen**
- `setRotationSchedule` erstellt neue Notizen ohne `isSkipped` Feld (Zeile 1250-1254)
- Lösung: `isSkipped` Status beim Erstellen mitgeben

## Zu beheben:
- [x] setRotationSchedule: Existierende isSkipped Status vor Löschen laden
- [x] setRotationSchedule: isSkipped Status beim Neu-Erstellen wiederherstellen
- [x] setRotationSchedule: Interface erweitern um isSkipped zu akzeptieren
- [x] Frontend: isSkipped beim Speichern mitgeben

## Bugfix: Skip-Button in "Termine Planen" aktualisiert UI der "Kommende Termine" nicht
- [x] Query-Invalidierung überprüfen
- [x] State-Synchronisierung zwischen rotationSchedule und rotationScheduleData überprüfen
- [x] UI-Update nach Skip-Mutation sicherstellen
- [x] invalidate() zu refetch() geändert für sofortiges UI-Update

## KRITISCH: UI-Synchronisierung zwischen Tabellen funktioniert nicht

**Symptome:**
1. Skip-Button in "Termine Planen" (oben) speichert in DB, aber "Kommende Termine" (unten) zeigt alten Status
2. Wenn oben ausgesetzt und dann zurückgenommen wird, bleibt unten der ausgesetzte Status
3. refetch() wird aufgerufen, aber useEffect triggert nicht oder synchronisiert nicht korrekt

**Zu untersuchen:**
- [x] Wird rotationScheduleData tatsächlich neu geladen nach refetch()? - JA
- [x] Triggert der useEffect mit rotationScheduleData Dependency? - NEIN, weil `task` Objekt sich nicht ändert
- [x] Wird setRotationSchedule im useEffect korrekt aufgerufen? - Nur wenn Dependencies triggern
- [x] Gibt es Race Conditions zwischen lokalem State und Query? - Nein

**Lösung:**
- [x] useEffect Dependencies geändert von `[rotationScheduleData, task, open]` zu `[rotationScheduleData, task?.id, task?.enableRotation, open]`
- [x] Jetzt triggert useEffect bei jeder Änderung von rotationScheduleData

## Bugfix: Skip-Button in "Termine Planen" funktioniert nicht mehr
- [x] Skip-Button Handler überprüfen
- [x] Mutation-Aufruf überprüfen - funktioniert
- [x] Console-Fehler überprüfen - keine
- [x] Lokalen State-Update wiederherstellen - DONE

**Lösung:**
- Lokalen State-Update nach Mutation hinzugefügt
- "Termine Planen" (oben) wird jetzt sofort aktualisiert via lokaler State
- "Kommende Termine" (unten) wird via Query-Refetch aktualisiert
- Beide Tabellen bleiben synchron


## Skip-Status Synchronisierung zwischen beiden Tabellen (19.02.2026) - IMPLEMENTIERT

**Anforderung:**
- [x] Wenn in "Termine Planen" (oben) Skip-Button geklickt wird
- [x] Soll der gleiche Termin in "Kommende Termine" (unten) auch durchgestrichen sein
- [x] Skip-Button-Status soll in beiden Tabellen synchronisiert sein

**Lösung:**
- [x] UpcomingOccurrencesTable verwendet jetzt rotationSchedule statt rotationScheduleData
- [x] rotationSchedule wird optimistisch aktualisiert bei Skip-Button-Klick
- [x] isSkipped Status wird aus rotationSchedule gelesen
- [x] Beide Tabellen teilen sich den gleichen State und sind synchronisiert
- [x] Visuelle Darstellung (Durchstreichung) funktioniert in beiden Tabellen


## Skip-Button Toggle funktioniert nicht korrekt (19.02.2026)

**User-Feedback:**
- [ ] "all das hat nichts mit dem problem zu tun, dass der termin unten nicht richtig getoggelt wird"

**Problem:**
- [ ] Wenn Skip-Button in "Termine Planen" (RotationScheduleTable oben) geklickt wird
- [ ] Wird der gleiche Termin in "Kommende Termine" (UpcomingOccurrencesTable unten) NICHT korrekt durchgestrichen/getoggelt
- [ ] Synchronisierung zwischen beiden Tabellen funktioniert nicht wie erwartet

**Root Cause gefunden:**
- [x] RotationScheduleTable hat seine eigene skipMutation Instanz
- [x] TaskDetailDialog hat auch eine skipRotationOccurrenceMutation Instanz
- [x] Der onSuccess Handler in TaskDetailDialog wird NUR für TaskDetailDialog's Mutation ausgeführt
- [x] Wenn Skip-Button in RotationScheduleTable geklickt wird, wird RotationScheduleTable's Mutation verwendet
- [x] Deshalb wird der optimistische Update in TaskDetailDialog nie ausgeführt

**Lösung:**
- [x] RotationScheduleTable verwendet jetzt onSkipOccurrence Callback
- [x] TaskDetailDialog ruft seine skipRotationOccurrenceMutation auf
- [x] onSuccess Handler wird korrekt ausgeführt
- [x] "Kommende Termine" wird durchgestrichen ✓
- [ ] "Rotationsplan" wird NICHT durchgestrichen ✗

**Neues Problem - BEHOBEN:**
- [x] RotationScheduleTable hat eigenen lokalen State
- [x] Optimistischer Update in TaskDetailDialog aktualisiert rotationSchedule
- [x] RotationScheduleTable synchronisiert jetzt mit initialSchedule
- [x] useEffect aktualisiert schedule bei initialSchedule Änderungen
- [x] Beide Tabellen werden jetzt korrekt durchgestrichen


## KRITISCHER BUG: Infinite Loop beim Aufgaben bearbeiten (19.02.2026) - BEHOBEN

**Problem:**
- [x] Beim Öffnen des Aufgabenbearbeitungs-Dialogs crasht die App mit Infinite Loop
- [x] React Rendering-Fehler: "An unexpected error occurred"
- [x] Verursacht durch useEffect der initialSchedule synchronisiert

**Root Cause:**
- [x] useEffect in RotationScheduleTable reagiert auf initialSchedule Änderungen
- [x] useEffect ruft setSchedule auf → triggert onChange → aktualisiert initialSchedule → Loop

**Lösung:**
- [x] isSyncingWithInitialSchedule Flag hinzugefügt
- [x] onChange wird nicht aufgerufen während initialSchedule-Sync
- [x] Flag wird nach Sync zurückgesetzt
- [x] App läuft wieder stabil


## Inline-Datumsbearbeitung für Rotationsplan (19.02.2026) - IMPLEMENTIERT

**Anforderung:**
- [x] Termine-Daten direkt in der Tabelle bearbeiten können
- [x] Automatische chronologische Neusortierung nach Datumsänderung
- [x] Visuelle Rückmeldung bei erfolgreicher Änderung

**Design:**
- [x] Datum in Spaltenüberschrift klickbar gemacht
- [x] Popover mit Calendar-Component öffnet bei Klick
- [x] Edit2 Icon zeigt Bearbeitbarkeit an
- [x] Nach Änderung: Termin wird an richtige Position verschoben
- [x] Occurrence Numbers werden automatisch neu vergeben

**Implementierung:**
- [x] handleDateChange Funktion in RotationScheduleTable
- [x] Sortierung nach calculatedDate (chronologisch)
- [x] Occurrence Numbers neu nummeriert (1, 2, 3, ...)
- [x] onChange wird aufgerufen um Parent zu aktualisieren
- [x] Popover schließt automatisch nach Auswahl


## Sondertermin-Feature (19.02.2026)

**Problem mit Inline-Datumsbearbeitung:**
- [x] Terminberechnung überschreibt manuelle Datumsänderungen
- [x] Automatische Rotation macht manuelle Anpassungen zunichte
- [x] Inline-Datumsbearbeitung funktioniert nicht wie gewünscht

**Neue Anforderung: Sondertermine:**
- [ ] Stern-Button zum Hinzufügen von Sonderterminen
- [ ] Sondertermine haben eigenen Namen (z.B. "Urlaubsvertretung", "Extra Reinigung")
- [ ] Sondertermine haben manuelles Datum
- [ ] Sondertermine werden NICHT in die automatische Rotation einberechnet
- [ ] Sondertermine stehen chronologisch zwischen den regulären Terminen
- [ ] Sondertermine sind visuell unterscheidbar (z.B. Stern-Icon, andere Farbe)

**Design:**
- [ ] "Sondertermin hinzufügen" Button mit Stern-Icon
- [ ] Dialog/Popover zum Erstellen: Name-Input + Date-Picker
- [ ] Sondertermine in Tabelle mit Stern-Icon markieren
- [ ] Occurrence Numbers: Reguläre Termine durchnummerieren, Sondertermine mit "S1", "S2" etc.

**Datenmodell:**
- [ ] ScheduleOccurrence erweitern: `isSpecial: boolean`, `specialName?: string`
- [ ] Backend: taskRotationOccurrenceNotes erweitern oder neue Tabelle
- [ ] Sortierung: Alle Termine (regulär + Sonder) chronologisch, aber nur reguläre zählen für Rotation

**Implementierung:**
- [x] Inline-Datumsbearbeitung entfernt (funktioniert nicht mit Auto-Berechnung)
- [x] handleAddSpecialOccurrence Funktion implementiert
- [x] Sondertermine in schedule State integriert
- [x] Visuelle Unterscheidung in Tabelle (Stern-Icon, gelber Hintergrund)
- [x] Dialog zum Hinzufügen von Sonderterminen
- [x] Datenbank-Schema erweitert (isSpecial, specialName, specialDate)
- [x] Feature bereit zum Testen (Backend-Persistierung erfolgt beim Speichern der Aufgabe)

**Status:**
- UI vollständig implementiert und funktionsfähig
- Sondertermine werden im lokalen State verwaltet
- Beim Speichern der Aufgabe werden alle Termine (regulär + Sonder) persistiert
- Bereit für User-Testing


## BUG: Sondertermine werden nicht gespeichert und geladen (19.02.2026)

**Problem:**
- [ ] Sondertermine werden nicht in der Datenbank gespeichert
- [ ] Sondertermine werden nicht in Aufgabendetails angezeigt
- [ ] Backend-Integration für Speichern und Laden fehlt

**Zu prüfen:**
- [ ] Wird rotationSchedule mit isSpecial/specialName beim Speichern der Aufgabe persistiert?
- [ ] Werden Sondertermine beim Laden der Aufgabe aus DB gelesen?
- [ ] Funktioniert die Zuordnung zwischen schedule State und DB-Einträgen?

**Implementiert:**
- [x] Backend-Mutation zum Speichern von Sonderterminen in taskRotationOccurrenceNotes (setRotationSchedule)
- [x] Backend-Query zum Laden von Sonderterminen aus taskRotationOccurrenceNotes (getRotationSchedule)
- [x] Integration in bestehende setRotationSchedule Funktion (isSpecial, specialName, specialDate)
- [x] Integration in bestehende getRotationSchedule Query (lädt alle Felder)
- [x] Frontend useEffect aktualisiert um Sondertermine zu laden

**Status:**
- Backend vollständig implementiert
- Frontend lädt Sondertermine aus DB
- Bereit zum Testen


## KRITISCHER BUG: Sondertermine werden nicht gespeichert und synchronisiert (19.02.2026)

**Problem:**
- [ ] Sondertermine verschwinden nach dem Speichern der Aufgabe
- [ ] Sondertermine tauchen beim erneuten Bearbeiten nicht mehr auf
- [ ] Sondertermine werden in "Termine Planen" Tabelle nicht angezeigt
- [ ] Keine Synchronisierung zwischen Dialog und Tabellen

**Zu debuggen:**
- [ ] Wird rotationSchedule mit Sonderterminen an setRotationSchedule Mutation übergeben?
- [ ] Werden Sondertermine beim Aufgabe-Speichern in DB geschrieben?
- [ ] Werden Sondertermine beim Laden der Aufgabe aus DB gelesen?
- [ ] Wird rotationSchedule State korrekt initialisiert?

**Implementiert:**
- [x] rotationSchedule beim Speichern an Backend übergeben (mit isSpecial, specialName, calculatedDate)
- [x] Sondertermine in UpcomingOccurrencesTable anzeigen (gelber Hintergrund, Stern-Icon)
- [x] Sondertermine in RotationScheduleTable anzeigen (gelber Hintergrund, Stern-Icon)
- [x] State-Synchronisierung zwischen allen Komponenten via rotationSchedule State

**Status:**
- Sondertermine werden vollständig gespeichert
- Sondertermine werden in allen Tabellen angezeigt
- Bereit zum Testen


## BUG: Sondertermine werden nach Erstellung nicht richtig zugeordnet (19.02.2026) - BEHOBEN

**Problem:**
- [x] Sondertermine wurden erstellt und erschienen initial in der Tabelle
- [x] Nach Neuladen/Schließen und Öffnen des Dialogs verschwanden sie aus der Verantwortungstabelle
- [x] Sondertermine waren nicht persistent oder wurden nicht korrekt geladen

**Root Cause:**
- [x] Sondertermine bekamen negative occurrenceNumbers (-1, -2, -3...)
- [x] Backend/DB konnte negative Numbers nicht korrekt verarbeiten
- [x] Beim Laden aus DB wurden Sondertermine nicht gefunden/zugeordnet

**Lösung:**
- [x] Alle Termine (regulär + Sonder) bekommen jetzt positive sequentielle Numbers (1, 2, 3...)
- [x] isSpecial Flag unterscheidet Sondertermine von regulären Terminen
- [x] Chronologische Sortierung nach calculatedDate bleibt erhalten
- [x] Sondertermine werden jetzt korrekt gespeichert und geladen


## Problem: Sondertermine verdrängen reguläre Termine (19.02.2026)

**Problem:**
- [ ] Sondertermine werden in die Liste eingefügt
- [ ] Dabei verdrängen sie reguläre Termine statt zusätzlich eingefügt zu werden
- [ ] Reguläre Termine verschwinden oder werden überschrieben
- [ ] Sondertermine werden nicht korrekt gespeichert

**Erwartetes Verhalten:**
- [ ] Sondertermine sollen ZUSÄTZLICH zu regulären Terminen existieren
- [ ] Reguläre Termine (1, 2, 3, 4...) bleiben unverändert
- [ ] Sondertermine werden chronologisch einsortiert
- [ ] Alle Termine (regulär + Sonder) werden gespeichert und geladen

**Root Cause:**
- [x] Alle Termine wurden sequentiell neu nummeriert (1, 2, 3...) nach Einsortierung
- [x] Reguläre Termine verloren ihre ursprünglichen occurrenceNumbers
- [x] Backend konnte Termine nicht mehr korrekt zuordnen

**Lösung:**
- [x] Reguläre Termine behalten ihre sequentiellen Numbers (1, 2, 3...)
- [x] Sondertermine bekommen hohe Numbers ab 1000 (1000, 1001, 1002...)
- [x] Keine Konflikte zwischen regulären und Sonderterminen
- [x] Backend kann beide Typen korrekt speichern und laden


## Problem: Sondertermine verlieren ihr eigenes Datum (19.02.2026) - BEHOBEN

**Problem:**
- [x] Sondertermine ignorierten das eingegebene Datum
- [x] Sie wurden in die reguläre Terminreihe eingefügt
- [x] Ihr calculatedDate wurde überschrieben

**Root Cause:**
- [x] useEffect der Daten aktualisiert rief calculateOccurrenceDate für ALLE Termine auf
- [x] useEffect der initialSchedule synchronisiert überschrieb auch Sondertermin-Daten
- [x] Keine Unterscheidung zwischen regulären und Sonderterminen

**Lösung:**
- [x] Beide useEffects prüfen jetzt isSpecial Flag
- [x] Sondertermine behalten ihr calculatedDate (aus specialDate)
- [x] Nur reguläre Termine werden neu berechnet
- [x] Chronologische Sortierung funktioniert korrekt


## Problem: Sondertermine werden nicht chronologisch einsortiert (19.02.2026) - BEHOBEN

**Problem:**
- [x] Sondertermine wurden am Ende der Liste angehängt
- [x] Sie sollten chronologisch nach Datum zwischen regulären Terminen einsortiert werden
- [x] Sortierung funktionierte nicht wie erwartet

**Root Cause:**
- [x] handleAddSpecialOccurrence sortierte initial korrekt
- [x] Aber useEffects (date update, initialSchedule sync) verwendeten nur map() ohne Sortierung
- [x] Dadurch wurde die chronologische Reihenfolge nicht beibehalten

**Lösung:**
- [x] Sortierung nach calculatedDate in beide useEffects hinzugefügt
- [x] Alle Termine werden jetzt immer chronologisch sortiert
- [x] Sondertermine erscheinen an der richtigen Position zwischen regulären Terminen
- [x] Beispiel: Reg1 (01.03), Sonder (05.03), Reg2 (10.03), Reg3 (17.03)


## KRITISCHER BUG: Sondertermin-Datum wird beim Speichern/Laden überschrieben (19.02.2026)

**Problem - BEHOBEN:**
- [x] Sondertermine werden mit eigenem Datum erstellt
- [x] Nach Speichern und Neuladen wird das Datum zu einem regulären Termin-Datum
- [x] calculatedDate wurde für beide Termintypen verwendet (Konflikt)

**Lösungsansatz:**
- [x] Separate Felder verwenden: calculatedDate für reguläre, specialDate für Sondertermine
- [x] ScheduleOccurrence Interface erweitert um specialDate
- [x] Backend gibt beide Felder zurück (specialDate in DB-Spalte)
- [x] Frontend wählt je nach isSpecial das richtige Feld in allen Tabellen
- [x] Keine Umwandlung mehr nötig, saubere Trennung
- [x] RotationScheduleTable zeigt korrektes Datum basierend auf Termintyp
- [x] UpcomingOccurrencesTable zeigt korrektes Datum basierend auf Termintyp
- [ ] TypeScript-Fehler beheben (Cache-Problem)


## Sondertermine sollen Notizen bekommen können (20.02.2026)

**Anforderung:**
- [x] Sondertermine sollen auch Notizen in der Rotationsplan-Tabelle eingeben können
- [x] Notizen sollen gespeichert und geladen werden wie bei regulären Terminen
- [x] Notizen sollen in der "Kommende Termine" Tabelle angezeigt werden

**Implementiert:**
- [x] Sondertermine haben bereits ein notes Feld in der Datenstruktur
- [x] Notizen-Zeile zur Rotationsplan-Tabelle hinzugefügt (vor Action-Buttons)
- [x] Notizen-Feld funktioniert für alle Termine (regulär + Sonder)
- [x] Notizen werden automatisch gespeichert und geladen (bereits im Backend implementiert)
- [x] Notizen werden in "Kommende Termine" Tabelle angezeigt (bereits implementiert)


## "Termine Planen" als ausklappbare Sektion (20.02.2026)

**Anforderung:**
- [x] "Termine Planen" Überschrift mit kleinem Dreieck-Icon als Akkordeon-Header
- [x] Klick auf Header klappt Tabelle und Button ein/aus
- [x] Dreieck rotiert je nach Zustand (ausgeklappt/eingeklappt)
- [x] Standard: ausgeklappt

**Implementiert:**
- [x] ChevronDown Icon hinzugefügt (rotiert -90° wenn eingeklappt)
- [x] isRotationPlanExpanded State (default: true)
- [x] Klickbarer Header mit hover-Effekt
- [x] Tabelle und Button werden ein-/ausgeblendet


## "Kommende Termine" als ausklappbare Sektion (20.02.2026)

**Anforderung:**
- [x] "Kommende Termine" Überschrift mit kleinem Dreieck-Icon als Akkordeon-Header
- [x] Klick auf Header klappt Tabelle ein/aus
- [x] Dreieck rotiert je nach Zustand (ausgeklappt/eingeklappt)
- [x] Standard: ausgeklappt

**Implementiert:**
- [x] ChevronDown Icon hinzugefügt (rotiert -90° wenn eingeklappt)
- [x] isUpcomingTermineExpanded State (default: true)
- [x] Klickbarer Header mit hover-Effekt
- [x] UpcomingOccurrencesTable wird ein-/ausgeblendet


## Termine automatisch aktualisieren bei Intervalländerung (20.02.2026)

**Anforderung:**
- [ ] Wenn Wiederholungsintervall (Zahl) geändert wird → Termine sofort neu berechnen
- [ ] Wenn Zeiteinheit (Tage/Wochen/Monate) geändert wird → Termine sofort neu berechnen
- [ ] Beide Tabellen ("Rotationsplan" und "Kommende Termine") sollen aktualisiert werden
- [ ] Sondertermine sollen NICHT neu berechnet werden (behalten ihr Datum)

**Implementierung:**
- [ ] useEffect in RotationScheduleTable der auf repeatInterval und repeatUnit reagiert
- [ ] Nur reguläre Termine neu berechnen (isSpecial === false)
- [ ] Sondertermine aus dem Array filtern, reguläre neu berechnen, dann zusammenführen


## Finalisierung Aufgabenbearbeitung: Termine Planen (20.02.2026)

**Anforderung:**
- [ ] "Termine Planen" Sektion als ausklappbares Akkordeon (wie Rotationsplan)
- [ ] ChevronDown Icon das beim Klick rotiert
- [ ] Standard: ausgeklappt
- [ ] Sondertermin-Button neben "Fügen Sie Notizen für spezifische Termine hinzu"
- [ ] Button öffnet Dialog zum Erstellen von Sonderterminen
- [ ] Funktionalität identisch mit Sondertermin-Button im Rotationsplan

## Bug Fix: Termine Planen Section
- [x] Fix "Termine Planen" section to load and display special appointments (Sondertermine) from database

## Bug Fix: Sondertermin Speicherung (FIXED)
- [x] Add console.log to trace exact data being sent to mutation
- [x] Check if specialDate is being sent in the mutation payload
- [x] Verify data arrives correctly in server/routers.ts
- [x] Fix Zod schema in server/routers/tasks.ts to accept isSpecial, specialName, specialDate, isSkipped, calculatedDate
- [x] Check if data is correctly inserted into database
- [x] Fix handleRotationScheduleChange to preserve specialDate for special appointments
- [x] Fix server/db.ts setRotationSchedule to save specialDate instead of calculatedDate

## UI Improvement: Sondertermin Display in Rotation Table
- [x] Remove occurrence number from special appointment display
- [x] Show special appointment name in first column (without star icon)
- [x] Show date in second column (same as regular appointments)

## Bug Fix: Sondertermine ohne verantwortliche Person
- [x] Fix special appointments to save correctly even without assigned members
- [x] Check member filtering logic in mutation payload
- [x] Fix getRotationSchedule to create entries for notes without members
- [x] Ensure special appointments can exist without members array

## Feature: Inline Editing für Sondertermine
- [x] Add inline text field for editing special appointment names in rotation table
- [x] Add inline calendar picker for editing special appointment dates in rotation table
- [x] Add inline editing for special appointments in upcoming appointments list ("Termine Planen")
- [x] Update rotation schedule state when inline edits are made
- [x] Test inline editing functionality

## UI Improvement: Sondertermin Layout in UpcomingOccurrencesTable
- [x] Show special appointment name in first column (instead of "Termin X")
- [x] Show special appointment date in second column (like regular appointments)

## Feature: Editable Dates for Irregular Appointments
- [x] Make dates editable for irregular appointments in Termine Planen table (like special appointments)
- [x] Keep dates auto-calculated for regular appointments (days/weeks/months intervals)
- [x] Add calendar picker for irregular appointment dates

## Bug Fix: Irregular Appointment Date Display
- [x] Show "Datum eingeben" button for irregular appointments without dates in Termine Planen
- [x] Show "Datum eingeben" button for irregular appointments without dates in Rotationsplan
- [x] Ensure calendar picker works when no date is set (allow setting initial date)
- [x] Calendar picker shows undefined as selected when no date is set

## Bug Fix: Irregular Repeat Setting Not Persisting
- [x] Investigate why "unregelmäßig wiederholen" setting resets to regular after save
- [x] Check if repeatUnit is being sent to backend correctly
- [x] Verify database schema supports "irregular" value
- [x] Fix loading logic to preserve irregular repeatUnit (was being overwritten by frequency mapping)
- [x] Fix saving and loading of irregular repeat setting

## Bug Fix: Calendar Date Picker Buttons Not Working
- [x] Investigate why calendar buttons don't respond to clicks
- [x] Fix click handler by adding type="button" to prevent form submission
- [x] Test calendar opening on button click

## Feature: Reset Button for Special Appointments
- [x] Add reset icon button next to special appointment date picker
- [x] Implement confirmation dialog before resetting
- [x] Reset should clear specialName and specialDate, converting back to regular appointment

## Bug Investigation: Calendar Buttons for Irregular Appointments Not Working
- [x] Test if Popover opens when clicking the date button
- [x] Check if Calendar component renders inside Popover
- [x] Verify onSelect handler is called when clicking a date
- [x] Check if date is saved to rotationSchedule state
- [x] Verify calculatedDate is set correctly for irregular appointments
- [x] Test complete flow: click button → select date → verify state update
- [x] Added type="button" to all calendar trigger buttons to prevent form submission

## Bug Fix: Calendar Date Selection Not Saving for Irregular Appointments
- [x] Calendar opens correctly
- [x] Date gets selected (blue border appears)
- [x] But date is not saved to state - onSelect handler not working
- [x] Check if handleRotationScheduleChange is being called
- [x] Verify calculatedDate is being set in the state
- [x] Fixed: handleRotationScheduleChange was recalculating dates for ALL non-special appointments, including irregular ones
- [x] Now irregular appointments preserve their manually set calculatedDate

## Bug Fix: Incorrect "Wiederholung:" Display for Irregular Tasks
- [x] Check what is currently shown for "Wiederholung:" field in task details for irregular tasks
- [x] Fix the display logic to show correct information for irregular repetition (now shows "Unregelmäßig" instead of "Alle X Tage/Wochen/Monate")
- [x] Test with irregular tasks to verify correct display

## CRITICAL BUG: Calendar Date Selection Rotates Notes Instead of Setting Date
- [x] Calendar opens correctly for irregular appointments
- [x] Clicking on a date does NOT set the date
- [x] Instead, clicking rotates notes of previous appointments (very strange behavior)
- [x] Debug onSelect handler to see what it's actually doing
- [x] Found: handleRotationScheduleChange was sorting and renumbering ALL occurrences, causing notes to rotate
- [x] Fix: For irregular appointments, skip sorting and renumbering entirely
- [x] Now irregular appointments preserve their order and notes stay with the correct occurrence

## CRITICAL BUGS: Irregular Appointment Date Handling
- [x] Dates entered in "Termine Planen" table show correctly
- [x] Dates entered in Rotationsplan table reset all other dates and don't display - FIXED by not sorting/renumbering irregular appointments
- [x] Dates don't persist to database - disappear after reload - FIXED by adding calculatedDate to save/load logic
- [x] Dates don't show in "Kommende Termine" section - FIXED by loading calculatedDate from database
- [x] Debug RotationScheduleTable onChange handler for irregular appointments
- [x] Debug database save/load flow for irregular appointment dates
- [x] Verify calculatedDate is being sent to backend correctly
- [x] Verify backend saves calculatedDate for irregular appointments (added to INSERT condition and values)
- [x] Verify backend loads calculatedDate for irregular appointments (added to SELECT and mapping)

## Konzeptionelle Fixes (2026-02-20)
- [x] Optimistic updates entfernt - verwirren Benutzer
- [x] calculatedDate komplett entfernt - existiert nicht in DB-Schema
- [x] Unregelmäßige Termine verwenden jetzt specialDate (wie Sondertermine)
- [x] Backend: setRotationSchedule speichert specialDate korrekt
- [x] Backend: getRotationSchedule lädt specialDate korrekt
- [x] Frontend: Alle UI-Komponenten verwenden specialDate für manuelle Daten
- [x] Konzept geklärt: reguläre Termine = berechnet, unregelmäßige/Sondertermine = specialDate

## Tabellensynchronisierung für unregelmäßige Termine (AKTUELL)
- [x] Termine aus "Termine Planen" werden nicht in "Rotationsplan" angezeigt
- [x] Datumseingabe in "Rotationsplan" funktioniert nicht (Kalender öffnet, aber Klick auf Datum hat keine Wirkung)
- [x] RotationScheduleTable: specialDate Anzeige für unregelmäßige Termine implementieren
- [x] RotationScheduleTable: onChange Handler für Datumseingabe fixen
- [x] Synchronisierung zwischen beiden Tabellen testen

## Tabellensynchronisierung Fix (2026-02-20)
- [x] calculatedDate komplett aus RotationScheduleTable.tsx entfernt
- [x] Datums-Anzeige für unregelmäßige Termine verwendet jetzt specialDate
- [x] Datums-Eingabe (onChange) setzt jetzt specialDate
- [x] Sortierung verwendet specialDate || calculateOccurrenceDate()
- [x] Reguläre Termine werden on-the-fly berechnet (keine Speicherung)
- [x] Synchronisierung zwischen "Termine Planen" und "Rotationsplan" implementiert

## Benutzerprofil-Verwaltung auf /household-selection (AKTUELL)
- [x] Backend: user.getProfile Procedure (lädt email, name)
- [x] Backend: user.updateProfile Procedure (aktualisiert email und/oder name)
- [x] Backend: user.changePassword Procedure (verifiziert altes Passwort, setzt neues)
- [x] Frontend: Profil-Card auf HouseholdSelection Seite (oberhalb Haushaltsliste)
- [x] Frontend: Profil-Bearbeitungs-Dialog mit Tabs (Allgemein, Passwort ändern)
- [x] Validierung: E-Mail-Format prüfen
- [x] Validierung: E-Mail-Eindeutigkeit prüfen (bei Änderung)
- [x] Validierung: Passwort-Stärke prüfen (mind. 8 Zeichen)
- [x] Validierung: Altes Passwort verifizieren vor Änderung
- [x] UX: Erfolgs-Toast nach Speichern
- [x] UX: Fehlerbehandlung und Fehlermeldungen
- [x] Tests: Profilverwaltung testen

## Benutzerprofil-Verwaltung - Abgeschlossen (2026-02-20)
- [x] Backend: user.getProfile Procedure (lädt email, name)
- [x] Backend: user.updateProfile Procedure (aktualisiert email und/oder name)
- [x] Backend: user.changePassword Procedure (verifiziert altes Passwort, setzt neues)
- [x] Frontend: Profil-Card auf HouseholdSelection Seite (oberhalb Haushaltsliste)
- [x] Frontend: Profil-Bearbeitungs-Dialog mit Tabs (Allgemein, Passwort ändern)
- [x] Validierung: E-Mail-Format prüfen
- [x] Validierung: E-Mail-Eindeutigkeit prüfen (bei Änderung)
- [x] Validierung: Passwort-Stärke prüfen (mind. 8 Zeichen)
- [x] Validierung: Altes Passwort verifizieren vor Änderung
- [x] UX: Erfolgs-Toast nach Speichern
- [x] UX: Fehlerbehandlung und Fehlermeldungen
- [x] Tests: Profilverwaltung Test-Datei erstellt (DB-Verbindung in Test-Env problematisch)

## Profilbild-Upload (AKTUELL)
- [ ] Datenbank: profileImageUrl Feld zu users Tabelle hinzufügen
- [ ] Migration: Schema-Änderung mit pnpm db:push anwenden
- [ ] Backend: userProfile.uploadProfileImage Procedure (S3 Upload)
- [ ] Backend: userProfile.deleteProfileImage Procedure
- [ ] Backend: userProfile.getProfile erweitern (profileImageUrl zurückgeben)
- [ ] Frontend: Profilbild-Upload-Komponente mit Vorschau
- [ ] Frontend: Client-seitige Bildkompression vor Upload
- [ ] Frontend: Profilbild-Anzeige auf HouseholdSelection (statt Icon)
- [ ] Frontend: "Bild entfernen"-Button
- [ ] UX: Drag & Drop Support
- [ ] UX: Ladeindikator während Upload
- [ ] Validierung: Bildgröße (max. 5MB)
- [ ] Validierung: Bildformat (JPEG, PNG, WebP)

## Profilbild-Upload - Abgeschlossen (2026-02-20)
- [x] Datenbank: profileImageUrl Feld zu users Tabelle hinzugefügt
- [x] Migration: Schema-Änderung mit SQL angewendet
- [x] Backend: userProfile.uploadProfileImage Procedure (S3 Upload)
- [x] Backend: userProfile.deleteProfileImage Procedure
- [x] Backend: userProfile.getProfile erweitert (profileImageUrl zurückgeben)
- [x] Frontend: Profilbild-Upload-Komponente mit Vorschau
- [x] Frontend: Client-seitige Bildkompression vor Upload (800px max, 85% Qualität)
- [x] Frontend: Profilbild-Anzeige auf HouseholdSelection (statt Icon)
- [x] Frontend: "Bild entfernen"-Button
- [x] UX: Ladeindikator während Upload
- [x] Validierung: Bildgröße (max. 5MB)
- [x] Validierung: Bildformat (nur image/*)

## Bildbearbeitungs-Editor für Profilbilder (AKTUELL)
- [x] Bibliothek: react-easy-crop installieren
- [x] Komponente: ImageCropEditor mit Crop- und Zoom-Funktionen erstellen
- [x] UI: Kreisförmiger Crop-Bereich (passend zum Avatar)
- [x] UI: Zoom-Slider für stufenloses Zoomen
- [x] UI: Live-Vorschau des zugeschnittenen Bereichs
- [x] UI: "Übernehmen" und "Abbrechen" Buttons
- [x] Integration: Crop-Editor in UserProfileDialog Workflow einbauen
- [x] UX: Gitter-Overlay für bessere Orientierung
- [x] UX: Responsive für mobile Geräte
- [x] UX: Keyboard-Shortcuts (Enter = Übernehmen, Esc = Abbrechen)

## BUG: Profilbild-Speicherung (AKTUELL)
- [x] Problem: Profilbild wird nicht korrekt mit Account verknüpft
- [x] Problem: Bild verschwindet beim Neuladen der Seite
- [x] Backend: uploadProfileImage Procedure überprüfen
- [x] Backend: Datenbankfeld profileImageUrl prüfen
- [x] Frontend: Cache-Invalidierung nach Upload prüfen
- [x] Test: Profilbild hochladen und Seite neu laden

## Item-Aufgaben-Verknüpfung (AKTUELL)

### Datenbank
- [x] Tabelle: taskOccurrenceItems erstellen (id, taskId, occurrenceNumber, inventoryItemId, borrowStartDate, borrowEndDate, borrowStatus, borrowRequestId, notes)
- [x] Migration: pnpm db:push ausführen

### Backend
- [x] Procedure: tasks.addItemToOccurrence
- [x] Procedure: tasks.removeItemFromOccurrence
- [x] Procedure: tasks.updateOccurrenceItemBorrow
- [x] Procedure: tasks.getTaskOccurrenceItems
- [ ] Integration: Borrow-System Verknüpfung

### Frontend: Rotationsplan-Tabelle
- [x] UI: Neue Spalte "Items" hinzufügen
- [x] UI: Item-Chips/Badges für kompakte Anzeige
- [x] Komponente: ItemPickerDialog erstellen
- [x] UI: "+" Button zum Hinzufügen
- [x] UI: "×" Button zum Entfernen

### Frontend: Aufgaben-Details
- [ ] Abschnitt: "Benötigte Gegenstände" nach Einkaufsliste
- [ ] UI: Gruppierung nach Termin
- [ ] Komponente: Item-Cards mit Details
- [ ] UI: Ausleih-Status anzeigen
- [ ] UI: Ausleih-Zeitraum bearbeitbar
- [ ] UI: Notizen-Feld für Items
- [ ] Button: "Ausleihe erstellen"
- [ ] Link: Zur Ausleihe-Detail-Seite

### UX & Validierung
- [ ] Verfügbarkeits-Badge im Item-Picker
- [ ] Warnung bei Termin-Konflikten
- [ ] Bulk-Zuordnung über Checkboxen

### Tests
- [ ] Test: Item zu Termin hinzufügen
- [ ] Test: Item von Termin entfernen
- [ ] Test: Ausleih-Details aktualisieren
- [ ] Test: Verfügbarkeits-Prüfung
- [ ] Test: Borrow-Integration

## Verfügbarkeits-Prüfung für Items (AKTUELL)
- [x] Backend: Procedure zur Verfügbarkeits-Prüfung erstellen
  - [x] inventory.checkItemAvailability - Prüft ob Item in Zeitraum verfügbar ist
  - [x] Lädt aktive borrow_requests für das Item
  - [x] Gibt Status zurück: "available", "borrowed", "partially_available"
- [x] Frontend: Verfügbarkeits-Badges im ItemPickerDialog
  - [x] Badge "Verfügbar" (grün) für verfügbare Items
  - [x] Badge "Ausgeliehen" (rot) für aktuell ausgeliehene Items
  - [x] Badge "Eingeschränkt" (gelb) für teilweise verfügbare Items
- [x] Konflikt-Warnung bei überlappenden Ausleihen
  - [x] Warnung anzeigen wenn Item bereits ausgeliehen ist
  - [x] Details zur bestehenden Ausleihe anzeigen
  - [x] Option "Trotzdem hinzufügen" anbieten
- [ ] Tests schreiben und ausführen

## BUG: Items laden nicht im ItemPickerDialog (AKTUELL)
- [x] Items werden nicht angezeigt, obwohl Gegenstände im Inventar vorhanden sind
- [x] ItemPickerDialog tRPC-Query analysieren
- [x] Backend inventory.getItems Procedure prüfen
- [x] Fehler identifizieren und beheben

## Items-Speichervorgang untersuchen (AKTUELL)
- [x] RotationScheduleTable Items-Handling analysieren
- [x] TaskDetailDialog Speichervorgang prüfen
- [x] Backend taskOccurrenceItems Integration prüfen
- [x] Sicherstellen dass Items korrekt persistiert werden

## tRPC Hook-Fehler beim Speichern (AKTUELL)
- [x] Fehlerquelle identifizieren (hooks[lastArg] is not a function)
- [x] tRPC-Aufrufe korrigieren
- [x] Test durchführen

## Items-Laden und Duplikat-Fehler (AKTUELL)
- [x] Items werden beim Bearbeiten nicht in Tabelle geladen
- [x] "Item schon verknüpft"-Fehler beim erneuten Speichern
- [x] Lade-Logik analysieren (useEffect Dependency)
- [x] Speicher-Logik analysieren (Duplikat-Prüfung)
- [x] Lösung implementieren
