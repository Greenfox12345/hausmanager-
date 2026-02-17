import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Calendar } from "lucide-react";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { de } from "date-fns/locale";
import { getNextMonthlyOccurrence } from "../../../shared/dateUtils";

interface Member {
  memberId: number;
  memberName: string;
}

interface RotationScheduleTableProps {
  requiredPersons: number;
  availableMembers: Member[];
  currentAssignees: number[];
  repeatInterval: number;
  repeatUnit: "days" | "weeks" | "months";
  monthlyRecurrenceMode?: "same_date" | "same_weekday";
  dueDate?: Date | null;
  onChange: (schedule: ScheduleOccurrence[]) => void;
  initialSchedule?: ScheduleOccurrence[];
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
  dueDate,
  onChange,
  initialSchedule,
}: RotationScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleOccurrence[]>([]);
  const isInitialized = useRef(false);
  const isUpdatingDates = useRef(false);
  
  // Calculate date for an occurrence (memoized to prevent recalculation)
  const calculateOccurrenceDate = useCallback((occurrenceNumber: number): Date | undefined => {
    if (!dueDate) return undefined;
    
    if (repeatUnit === "months") {
      // Use weekday-based calculation for monthly recurrence if mode is same_weekday
      return getNextMonthlyOccurrence(dueDate, repeatInterval * (occurrenceNumber - 1), monthlyRecurrenceMode);
    } else {
      // For days/weeks, use simple addition
      const addFunction = repeatUnit === "days" ? addDays : addWeeks;
      return addFunction(dueDate, repeatInterval * (occurrenceNumber - 1));
    }
  }, [dueDate, repeatInterval, repeatUnit, monthlyRecurrenceMode]);

  // Initialize schedule ONCE on mount
  useEffect(() => {
    if (isInitialized.current) return;
    
    if (initialSchedule && initialSchedule.length > 0) {
      // Use provided initial schedule
      const withDates = initialSchedule.map(occ => ({
        ...occ,
        calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
      }));
      setSchedule(withDates);
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
    }
    
    isInitialized.current = true;
  }, []); // Empty deps - run ONCE on mount

  // Update calculated dates when date-related props change (but don't trigger onChange)
  useEffect(() => {
    if (!isInitialized.current || schedule.length === 0) return;
    
    isUpdatingDates.current = true;
    const updated = schedule.map(occ => ({
      ...occ,
      calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
    }));
    setSchedule(updated);
    // Reset flag after state update completes
    setTimeout(() => { isUpdatingDates.current = false; }, 0);
  }, [dueDate, repeatInterval, repeatUnit, calculateOccurrenceDate]); // Update dates when these change

  // Notify parent of changes (but NOT when just updating dates)
  useEffect(() => {
    if (!isInitialized.current || schedule.length === 0 || isUpdatingDates.current) return;
    
    onChange(schedule);
  }, [schedule, onChange]);

  const handleMemberChange = (occurrenceNumber: number, position: number, memberId: number) => {
    setSchedule(prev =>
      prev.map(occ =>
        occ.occurrenceNumber === occurrenceNumber
          ? {
              ...occ,
              members: occ.members.map(m =>
                m.position === position ? { ...m, memberId } : m
              ),
            }
          : occ
      )
    );
  };

  const handleNotesChange = (occurrenceNumber: number, notes: string) => {
    setSchedule(prev =>
      prev.map(occ =>
        occ.occurrenceNumber === occurrenceNumber ? { ...occ, notes } : occ
      )
    );
  };

  const handleExtend = () => {
    const nextOccurrenceNumber = schedule.length + 1;
    const newOccurrence: ScheduleOccurrence = {
      occurrenceNumber: nextOccurrenceNumber,
      members: Array.from({ length: requiredPersons }, (_, i) => ({
        position: i + 1,
        memberId: 0,
      })),
      notes: "",
      calculatedDate: calculateOccurrenceDate(nextOccurrenceNumber),
    };
    
    setSchedule(prev => [...prev, newOccurrence]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Planen Sie die Rotation für kommende Termine</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left text-sm font-medium">Position</th>
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
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: requiredPersons }, (_, posIndex) => {
              const position = posIndex + 1;
              return (
                <tr key={position} className="border-t">
                  <td className="p-2 text-sm font-medium">Person {position}</td>
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
                            {availableMembers.map((m) => (
                              <SelectItem key={m.memberId} value={m.memberId.toString()}>
                                {m.memberName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    );
                  })}
                  <td className="p-2"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes for each occurrence */}
      <div className="space-y-3">
        {schedule.map((occ) => (
          <div key={occ.occurrenceNumber} className="space-y-1">
            <Label className="text-sm">
              Notizen für Termin {occ.occurrenceNumber}
              {occ.calculatedDate && (
                <span className="text-muted-foreground ml-2">
                  ({format(occ.calculatedDate, "dd.MM.yyyy", { locale: de })})
                </span>
              )}
            </Label>
            <Textarea
              placeholder="Optionale Notizen für diesen Termin..."
              value={occ.notes || ""}
              onChange={(e) => handleNotesChange(occ.occurrenceNumber, e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        ))}
      </div>

      {/* Extend button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExtend}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Weiter planen (Termin {schedule.length + 1} hinzufügen)
      </Button>
    </div>
  );
}
