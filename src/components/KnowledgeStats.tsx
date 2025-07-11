import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const KnowledgeStats = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    knownStudents: 0,
    unknownStudents: 0,
    unratedStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [studentsResult, knowledgeResult] = await Promise.all([
        supabase.from('Students').select('id'),
        supabase.from('user_student_knowledge').select('knows_student')
      ]);

      const totalStudents = studentsResult.data?.length || 0;
      const knowledgeData = knowledgeResult.data || [];
      
      const knownStudents = knowledgeData.filter(k => k.knows_student).length;
      const unknownStudents = knowledgeData.filter(k => !k.knows_student).length;
      const unratedStudents = totalStudents - knowledgeData.length;

      setStats({
        totalStudents,
        knownStudents,
        unknownStudents,
        unratedStudents
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading statistics...</div>;
  }

  const knowledgePercentage = stats.totalStudents > 0 
    ? (stats.knownStudents / stats.totalStudents) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Knowledge Statistics</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Overall Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{knowledgePercentage.toFixed(1)}%</div>
            <p className="text-muted-foreground">of students you know</p>
          </div>
          <Progress value={knowledgePercentage} className="w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.knownStudents}</div>
            <p className="text-sm text-muted-foreground">Known</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.unknownStudents}</div>
            <p className="text-sm text-muted-foreground">Unknown</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.unratedStudents}</div>
            <p className="text-sm text-muted-foreground">Unrated</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};