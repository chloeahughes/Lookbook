import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tables } from '@/integrations/supabase/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Student = Tables<'Students'>;

interface StudentSearchProps {
  onStudentSelect: (student: Student) => void;
  placeholder?: string;
  value?: string;
}

export const StudentSearch = ({ onStudentSelect, placeholder = "Search students...", value = "" }: StudentSearchProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('Students')
        .select('*')
        .order('name');
      
      if (data) {
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (student: Student) => {
    setSelectedStudent(student);
    setSearchValue(student.name || "");
    setOpen(false);
    onStudentSelect(student);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedStudent ? selectedStudent.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <Input
            placeholder="Type to search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
          <CommandEmpty>No student found.</CommandEmpty>
          <CommandGroup>
            <CommandList className="max-h-48 overflow-y-auto">
              {filteredStudents.slice(0, 50).map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.name || ""}
                  onSelect={() => handleSelect(student)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedStudent?.id === student.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {student.hometown} • {student.dorm}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};