import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthWrapper } from '@/components/AuthWrapper';
import { StudentList } from '@/components/StudentList';
import { KnowledgeStats } from '@/components/KnowledgeStats';
import { StudentQuiz } from '@/components/StudentQuiz';
import { Demographics } from '@/components/Demographics';
import { UserProfile } from '@/components/UserProfile';

const Index = () => {
  return (
    <AuthWrapper>
      {(session) => (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Lookbook</h1>
              <p className="text-muted-foreground">Track which students you know across campus</p>
            </div>

            <Tabs defaultValue="quiz" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="list">All Students</TabsTrigger>
                <TabsTrigger value="stats">Knowledge %</TabsTrigger>
                <TabsTrigger value="quiz">Cards</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="profile">My Profile</TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <TabsContent value="list">
                  <StudentList />
                </TabsContent>

                <TabsContent value="stats">
                  <KnowledgeStats />
                </TabsContent>

                <TabsContent value="quiz">
                  <StudentQuiz />
                </TabsContent>

                <TabsContent value="demographics">
                  <Demographics />
                </TabsContent>

                <TabsContent value="profile">
                  <UserProfile />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
};

export default Index;
