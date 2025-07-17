import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DemographicData {
  hometown: { [key: string]: number };
  dorm: { [key: string]: number };
}

export const Demographics = () => {
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
    fetchDemographics();
  }, []);

  const fetchDemographics = async () => {
    try {
      // Get known students
      const { data: knownStudents } = await supabase
        .from('user_student_knowledge')
        .select(`
          Students!inner(name, hometown, dorm)
        `)
        .eq('knowledge_status', 'knows');

      // Get unknown students  
      const { data: unknownStudents } = await supabase
        .from('user_student_knowledge')
        .select(`
          Students!inner(name, hometown, dorm)
        `)
        .eq('knowledge_status', 'does_not_know');

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

      setKnownDemographics(processData(knownStudents || []));
      setUnknownDemographics(processData(unknownStudents || []));
    } catch (error) {
      console.error('Error fetching demographics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDemographicChart = (data: { [key: string]: number }, title: string) => {
    const entries = Object.entries(data).sort(([,a], [,b]) => b - a);
    const total = entries.reduce((sum, [,count]) => sum + count, 0);

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
          {entries.map(([name, count]) => {
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
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center p-8">Loading demographics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Demographics</h2>
      
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