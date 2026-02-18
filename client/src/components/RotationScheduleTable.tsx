import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Wand2 } from "lucide-react";
import { addDays, addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { getNextMonthlyOccurrence, getNextMonthlyOccurrenceExplicit } from "../../../shared/dateUtils";

interface Member {
  memberId: number;
  memberName: string;
}

interface RotationScheduleTableProps {
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
}

export interface ScheduleOccurrence {
  occurrenceNumber: number;
  members: { position: number; memberId: number }[];
  notes?: string;
  calculatedDate?: Date;
}

export function RotationScheduleTable({
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
}: RotationScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleOccurrence[]>([]);
  const isInitialized = useRef(false);
  const isUpdatingDates = useRef(false);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
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
      // Use provided initial schedule
      const withDates = initialSchedule.map(occ => ({
        ...occ,
        calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
      }));
      setSchedule(withDates);
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
          calculatedDate: calculateOccurrenceDate(i),
        });
      }
      
      setSchedule(defaultSchedule);
      isInitialized.current = true;
    }
  }, [dueDate, initialSchedule, requiredPersons, currentAssignees, repeatInterval, repeatUnit, monthlyRecurrenceMode]); // Re-run when dueDate is set

  // Sync schedule with initialSchedule changes (e.g., when parent adds new occurrence)
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!initialSchedule) return;
    
    // Check if initialSchedule has more occurrences than current schedule
    if (initialSchedule.length > schedule.length) {
      const withDates = initialSchedule.map(occ => ({
        ...occ,
        calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
      }));
      setSchedule(withDates);
    }
  }, [initialSchedule, schedule.length, calculateOccurrenceDate]);

  // Update dates when relevant props change (but don't trigger onChange)
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!dueDate) return;
    
    isUpdatingDates.current = true;
    setSchedule(prev =>
      prev.map(occ => ({
        ...occ,
        calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
      }))
    );
    isUpdatingDates.current = false;
  }, [dueDate, repeatInterval, repeatUnit, monthlyRecurrenceMode, monthlyWeekday, monthlyOccurrence]);

  // Notify parent when schedule changes (but not during date updates or initial mount)
  useEffect(() => {
    if (!isInitialized.current || isUpdatingDates.current) return;
    // Only notify if schedule actually has content (prevent notification on initial empty state)
    if (schedule.length > 0) {
      onChangeRef.current(schedule);
    }
  }, [schedule]);

  const handleMemberChange = (occurrenceNumber: number, position: number, memberId: number) => {
    setSchedule(prev => {
      const updated = prev.map(occ =>
        occ.occurrenceNumber === occurrenceNumber
          ? {
              ...occ,
              members: occ.members.map(m =>
                m.position === position ? { ...m, memberId } : m
              ),
            }
          : occ
      );
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
        
        // For each position in this occurrence
        for (let posIdx = 0; posIdx < occ.members.length; posIdx++) {
          const member = occ.members[posIdx];
          
          // Only fill if currently unassigned (memberId === 0)
          if (member.memberId === 0) {
            // Get previous occurrence's member at this position (if exists)
            const prevOccMemberId = occIdx > 0 
              ? newSchedule[occIdx - 1].members[posIdx]?.memberId 
              : null;
            
            // If multiple members available, try to avoid assigning same person consecutively
            let selectedMember = eligibleMembers[memberIndex % eligibleMembers.length];
            
            if (eligibleMembers.length > 1 && prevOccMemberId && selectedMember.memberId === prevOccMemberId) {
              // Try next member in rotation
              selectedMember = eligibleMembers[(memberIndex + 1) % eligibleMembers.length];
            }
            
            occ.members[posIdx] = {
              ...member,
              memberId: selectedMember.memberId,
            };
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
              : "Setzen Sie ein Fälligkeitsdatum um die Rotationsplanung zu starten"}
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

      {/* Table - Horizontal Layout (Columns = Occurrences, Rows = Persons) */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {schedule.map((occ) => (
                <th key={occ.occurrenceNumber} className="p-2 text-center text-sm font-medium">
                  <div className="flex flex-col gap-1">
                    <span>Termin {occ.occurrenceNumber}</span>
                    {occ.calculatedDate && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {format(occ.calculatedDate, "dd.MM.yyyy", { locale: de })}
                      </span>
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
                            {eligibleMembers.map((m) => (
                              <SelectItem key={m.memberId} value={m.memberId.toString()}>
                                {m.memberName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


    </div>
  );
}
