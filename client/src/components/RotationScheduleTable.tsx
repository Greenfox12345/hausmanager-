import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Wand2, ChevronDown, ChevronRight } from "lucide-react";
import { addDays, addWeeks, format } from "date-fns";
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
  dueDate,
  onChange,
  initialSchedule,
  excludedMemberIds = [],
}: RotationScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleOccurrence[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const isInitialized = useRef(false);
  const isUpdatingDates = useRef(false);
  
  // Filter out excluded members
  const eligibleMembers = availableMembers.filter(m => !excludedMemberIds.includes(m.memberId));
  
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
  }, []); // Empty deps - run once on mount

  // Update dates when relevant props change (but don't trigger onChange)
  useEffect(() => {
    if (!isInitialized.current) return;
    
    isUpdatingDates.current = true;
    setSchedule(prev =>
      prev.map(occ => ({
        ...occ,
        calculatedDate: calculateOccurrenceDate(occ.occurrenceNumber),
      }))
    );
    isUpdatingDates.current = false;
  }, [calculateOccurrenceDate]);

  // Notify parent when schedule changes (but not during date updates)
  useEffect(() => {
    if (!isInitialized.current || isUpdatingDates.current) return;
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

  const toggleNotes = (occurrenceNumber: number) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(occurrenceNumber)) {
        newSet.delete(occurrenceNumber);
      } else {
        newSet.add(occurrenceNumber);
      }
      return newSet;
    });
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
            // Round-robin through eligible members
            const selectedMember = eligibleMembers[memberIndex % eligibleMembers.length];
            occ.members[posIdx] = {
              ...member,
              memberId: selectedMember.memberId,
            };
            memberIndex++;
          }
        }
      }
      
      return newSchedule;
    });
  };

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

      {/* Collapsible Notes Section */}
      <div className="space-y-2">
        {schedule.map((occ) => {
          const isExpanded = expandedNotes.has(occ.occurrenceNumber);
          return (
            <div key={occ.occurrenceNumber} className="border rounded-lg">
              <Button
                type="button"
                variant="ghost"
                onClick={() => toggleNotes(occ.occurrenceNumber)}
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    Notizen für Termin {occ.occurrenceNumber}
                    {occ.calculatedDate && (
                      <span className="text-muted-foreground ml-2 font-normal">
                        ({format(occ.calculatedDate, "dd.MM.yyyy", { locale: de })})
                      </span>
                    )}
                  </span>
                </div>
                {occ.notes && !isExpanded && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {occ.notes}
                  </span>
                )}
              </Button>
              
              {isExpanded && (
                <div className="p-3 pt-0">
                  <Textarea
                    placeholder="Optionale Notizen für diesen Termin..."
                    value={occ.notes || ""}
                    onChange={(e) => handleNotesChange(occ.occurrenceNumber, e.target.value)}
                    rows={3}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Extend Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleExtend}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Weiter planen
      </Button>
    </div>
  );
}
