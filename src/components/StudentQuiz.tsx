import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, RotateCcw } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useSwipeable } from 'react-swipeable';

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

  const handleResponse = async (knows: boolean | 'know_of') => {
    if (!currentStudent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store for undo functionality
      setLastRatedStudent({ student: currentStudent, knows });

      const { error } = await supabase
        .from('user_student_knowledge')
        .upsert({
          user_id: user.id,
          student_id: currentStudent.id!,
          knowledge_status: knows === true ? 'knows' : knows === false ? 'does_not_know' : 'knows_of'
        }, {
          onConflict: 'user_id,student_id'
        });

      if (error) throw error;

      toast({
        title: knows === true ? "Marked as Known" : knows === false ? "Marked as Unknown" : "Marked as Know Of",
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

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!currentStudent) return;
    
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleResponse(false);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleResponse(true);
    }
  }, [currentStudent, handleResponse]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setImageError(false);
  }, [currentStudent]);

  // Swipe handlers - must be before any conditional returns
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleResponse(false),
    onSwipedRight: () => handleResponse(true),
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 50
  });

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

  const [lastRatedStudent, setLastRatedStudent] = useState<{ student: Student; knows: boolean | 'know_of' } | null>(null);

  const handleUndo = async () => {
    if (!lastRatedStudent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove the last rating
      const { error } = await supabase
        .from('user_student_knowledge')
        .delete()
        .eq('user_id', user.id)
        .eq('student_id', lastRatedStudent.student.id);

      if (error) throw error;

      // Add the student back to available list and set as current
      setAvailableStudents(prev => [...prev, lastRatedStudent.student]);
      setCurrentStudent(lastRatedStudent.student);
      setLastRatedStudent(null);

      toast({
        title: "Undone",
        description: `Rating for ${lastRatedStudent.student.name} has been removed.`
      });
    } catch (error) {
      console.error('Error undoing rating:', error);
      toast({
        title: "Error",
        description: "Failed to undo rating. Please try again.",
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
        <h2 className="text-2xl font-bold">Cards Complete!</h2>
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
      <div className="text-center">
        <h2 className="text-2xl font-bold">Do You Know This Student?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Use arrow keys: ← Don't Know | → Know Them | Swipe on mobile
        </p>
      </div>
      
      <Card className="max-w-lg mx-auto" {...swipeHandlers}>
        <CardContent className="p-12 text-center space-y-6 relative">
          {lastRatedStudent && (
            <Button 
              onClick={handleUndo}
              variant="outline"
              size="sm"
              className="absolute top-4 left-4 p-2"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          
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
          
          <div className="flex gap-3 justify-center">
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
              onClick={() => handleResponse('know_of')}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              Know Of
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