import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface DemographicData {
  hometown: { [key: string]: number };
  dorm: { [key: string]: number };
}

export const MyData = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    knownStudents: 0,
    unknownStudents: 0,
    knowOfStudents: 0,
    unratedStudents: 0
  });
  const [knownDemographics, setKnownDemographics] = useState<DemographicData>({
    hometown: {},
    dorm: {}
  });
  const [unknownDemographics, setUnknownDemographics] = useState<DemographicData>({
    hometown: {},
    dorm: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch stats
      const [studentsResult, knowledgeResult] = await Promise.all([
        supabase.from('Students').select('id'),
        supabase.from('user_student_knowledge').select('knowledge_status')
      ]);

      const totalStudents = studentsResult.data?.length || 0;
      const knowledgeData = knowledgeResult.data || [];
      
      const knownStudents = knowledgeData.filter(k => k.knowledge_status === 'knows').length;
      const unknownStudents = knowledgeData.filter(k => k.knowledge_status === 'does_not_know').length;
      const knowOfStudents = knowledgeData.filter(k => k.knowledge_status === 'knows_of').length;
      const unratedStudents = totalStudents - knowledgeData.length;

      setStats({
        totalStudents,
        knownStudents,
        unknownStudents,
        knowOfStudents,
        unratedStudents
      });

      // Fetch demographics
      const [knownResult, unknownResult] = await Promise.all([
        supabase
          .from('user_student_knowledge')
          .select(`Students!inner(name, hometown, dorm)`)
          .eq('knowledge_status', 'knows'),
        supabase
          .from('user_student_knowledge')
          .select(`Students!inner(name, hometown, dorm)`)
          .eq('knowledge_status', 'does_not_know')
      ]);

      const processData = (students: any[]): DemographicData => {
        const hometown: { [key: string]: number } = {};
        const dorm: { [key: string]: number } = {};

        students?.forEach(item => {
          const student = item.Students;
          if (student.hometown) {
            hometown[student.hometown] = (hometown[student.hometown] || 0) + 1;
          }
          if (student.dorm) {
            dorm[student.dorm] = (dorm[student.dorm] || 0) + 1;
          }
        });

        return { hometown, dorm };
      };

      setKnownDemographics(processData(knownResult.data || []));
      setUnknownDemographics(processData(unknownResult.data || []));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDemographicChart = (data: { [key: string]: number }, title: string, showMore = false) => {
    const entries = Object.entries(data).sort(([,a], [,b]) => b - a);
    const total = entries.reduce((sum, [,count]) => sum + count, 0);
    const displayEntries = showMore ? entries : entries.slice(0, 5);

    if (entries.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayEntries.map(([name, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span>{count} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!showMore && entries.length > 5 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(`/demographics/${title.toLowerCase()}`, '_blank')}
              className="w-full mt-2"
            >
              More ({entries.length - 5} additional)
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center p-8">Loading data...</div>;
  }

  const knowledgePercentage = stats.totalStudents > 0 
    ? (stats.knownStudents / stats.totalStudents) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Data</h2>
      
      {/* Knowledge Stats */}
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

      {/* Demographics */}
      <Tabs defaultValue="known" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="known">Students I Know</TabsTrigger>
          <TabsTrigger value="unknown">Students I Don't Know</TabsTrigger>
        </TabsList>
        
        <TabsContent value="known" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {renderDemographicChart(knownDemographics.hometown, "Hometowns")}
            {renderDemographicChart(knownDemographics.dorm, "Dorms")}
          </div>
        </TabsContent>
        
        <TabsContent value="unknown" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {renderDemographicChart(unknownDemographics.hometown, "Hometowns")}
            {renderDemographicChart(unknownDemographics.dorm, "Dorms")}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};