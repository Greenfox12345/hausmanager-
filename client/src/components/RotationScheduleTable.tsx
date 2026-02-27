import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Wand2, Trash2, SkipForward, ArrowUp, ArrowDown, Star, Plus, X, Package } from "lucide-react";
import { ItemPickerDialog } from "./ItemPickerDialog";
import { Badge } from "@/components/ui/badge";
import { addDays, addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { getNextMonthlyOccurrence, getNextMonthlyOccurrenceExplicit } from "../../../shared/dateUtils";

interface Member {
  memberId: number;
  memberName: string;
}

interface RotationScheduleTableProps {
  taskId?: number; // Optional: if provided, skip will save to DB immediately
  householdId: number; // Required for loading inventory items
  requiredPersons: number;
  availableMembers: Member[];
  currentAssignees: number[];
  repeatInterval: number;
  repeatUnit: "days" | "weeks" | "months" | "irregular";
  monthlyRecurrenceMode?: "same_date" | "same_weekday";
  monthlyWeekday?: number; // 0-6 (Sunday-Saturday)
  monthlyOccurrence?: number; // 1-5 (1st, 2nd, 3rd, 4th, last)
  dueDate?: Date | null;
  onChange: (schedule: ScheduleOccurrence[]) => void;
  initialSchedule?: ScheduleOccurrence[];
  excludedMemberIds?: number[];
  onSkipOccurrence?: (occurrenceNumber: number, isSkipped: boolean) => Promise<void>;
}

export interface ScheduleOccurrence {
  occurrenceNumber: number;
  members: { position: number; memberId: number }[];
  notes?: string;
  date?: Date; // Calculated date for regular recurring occurrences
  specialDate?: Date; // For irregular appointments and special occurrences (manually set)
  isSkipped?: boolean;
  isSpecial?: boolean;
  specialName?: string;
  items?: { itemId: number; itemName: string }[]; // Inventory items needed for this occurrence
}

export function RotationScheduleTable({
  taskId,
  householdId,
  requiredPersons,
  availableMembers,
  currentAssignees,
  repeatInterval,
  repeatUnit,
  monthlyRecurrenceMode = "same_date",
  monthlyWeekday,
  monthlyOccurrence,
  dueDate,
  onChange,
  initialSchedule,
  excludedMemberIds = [],
  onSkipOccurrence,
}: RotationScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleOccurrence[]>([]);
  const [isAddingSpecialOccurrence, setIsAddingSpecialOccurrence] = useState(false);
  const [specialOccurrenceName, setSpecialOccurrenceName] = useState("");
  const [specialOccurrenceDate, setSpecialOccurrenceDate] = useState<Date | undefined>(undefined);
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [selectedOccurrenceForItem, setSelectedOccurrenceForItem] = useState<number | null>(null);
  const isInitialized = useRef(false);
  const isUpdatingDates = useRef(false);
  const isSyncingWithInitialSchedule = useRef(false);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Listen for custom event to open special appointment dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setIsAddingSpecialOccurrence(true);
    };
    window.addEventListener('openSpecialAppointmentDialog', handleOpenDialog);
    return () => window.removeEventListener('openSpecialAppointmentDialog', handleOpenDialog);
  }, []);
  
  // Filter out excluded members
  const eligibleMembers = availableMembers.filter(m => !excludedMemberIds.includes(m.memberId));
  
  // Calculate date for an occurrence (memoized to prevent recalculation)
  const calculateOccurrenceDate = useCallback((occurrenceNumber: number): Date | undefined => {
    // For irregular recurrence, don't calculate dates
    if (repeatUnit === "irregular") return undefined;
    
    if (!dueDate) return undefined;
    
    if (repeatUnit === "months") {
      // First occurrence always uses exact due date
      if (occurrenceNumber === 1) {
        return dueDate;
      }
      
      // Use explicit weekday/occurrence if provided, otherwise derive from dueDate
      if (monthlyRecurrenceMode === "same_weekday" && monthlyWeekday !== undefined && monthlyOccurrence !== undefined) {
        return getNextMonthlyOccurrenceExplicit(dueDate, repeatInterval * (occurrenceNumber - 1), monthlyWeekday, monthlyOccurrence);
      } else {
        return getNextMonthlyOccurrence(dueDate, repeatInterval * (occurrenceNumber - 1), monthlyRecurrenceMode);
      }
    } else {
      // For days/weeks, use simple addition
      const addFunction = repeatUnit === "days" ? addDays : addWeeks;
      return addFunction(dueDate, repeatInterval * (occurrenceNumber - 1));
    }
  }, [dueDate, repeatInterval, repeatUnit, monthlyRecurrenceMode, monthlyWeekday, monthlyOccurrence]);

  // Initialize schedule when component mounts OR when dueDate becomes available
  useEffect(() => {
    // Only initialize if we haven't yet
    if (isInitialized.current) return;
    
    // Don't initialize without a valid dueDate (can't calculate occurrence dates)
    // EXCEPT for irregular recurrence which doesn't need dates
    if (!dueDate && repeatUnit !== "irregular") return;
    
    if (initialSchedule && initialSchedule.length > 0) {
      // Use provided initial schedule (dates are either in specialDate or calculated on-the-fly)
      setSchedule(initialSchedule);
      isInitialized.current = true;
    } else {
      // Create default 3 occurrences
      const defaultSchedule: ScheduleOccurrence[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const members: { position: number; memberId: number }[] = [];
        
        for (let pos = 1; pos <= requiredPersons; pos++) {
          // Pre-fill first occurrence with current assignees
          if (i === 1 && currentAssignees.length >= pos) {
            members.push({ position: pos, memberId: currentAssignees[pos - 1] });
          } else {
            // Leave empty (0 = unassigned)
            members.push({ position: pos, memberId: 0 });
          }
        }
        
        defaultSchedule.push({
          occurrenceNumber: i,
          members,
          notes: "",
        });
      }
      
      setSchedule(defaultSchedule);
      isInitialized.current = true;
    }
  }, [dueDate, initialSchedule, requiredPersons, currentAssignees, repeatInterval, repeatUnit, monthlyRecurrenceMode]); // Re-run when dueDate is set

  // Sync schedule with initialSchedule changes (e.g., when parent adds new occurrence or updates skip status)
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!initialSchedule) return;
    
    // Set flag to prevent onChange during sync
    isSyncingWithInitialSchedule.current = true;
    
    // Sync with initialSchedule: update length, isSkipped, and other properties
    // Sort by date to maintain chronological order
    const sorted = initialSchedule.slice().sort((a, b) => {
      // For irregular/special: use specialDate, for regular: calculate on-the-fly
      const dateA = a.specialDate || calculateOccurrenceDate(a.occurrenceNumber);
      const dateB = b.specialDate || calculateOccurrenceDate(b.occurrenceNumber);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    
    setSchedule(sorted);
    
    // Reset flag after sync
    setTimeout(() => {
      isSyncingWithInitialSchedule.current = false;
    }, 0);
  }, [initialSchedule, calculateOccurrenceDate]);

  // Update dates when relevant props change (but don't trigger onChange)
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!dueDate) return;
    
    // For regular appointments, dates are calculated on-the-fly, no need to update schedule
    // For irregular/special appointments, dates are in specialDate and don't change with these props
    // This effect is now a no-op but kept for potential future use
  }, [dueDate, repeatInterval, repeatUnit, monthlyRecurrenceMode, monthlyWeekday, monthlyOccurrence]);

  // Notify parent when schedule changes (but not during date updates, initial mount, or initialSchedule sync)
  useEffect(() => {
    if (!isInitialized.current || isUpdatingDates.current || isSyncingWithInitialSchedule.current) return;
    // Only notify if schedule actually has content (prevent notification on initial empty state)
    if (schedule.length > 0) {
      onChangeRef.current(schedule);
    }
  }, [schedule]);

  const handleDeleteOccurrence = (occurrenceNumber: number) => {
    setSchedule(prev => {
      // Filter out the occurrence and renumber
      const filtered = prev.filter(occ => occ.occurrenceNumber !== occurrenceNumber);
      const renumbered = filtered.map((occ, index) => ({
        ...occ,
        occurrenceNumber: index + 1,
      }));
      onChangeRef.current(renumbered);
      return renumbered;
    });
  };

  const handleSkipOccurrence = async (occurrenceNumber: number) => {
    // Find current skip status to toggle it
    const currentOcc = schedule.find(occ => occ.occurrenceNumber === occurrenceNumber);
    const newSkipStatus = !currentOcc?.isSkipped;
    
    // If onSkipOccurrence callback is provided, use it (for saved tasks)
    if (onSkipOccurrence) {
      try {
        await onSkipOccurrence(occurrenceNumber, newSkipStatus);
        // Update local state to reflect the change
        setSchedule(prev => {
          const updated = prev.map(occ => {
            if (occ.occurrenceNumber !== occurrenceNumber) return occ;
            return {
              ...occ,
              isSkipped: newSkipStatus,
            };
          });
          onChangeRef.current(updated);
          return updated;
        });
      } catch (error) {
        console.error('Failed to skip occurrence:', error);
      }
    } else {
      // No callback: just update local state (for task creation)
      setSchedule(prev => {
        const updated = prev.map(occ => {
          if (occ.occurrenceNumber !== occurrenceNumber) return occ;
          return {
            ...occ,
            isSkipped: newSkipStatus,
          };
        });
        onChangeRef.current(updated);
        return updated;
      });
    }
  };

  const handleAddSpecialOccurrence = () => {
    if (!specialOccurrenceName || !specialOccurrenceDate) return;
    
    setSchedule(prev => {
      // Create the special occurrence
      const specialOcc: ScheduleOccurrence = {
        occurrenceNumber: -1, // Temporary, will be renumbered
        members: Array.from({ length: requiredPersons }, (_, i) => ({
          position: i + 1,
          memberId: 0, // Unassigned
        })),
        specialDate: specialOccurrenceDate, // Use specialDate for special occurrences
        isSpecial: true,
        specialName: specialOccurrenceName,
      };
      
      // Add to schedule
      const withSpecial = [...prev, specialOcc];
      
      // Sort by date (chronologically)
      const sorted = withSpecial.sort((a, b) => {
        const dateA = a.specialDate || calculateOccurrenceDate(a.occurrenceNumber);
        const dateB = b.specialDate || calculateOccurrenceDate(b.occurrenceNumber);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      
      // Renumber: Regular occurrences keep their sequence (1, 2, 3...)
      // Special occurrences get high numbers starting from 1000 to avoid conflicts
      let regularCount = 1;
      let specialCount = 1000;
      const renumbered = sorted.map(occ => {
        if (occ.isSpecial) {
          // Special occurrences get numbers starting from 1000
          return { ...occ, occurrenceNumber: specialCount++ };
        } else {
          // Regular occurrences get sequential numbers 1, 2, 3...
          return { ...occ, occurrenceNumber: regularCount++ };
        }
      });
      
      onChangeRef.current(renumbered);
      return renumbered;
    });
    
    // Reset dialog
    setIsAddingSpecialOccurrence(false);
    setSpecialOccurrenceName("");
    setSpecialOccurrenceDate(undefined);
  };

  const handleMoveOccurrence = (occurrenceNumber: number, direction: 'up' | 'down') => {
    setSchedule(prev => {
      const currentIndex = prev.findIndex(occ => occ.occurrenceNumber === occurrenceNumber);
      if (currentIndex === -1) return prev;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;

      // Create a copy and swap
      const updated = [...prev];
      const temp = updated[currentIndex];
      updated[currentIndex] = updated[swapIndex];
      updated[swapIndex] = temp;

      // Renumber all occurrences (dates are either in specialDate or calculated on-the-fly)
      const renumbered = updated.map((occ, index) => ({
        ...occ,
        occurrenceNumber: index + 1,
      }));

      onChangeRef.current(renumbered);
      return renumbered;
    });
  };

  const handleMemberChange = (occurrenceNumber: number, position: number, memberId: number) => {
    setSchedule(prev => {
      const updated = prev.map(occ => {
        if (occ.occurrenceNumber !== occurrenceNumber) return occ;
        
        // Ensure members array has all positions
        const existingMember = occ.members.find(m => m.position === position);
        let updatedMembers;
        
        if (existingMember) {
          // Update existing member
          updatedMembers = occ.members.map(m =>
            m.position === position ? { ...m, memberId } : m
          );
        } else {
          // Add new member if position doesn't exist
          updatedMembers = [...occ.members, { position, memberId }];
        }
        
        return {
          ...occ,
          members: updatedMembers,
        };
      });
      // Immediately notify parent of the change
      onChangeRef.current(updated);
      return updated;
    });
  };



  const handleAutoFill = () => {
    if (eligibleMembers.length === 0) return;
    
    setSchedule(prev => {
      const newSchedule = [...prev];
      let memberIndex = 0;
      
      // For each occurrence
      for (let occIdx = 0; occIdx < newSchedule.length; occIdx++) {
        const occ = newSchedule[occIdx];
        
        // Track members already assigned in THIS occurrence to avoid duplicates
        const assignedInThisOcc = new Set<number>();
        occ.members.forEach(m => {
          if (m.memberId !== 0) assignedInThisOcc.add(m.memberId);
        });
        
        // For each position (use requiredPersons, not occ.members.length)
        for (let position = 1; position <= requiredPersons; position++) {
          const memberIdx = occ.members.findIndex(m => m.position === position);
          const member = memberIdx >= 0 ? occ.members[memberIdx] : null;
          
          // Only fill if currently unassigned (memberId === 0) or doesn't exist
          if (!member || member.memberId === 0) {
            // Get previous occurrence's member at this position (if exists)
            const prevOccMember = occIdx > 0 
              ? newSchedule[occIdx - 1].members.find(m => m.position === position)
              : null;
            const prevOccMemberId = prevOccMember?.memberId || null;
            
            // Find a member that is not already assigned in this occurrence
            let selectedMember = null;
            let attempts = 0;
            
            while (attempts < eligibleMembers.length) {
              const candidate = eligibleMembers[(memberIndex + attempts) % eligibleMembers.length];
              
              // Check if this candidate is already assigned in this occurrence
              if (!assignedInThisOcc.has(candidate.memberId)) {
                // Also try to avoid consecutive assignments if possible
                if (eligibleMembers.length > 1 && prevOccMemberId && candidate.memberId === prevOccMemberId) {
                  // Try to find a different member if available
                  attempts++;
                  continue;
                }
                selectedMember = candidate;
                break;
              }
              attempts++;
            }
            
            // If we couldn't find a member (all are assigned), take any available one
            if (!selectedMember) {
              selectedMember = eligibleMembers[memberIndex % eligibleMembers.length];
            }
            
            // Mark this member as assigned in this occurrence
            assignedInThisOcc.add(selectedMember.memberId);
            
            if (member) {
              // Update existing member
              occ.members[memberIdx] = {
                ...member,
                memberId: selectedMember.memberId,
              };
            } else {
              // Add new member
              occ.members.push({
                position,
                memberId: selectedMember.memberId,
              });
            }
            memberIndex++;
          }
        }
      }
      
      // Immediately notify parent of the change
      onChangeRef.current(newSchedule);
      return newSchedule;
    });
  };

  // Show placeholder if schedule is empty
  if (schedule.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>
            {repeatUnit === "irregular" 
              ? "Die Rotationsplanung wird geladen..."
              : "Setzen Sie ein Startdatum (Erster Termin) um die Terminplanung zu starten"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Planen Sie die Rotation für kommende Termine</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSpecialOccurrence(true)}
            className="gap-2"
          >
            <Star className="h-4 w-4" />
            Sondertermin
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoFill}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Offene belegen
          </Button>
        </div>
      </div>

      {/* Table - Horizontal Layout (Columns = Occurrences, Rows = Persons) */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {schedule.map((occ) => (
                <th key={occ.occurrenceNumber} className={`p-2 text-center text-sm font-medium ${occ.isSkipped ? 'opacity-50' : ''} ${occ.isSpecial ? 'bg-yellow-50 dark:bg-yellow-950' : ''}`}>
                  <div className="flex flex-col gap-1">
                    {occ.isSpecial ? (
                      // Special appointments: Editable name and date
                      <>
                        <Input
                          value={occ.specialName || ""}
                          onChange={(e) => {
                            const newSchedule = schedule.map(o =>
                              o.occurrenceNumber === occ.occurrenceNumber
                                ? { ...o, specialName: e.target.value }
                                : o
                            );
                            setSchedule(newSchedule);
                            onChange(newSchedule);
                          }}
                          className="h-7 text-sm text-yellow-600 dark:text-yellow-500 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-yellow-500 px-1 text-center"
                          placeholder="Sondertermin-Name"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className={`h-6 text-xs font-normal text-muted-foreground hover:bg-yellow-100 dark:hover:bg-yellow-950 px-1 ${occ.isSkipped ? 'line-through' : ''}`}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {occ.specialDate ? format(occ.specialDate, "dd.MM.yyyy", { locale: de }) : "Datum wählen"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={occ.specialDate}
                              onSelect={(date) => {
                                if (date) {
                                  const newSchedule = schedule.map(o =>
                                    o.occurrenceNumber === occ.occurrenceNumber
                                      ? { ...o, specialDate: date }
                                      : o
                                  );
                                  setSchedule(newSchedule);
                                  onChange(newSchedule);
                                }
                              }}
                              locale={de}
                            />
                          </PopoverContent>
                        </Popover>
                      </>
                    ) : repeatUnit === 'irregular' ? (
                      // Irregular appointments: "Termin X" with editable date
                      <>
                        <span className={occ.isSkipped ? 'line-through' : ''}>
                          Termin {occ.occurrenceNumber}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className={`h-6 text-xs font-normal px-1 ${
                                occ.specialDate
                                  ? 'hover:bg-accent text-muted-foreground'
                                  : 'hover:bg-accent text-muted-foreground italic'
                              } ${occ.isSkipped ? 'line-through' : ''}`}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {occ.specialDate ? format(occ.specialDate, "dd.MM.yyyy", { locale: de }) : "Datum eingeben"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={occ.specialDate}
                              onSelect={(date) => {
                                if (date) {
                                  const newSchedule = schedule.map(o =>
                                    o.occurrenceNumber === occ.occurrenceNumber
                                      ? { ...o, specialDate: date }
                                      : o
                                  );
                                  setSchedule(newSchedule);
                                  onChange(newSchedule);
                                }
                              }}
                              locale={de}
                            />
                          </PopoverContent>
                        </Popover>
                      </>
                    ) : (
                      // Regular appointments: "Termin X" with auto-calculated date
                      <>
                        <span className={occ.isSkipped ? 'line-through' : ''}>
                          Termin {occ.occurrenceNumber}
                        </span>
                        {calculateOccurrenceDate(occ.occurrenceNumber) && (
                          <span className={`text-xs font-normal text-muted-foreground ${occ.isSkipped ? 'line-through' : ''}`}>
                            {format(calculateOccurrenceDate(occ.occurrenceNumber)!, "dd.MM.yyyy", { locale: de })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: requiredPersons }, (_, posIndex) => {
              const position = posIndex + 1;
              return (
                <tr key={position} className="border-t">
                  {schedule.map((occ) => {
                    const member = occ.members.find(m => m.position === position);
                    const selectedMemberId = member?.memberId || 0;
                    
                    // Get all member IDs already assigned to OTHER positions in this occurrence
                    const assignedMemberIds = occ.members
                      .filter(m => m.position !== position && m.memberId !== 0)
                      .map(m => m.memberId);
                    
                    return (
                      <td key={occ.occurrenceNumber} className="p-2">
                        <Select
                          value={selectedMemberId.toString()}
                          onValueChange={(value) =>
                            handleMemberChange(occ.occurrenceNumber, position, parseInt(value))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Wählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Offen</SelectItem>
                            {eligibleMembers.map((m) => {
                              const isAlreadyAssigned = assignedMemberIds.includes(m.memberId);
                              return (
                                <SelectItem 
                                  key={m.memberId} 
                                  value={m.memberId.toString()}
                                  disabled={isAlreadyAssigned}
                                >
                                  {m.memberName}{isAlreadyAssigned ? ' (bereits zugewiesen)' : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Notes row */}
            <tr className="border-t">
              {schedule.map((occ) => (
                <td key={occ.occurrenceNumber} className="p-2">
                  <textarea
                    placeholder="Notizen..."
                    value={occ.notes || ""}
                    onChange={(e) => {
                      const newSchedule = schedule.map(o =>
                        o.occurrenceNumber === occ.occurrenceNumber
                          ? { ...o, notes: e.target.value }
                          : o
                      );
                      setSchedule(newSchedule);
                      onChange(newSchedule);
                    }}
                    className="w-full min-h-[60px] p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
              ))}
            </tr>
            {/* Items row */}
            <tr className="border-t bg-muted/20">
              {schedule.map((occ) => (
                <td key={occ.occurrenceNumber} className="p-2">
                  <div className="flex flex-col gap-1">
                    {/* Item chips */}
                    {(occ.items || []).map((item) => (
                      <Badge
                        key={item.itemId}
                        variant="secondary"
                        className="flex items-center gap-1 justify-between group"
                      >
                        <Package className="h-3 w-3" />
                        <span className="text-xs truncate flex-1">{item.itemName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSchedule = schedule.map(o =>
                              o.occurrenceNumber === occ.occurrenceNumber
                                ? { ...o, items: (o.items || []).filter(i => i.itemId !== item.itemId) }
                                : o
                            );
                            setSchedule(newSchedule);
                            onChange(newSchedule);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {/* Add item button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOccurrenceForItem(occ.occurrenceNumber);
                        setIsItemPickerOpen(true);
                      }}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Gegenstand
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
            {/* Action buttons row */}
            <tr className="border-t bg-muted/30">
              {schedule.map((occ, index) => (
                <td key={occ.occurrenceNumber} className="p-2">
                  <div className="flex gap-1 justify-center">
                    <Button
                      type="button"
                      variant={occ.isSkipped ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleSkipOccurrence(occ.occurrenceNumber)}
                      title={occ.isSkipped ? "Überspringen rückgängig machen" : "Überspringen"}
                      className={`h-7 w-7 p-0 ${occ.isSkipped ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOccurrence(occ.occurrenceNumber)}
                      title="Löschen"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Special Occurrence Dialog */}
      <Dialog open={isAddingSpecialOccurrence} onOpenChange={setIsAddingSpecialOccurrence}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Sondertermin hinzufügen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="special-name">Name des Sondertermins</Label>
              <Input
                id="special-name"
                placeholder="z.B. Urlaubsvertretung, Extra Reinigung"
                value={specialOccurrenceName}
                onChange={(e) => setSpecialOccurrenceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <CalendarComponent
                mode="single"
                selected={specialOccurrenceDate}
                onSelect={setSpecialOccurrenceDate}
                locale={de}
                className="rounded-md border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingSpecialOccurrence(false);
                setSpecialOccurrenceName("");
                setSpecialOccurrenceDate(undefined);
              }}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleAddSpecialOccurrence}
              disabled={!specialOccurrenceName || !specialOccurrenceDate}
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Picker Dialog */}
      <ItemPickerDialog
        open={isItemPickerOpen}
        onOpenChange={setIsItemPickerOpen}
        householdId={householdId}
        onSelectItem={(itemId, itemName) => {
          if (selectedOccurrenceForItem !== null) {
            const newSchedule = schedule.map(o =>
              o.occurrenceNumber === selectedOccurrenceForItem
                ? { ...o, items: [...(o.items || []), { itemId, itemName }] }
                : o
            );
            setSchedule(newSchedule);
            onChange(newSchedule);
          }
        }}
        excludeItemIds={
          selectedOccurrenceForItem !== null
            ? (schedule.find(o => o.occurrenceNumber === selectedOccurrenceForItem)?.items || []).map(i => i.itemId)
            : []
        }
      />

    </div>
  );
}
