import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, RotateCcw } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Student = Tables<'Students'>;

export const StudentQuiz = () => {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableStudents();
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [currentStudent]);

  const fetchAvailableStudents = async () => {
    try {
      // Get students that haven't been rated yet
      const { data: ratedStudentIds } = await supabase
        .from('user_student_knowledge')
        .select('student_id');

      const ratedIds = ratedStudentIds?.map(r => r.student_id) || [];

      const { data: students } = await supabase
        .from('Students')
        .select('*')
        .not('id', 'in', `(${ratedIds.join(',') || '0'})`);

      if (students && students.length > 0) {
        setAvailableStudents(students);
        setCurrentStudent(students[Math.floor(Math.random() * students.length)]);
      } else {
        setCurrentStudent(null);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (knows: boolean) => {
    if (!currentStudent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_student_knowledge')
        .insert({
          user_id: user.id,
          student_id: currentStudent.id!,
          knows_student: knows
        });

      if (error) throw error;

      toast({
        title: knows ? "Marked as Known" : "Marked as Unknown",
        description: `${currentStudent.name} has been recorded.`
      });

      // Remove current student from available list and pick next
      const remaining = availableStudents.filter(s => s.id !== currentStudent.id);
      setAvailableStudents(remaining);
      
      if (remaining.length > 0) {
        setCurrentStudent(remaining[Math.floor(Math.random() * remaining.length)]);
      } else {
        setCurrentStudent(null);
      }
    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetQuiz = () => {
    fetchAvailableStudents();
  };

  if (loading) {
    return <div className="text-center p-8">Loading quiz...</div>;
  }

  if (!currentStudent) {
    return (
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-bold">Student Quiz Complete!</h2>
        <p className="text-muted-foreground">You've rated all available students.</p>
        <Button onClick={resetQuiz} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Do You Know This Student?</h2>
      
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-12 text-center space-y-6">
          <div className="h-48 w-48 mx-auto rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {!imageError && currentStudent.filename ? (
              <img 
                src={`https://sfqewnziiuzzkpfimwlx.supabase.co/storage/v1/object/public/students/${currentStudent.filename}`}
                alt={currentStudent.name || 'Student'}
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center text-3xl font-semibold text-gray-600">
                {currentStudent.name?.split(' ').map(n => n[0]).join('') || 'S'}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold">{currentStudent.name}</h3>
            <p className="text-muted-foreground">{currentStudent.hometown}</p>
            <p className="text-muted-foreground">{currentStudent.dorm}</p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => handleResponse(false)}
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              <X className="w-5 h-5 mr-2" />
              Don't Know
            </Button>
            <Button 
              onClick={() => handleResponse(true)}
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-5 h-5 mr-2" />
              I Know Them
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground">
        {availableStudents.length} students remaining
      </div>
    </div>
  );
};