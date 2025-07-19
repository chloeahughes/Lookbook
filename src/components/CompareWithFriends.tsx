import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentSearch } from './StudentSearch';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';

type Student = Tables<'Students'>;
type UserStudentKnowledge = Tables<'user_student_knowledge'>;

interface ComparisonData {
  bothKnow: Student[];
  bothDontKnow: Student[];
  friendKnowsButYouDont: Student[];
  youKnowButFriendDoesnt: Student[];
}

export const CompareWithFriends = () => {
  const [selectedFriend, setSelectedFriend] = useState<Student | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    bothKnow: [],
    bothDontKnow: [],
    friendKnowsButYouDont: [],
    youKnowButFriendDoesnt: []
  });
  const [loading, setLoading] = useState(false);

  const handleFriendSelect = async (friend: Student) => {
    setSelectedFriend(friend);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !friend.id) return;

      // Get current user's knowledge
      const { data: myKnowledge } = await supabase
        .from('user_student_knowledge')
        .select('student_id, knowledge_status')
        .eq('user_id', user.id);

      // Get friend's knowledge (assuming friend has a user account)
      // For now, we'll simulate this by getting a random user's data
      // In a real app, you'd need to link student profiles to user accounts
      const { data: friendKnowledge } = await supabase
        .from('user_student_knowledge')
        .select('student_id, knowledge_status')
        .limit(100); // Simulate friend's data

      // Get all students for comparison
      const { data: allStudents } = await supabase
        .from('Students')
        .select('*');

      if (!myKnowledge || !friendKnowledge || !allStudents) return;

      const myKnowledgeMap = new Map(myKnowledge.map(k => [k.student_id, k.knowledge_status]));
      const friendKnowledgeMap = new Map(friendKnowledge.map(k => [k.student_id, k.knowledge_status]));

      const bothKnow: Student[] = [];
      const bothDontKnow: Student[] = [];
      const friendKnowsButYouDont: Student[] = [];
      const youKnowButFriendDoesnt: Student[] = [];

      allStudents.forEach(student => {
        if (!student.id) return;
        
        const myStatus = myKnowledgeMap.get(student.id);
        const friendStatus = friendKnowledgeMap.get(student.id);

        if (myStatus === 'knows' && friendStatus === 'knows') {
          bothKnow.push(student);
        } else if (myStatus === 'does_not_know' && friendStatus === 'does_not_know') {
          bothDontKnow.push(student);
        } else if (friendStatus === 'knows' && (!myStatus || myStatus === 'does_not_know')) {
          friendKnowsButYouDont.push(student);
        } else if (myStatus === 'knows' && (!friendStatus || friendStatus === 'does_not_know')) {
          youKnowButFriendDoesnt.push(student);
        }
      });

      setComparisonData({
        bothKnow,
        bothDontKnow,
        friendKnowsButYouDont,
        youKnowButFriendDoesnt
      });
    } catch (error) {
      console.error('Error comparing with friend:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (student: Student) => {
    if (student.image_url) return student.image_url;
    if (student.filename) {
      return `https://sfqewnziiuzzkpfimwlx.supabase.co/storage/v1/object/public/students/${student.filename}`;
    }
    return undefined;
  };

  const renderStudentList = (students: Student[]) => (
    <div className="grid gap-4">
      {students.map((student) => (
        <Card key={student.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center space-x-4 p-4">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage 
                src={getImageUrl(student)} 
                alt={student.name || 'Student'}
                className="object-cover w-full h-full"
              />
              <AvatarFallback className="text-sm font-semibold">
                {student.name?.split(' ').map(n => n[0]).join('') || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{student.name}</h3>
              <p className="text-sm text-muted-foreground">{student.hometown}</p>
              <p className="text-sm text-muted-foreground">{student.dorm}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Compare with Friends</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Select a Friend to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentSearch 
            onStudentSelect={handleFriendSelect}
            placeholder="Search for a friend..."
          />
        </CardContent>
      </Card>

      {loading && <div className="text-center p-8">Loading comparison...</div>}

      {selectedFriend && !loading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparing with {selectedFriend.name}</CardTitle>
            </CardHeader>
          </Card>

          <Tabs defaultValue="both-know" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="both-know">
                Both Know ({comparisonData.bothKnow.length})
              </TabsTrigger>
              <TabsTrigger value="both-dont-know">
                Both Don't Know ({comparisonData.bothDontKnow.length})
              </TabsTrigger>
              <TabsTrigger value="friend-knows">
                {selectedFriend.name?.split(' ')[0]} Knows ({comparisonData.friendKnowsButYouDont.length})
              </TabsTrigger>
              <TabsTrigger value="you-know">
                You Know ({comparisonData.youKnowButFriendDoesnt.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="both-know" className="mt-4">
              {renderStudentList(comparisonData.bothKnow)}
            </TabsContent>

            <TabsContent value="both-dont-know" className="mt-4">
              {renderStudentList(comparisonData.bothDontKnow)}
            </TabsContent>

            <TabsContent value="friend-knows" className="mt-4">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Make Introductions! 🤝</h3>
                <p className="text-blue-700">Ask {selectedFriend.name?.split(' ')[0]} to introduce you to these students!</p>
              </div>
              {renderStudentList(comparisonData.friendKnowsButYouDont)}
            </TabsContent>

            <TabsContent value="you-know" className="mt-4">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Make Introductions! 🤝</h3>
                <p className="text-green-700">You can introduce {selectedFriend.name?.split(' ')[0]} to these students!</p>
              </div>
              {renderStudentList(comparisonData.youKnowButFriendDoesnt)}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};