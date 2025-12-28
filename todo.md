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
