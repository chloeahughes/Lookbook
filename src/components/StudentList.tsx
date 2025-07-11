import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tables } from '@/integrations/supabase/types';

type Student = Tables<'Students'>;
type UserStudentKnowledge = Tables<'user_student_knowledge'>;

export const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [knowledge, setKnowledge] = useState<UserStudentKnowledge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, knowledgeResult] = await Promise.all([
        supabase.from('Students').select('*'),
        supabase.from('user_student_knowledge').select('*')
      ]);

      if (studentsResult.data) setStudents(studentsResult.data);
      if (knowledgeResult.data) setKnowledge(knowledgeResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKnowledgeStatus = (studentId: number) => {
    const studentKnowledge = knowledge.find(k => k.student_id === studentId);
    if (!studentKnowledge) return 'unknown';
    return studentKnowledge.knows_student ? 'known' : 'unknown';
  };

  if (loading) {
    return <div className="text-center p-8">Loading students...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">All Students</h2>
      <div className="grid gap-4">
        {students.map((student) => {
          const status = getKnowledgeStatus(student.id || 0);
          return (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center space-x-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={student.filename ? `https://sfqewnziiuzzkpfimwlx.supabase.co/storage/v1/object/public/students/${student.filename}` : undefined} 
                    alt={student.name || 'Student'} 
                  />
                  <AvatarFallback>
                    {student.name?.split(' ').map(n => n[0]).join('') || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">{student.hometown}</p>
                  <p className="text-sm text-muted-foreground">{student.dorm}</p>
                </div>
                <Badge variant={status === 'known' ? 'default' : status === 'unknown' ? 'destructive' : 'secondary'}>
                  {status === 'known' ? 'Known' : status === 'unknown' ? 'Unknown' : 'Not Rated'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};