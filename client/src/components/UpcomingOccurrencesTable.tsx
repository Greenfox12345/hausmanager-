import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock, User, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UpcomingOccurrence {
  occurrenceNumber: number;
  date?: Date;
  time?: string;
  responsiblePersons: string[];
  notes?: string;
}

interface UpcomingOccurrencesTableProps {
  occurrences: UpcomingOccurrence[];
}

export function UpcomingOccurrencesTable({ occurrences }: UpcomingOccurrencesTableProps) {
  if (occurrences.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Keine kommenden Termine geplant</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-32">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datum
              </div>
            </TableHead>
            <TableHead className="w-24">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Uhrzeit
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Verantwortliche
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notizen
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {occurrences.map((occ) => (
            <TableRow key={occ.occurrenceNumber}>
              <TableCell className="font-medium text-muted-foreground">
                {occ.occurrenceNumber}
              </TableCell>
              <TableCell>
                {occ.date ? (
                  <span className="text-sm">
                    {format(occ.date, "EEE, dd.MM.yyyy", { locale: de })}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    Termin {occ.occurrenceNumber}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {occ.time ? (
                  <span className="text-sm font-medium">{occ.time}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {occ.responsiblePersons.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {occ.responsiblePersons.map((person, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {person}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Noch offen</span>
                )}
              </TableCell>
              <TableCell>
                {occ.notes ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{occ.notes}</p>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
