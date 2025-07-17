import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Student = Tables<'Students'>;
type UserStudentKnowledge = Tables<'user_student_knowledge'>;

// Fetch all rows from a Supabase table in batches
async function fetchAllRows(tableName: 'user_student_knowledge', batchSize = 1000): Promise<UserStudentKnowledge[]> {
  let allRows: UserStudentKnowledge[] = [];
  let from = 0;
  let to = batchSize - 1;
  let done = false;

  while (!done) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error) {
      throw error;
    }

    if (data) {
      allRows = allRows.concat(data);
      if (data.length < batchSize) {
        done = true;
      } else {
        from += batchSize;
        to += batchSize;
      }
    } else {
      done = true;
    }
  }

  return allRows;
}

export const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [knowledge, setKnowledge] = useState<UserStudentKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('👀 useEffect ran');
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      // Fetch all knowledge rows in batches first
      const allKnowledgeRows = await fetchAllRows('user_student_knowledge');

      // Students fetched without ordering - we'll sort them by most recently rated
      const studentsResult = await supabase.from('Students').select('*').range(0, 1725);

      if (studentsResult.data) {
        // Sort students by most recently rated first
        const sortedStudents = studentsResult.data.sort((a, b) => {
          const aKnowledge = allKnowledgeRows.find(k => k.student_id === a.id);
          const bKnowledge = allKnowledgeRows.find(k => k.student_id === b.id);
          
          // If both have knowledge, sort by updated_at (most recent first)
          if (aKnowledge && bKnowledge) {
            return new Date(bKnowledge.updated_at).getTime() - new Date(aKnowledge.updated_at).getTime();
          }
          
          // If only one has knowledge, prioritize the one with knowledge
          if (aKnowledge && !bKnowledge) return -1;
          if (!aKnowledge && bKnowledge) return 1;
          
          // If neither has knowledge, sort alphabetically
          return (a.name || '').localeCompare(b.name || '');
        });
        
        setStudents(sortedStudents);
      }

      setKnowledge(allKnowledgeRows);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const getKnowledgeStatus = (studentId: number) => {
    const studentKnowledge = knowledge.find(k => k.student_id === studentId);
    if (!studentKnowledge) return 'unrated';
    return studentKnowledge.knowledge_status === 'knows' ? 'known' : 
           studentKnowledge.knowledge_status === 'does_not_know' ? 'unknown' : 'know_of';
  };

  const filterStudentsByStatus = (status: 'all' | 'known' | 'unknown' | 'know_of' | 'unrated') => {
    if (status === 'all') return students;
    return students.filter(student => getKnowledgeStatus(student.id || 0) === status);
  };

  const updateStudentStatus = async (studentId: number, newStatus: 'knows' | 'does_not_know' | 'knows_of' | 'unrated') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (newStatus === 'unrated') {
        // Delete the record if setting to unrated
        const { error } = await supabase
          .from('user_student_knowledge')
          .delete()
          .eq('user_id', user.id)
          .eq('student_id', studentId);
        
        if (error) throw error;
        
        // Update local state
        setKnowledge(prev => prev.filter(k => !(k.user_id === user.id && k.student_id === studentId)));
      } else {
        // Upsert the record
        const { error } = await supabase
          .from('user_student_knowledge')
          .upsert({
            user_id: user.id,
            student_id: studentId,
            knowledge_status: newStatus
          }, {
            onConflict: 'user_id,student_id'
          });
        
        if (error) throw error;
        
        // Update local state
        setKnowledge(prev => {
          const existingIndex = prev.findIndex(k => k.user_id === user.id && k.student_id === studentId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], knowledge_status: newStatus, updated_at: new Date().toISOString() };
            return updated;
          } else {
            return [...prev, {
              id: crypto.randomUUID(),
              user_id: user.id,
              student_id: studentId,
              knowledge_status: newStatus,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }];
          }
        });
      }

      toast({
        title: "Status updated",
        description: "Student knowledge status has been updated.",
      });
    } catch (error) {
      console.error('Error updating student status:', error);
      toast({
        title: "Error",
        description: "Failed to update student status.",
        variant: "destructive"
      });
    }
  };

  const getImageUrl = (student: Student) => {
    // Always prefer image_url if it exists, otherwise construct from filename
    if (student.image_url) {
      return student.image_url;
    }
    if (student.filename) {
      return `https://sfqewnziiuzzkpfimwlx.supabase.co/storage/v1/object/public/students/${student.filename}`;
    }
    return undefined;
  };

  if (loading) {
    return <div className="text-center p-8">Loading students...</div>;
  }

  const renderStudentList = (studentsToShow: Student[]) => (
    <div className="grid gap-4">
      {studentsToShow.map((student) => {
        const status = getKnowledgeStatus(student.id || 0);
        return (
          <Card key={student.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center space-x-4 p-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage 
                  src={getImageUrl(student)} 
                  alt={student.name || 'Student'}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    console.log('Image failed to load:', getImageUrl(student));
                    console.log('Student data:', student);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', getImageUrl(student));
                  }}
                />
                <AvatarFallback className="text-lg font-semibold">
                  {student.name?.split(' ').map(n => n[0]).join('') || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.hometown}</p>
                <p className="text-sm text-muted-foreground">{student.dorm}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Select
                  value={status === 'known' ? 'knows' : status === 'unknown' ? 'does_not_know' : status === 'know_of' ? 'knows_of' : 'unrated'}
                  onValueChange={(value) => updateStudentStatus(student.id || 0, value as 'knows' | 'does_not_know' | 'knows_of' | 'unrated')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knows">I Know</SelectItem>
                    <SelectItem value="knows_of">Know Of</SelectItem>
                    <SelectItem value="does_not_know">Don't Know</SelectItem>
                    <SelectItem value="unrated">Unrated</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={status === 'known' ? 'default' : status === 'unknown' ? 'destructive' : status === 'know_of' ? 'outline' : 'secondary'}>
                  {status === 'known' ? 'Known' : status === 'unknown' ? 'Unknown' : status === 'know_of' ? 'Know Of' : 'Unrated'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">All Students</h2>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({students.length})</TabsTrigger>
          <TabsTrigger value="known">Known ({filterStudentsByStatus('known').length})</TabsTrigger>
          <TabsTrigger value="know_of">Know Of ({filterStudentsByStatus('know_of').length})</TabsTrigger>
          <TabsTrigger value="unknown">Unknown ({filterStudentsByStatus('unknown').length})</TabsTrigger>
          <TabsTrigger value="unrated">Unrated ({filterStudentsByStatus('unrated').length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {renderStudentList(students)}
        </TabsContent>
        <TabsContent value="known" className="mt-4">
          {renderStudentList(filterStudentsByStatus('known'))}
        </TabsContent>
        <TabsContent value="know_of" className="mt-4">
          {renderStudentList(filterStudentsByStatus('know_of'))}
        </TabsContent>
        <TabsContent value="unknown" className="mt-4">
          {renderStudentList(filterStudentsByStatus('unknown'))}
        </TabsContent>
        <TabsContent value="unrated" className="mt-4">
          {renderStudentList(filterStudentsByStatus('unrated'))}
        </TabsContent>
      </Tabs>
    </div>
  );
};