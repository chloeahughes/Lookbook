import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        supabase.from('Students').select('*').order('name'),
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
    if (!studentKnowledge) return 'unrated';
    return studentKnowledge.knows_student ? 'known' : 'unknown';
  };

  const filterStudentsByStatus = (status: 'all' | 'known' | 'unknown' | 'unrated') => {
    if (status === 'all') return students;
    return students.filter(student => getKnowledgeStatus(student.id || 0) === status);
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
              <Badge variant={status === 'known' ? 'default' : status === 'unknown' ? 'destructive' : 'secondary'}>
                {status === 'known' ? 'Known' : status === 'unknown' ? 'Unknown' : 'Unrated'}
              </Badge>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({students.length})</TabsTrigger>
          <TabsTrigger value="known">Known ({filterStudentsByStatus('known').length})</TabsTrigger>
          <TabsTrigger value="unknown">Unknown ({filterStudentsByStatus('unknown').length})</TabsTrigger>
          <TabsTrigger value="unrated">Unrated ({filterStudentsByStatus('unrated').length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {renderStudentList(students)}
        </TabsContent>
        <TabsContent value="known" className="mt-4">
          {renderStudentList(filterStudentsByStatus('known'))}
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