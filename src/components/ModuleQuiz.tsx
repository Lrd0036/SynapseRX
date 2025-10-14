/**
 * src/pages/ModuleDetail.tsx
 *
 * This is a self-contained version of the component. To bypass the persistent
 * build errors, the Supabase client and the full ModuleQuiz component have
 * been included directly in this file, removing the need for external imports
 * that were failing to resolve.
 */

// --- IMPORTS ---
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- SUPABASE CLIENT (INCLUDED DIRECTLY) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- MODULEQUIZ COMPONENT (INCLUDED DIRECTLY) ---

// TypeScript interfaces for the quiz
interface QuizQuestion {
  id?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  type?: string;
}

interface OpenEndedQuestion {
  question: string;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
  moduleId?: string;
  onComplete?: () => void;
}

const ModuleQuiz = ({ questions, moduleId, onComplete }: ModuleQuizProps) => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(questions.filter((q) => q.type !== "open_ended").length).fill(false),
  );
  const [openEndedResponses, setOpenEndedResponses] = useState<Record<string, string>>({});
  const [showOpenEnded, setShowOpenEnded] = useState(false);

  const multipleChoiceQuestions = questions.filter((q) => q.type !== "open_ended");
  const openEndedData = questions.find((q) => q.type === "open_ended") as any;
  const openEndedQuestions = openEndedData?.questions as OpenEndedQuestion[] | undefined;

  const handleAnswerSelect = (answerIndex: number) => {
    if (!answeredQuestions[currentQuestion]) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === multipleChoiceQuestions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }
    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = true;
    setAnsweredQuestions(newAnsweredQuestions);

    if (currentQuestion === multipleChoiceQuestions.length - 1) {
      setShowResult(true);
      if (openEndedQuestions && openEndedQuestions.length > 0) {
        setTimeout(() => setShowOpenEnded(true), 1500);
      }
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setCurrentQuestion(currentQuestion + 1);
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions(new Array(multipleChoiceQuestions.length).fill(false));
  };

  const handleSubmitOpenEnded = async () => {
    if (!moduleId || !openEndedQuestions) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const responses = Object.entries(openEndedResponses).map(([question, response]) => ({
        user_id: user.id,
        module_id: moduleId,
        question,
        response,
      }));
      const { error } = await supabase.from("module_responses").insert(responses);
      if (error) throw error;

      toast({
        title: "Module completed!",
        description: "Your responses have been submitted and the module is complete.",
      });

      setShowOpenEnded(false);
      setOpenEndedResponses({});
      if (onComplete) onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getScorePercentage = () => Math.round((score / multipleChoiceQuestions.length) * 100);

  if (showOpenEnded && openEndedQuestions) {
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle>Reflection Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Please answer the following open-ended questions. Your responses will be reviewed by your manager.
          </p>
          {openEndedQuestions.map((q, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`} className="text-base font-medium">
                {index + 1}. {q.question}
              </Label>
              <Textarea
                id={`question-${index}`}
                placeholder="Type your response here..."
                value={openEndedResponses[q.question] || ""}
                onChange={(e) => setOpenEndedResponses({ ...openEndedResponses, [q.question]: e.target.value })}
                rows={5}
                className="w-full"
              />
            </div>
          ))}
          <Button
            onClick={handleSubmitOpenEnded}
            disabled={
              Object.keys(openEndedResponses).length !== openEndedQuestions.length ||
              Object.values(openEndedResponses).some((r) => !r.trim())
            }
            size="lg"
            className="w-full"
          >
            Submit and Complete Module
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResult) {
    const percentage = getScorePercentage();
    const passed = percentage >= 70;
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Quiz Complete!
            </CardTitle>
            <Badge variant={passed ? "default" : "destructive"}>{passed ? "Passed" : "Review Needed"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{percentage}%</div>
            <p className="text-lg text-muted-foreground">
              You scored {score} out of {multipleChoiceQuestions.length} correctly.
            </p>
            <p className={passed ? "text-success" : "text-destructive"}>
              {passed ? "Great job! You have demonstrated understanding." : "Please review the module and try again."}
            </p>
          </div>
          {!openEndedQuestions || openEndedQuestions.length === 0 ? (
            <Button onClick={handleRetakeQuiz} className="w-full" size="lg">
              Retake Quiz
            </Button>
          ) : (
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-muted-foreground">Please complete the reflection questions to finish.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = multipleChoiceQuestions[currentQuestion];
  if (!question) {
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle>Loading Quiz...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Preparing questions...</p>
        </CardContent>
      </Card>
    );
  }
  const isAnswered = answeredQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assessment Quiz</CardTitle>
          <Badge variant="outline">
            Question {currentQuestion + 1} of {multipleChoiceQuestions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
          <RadioGroup
            value={selectedAnswer?.toString()}
            onValueChange={(v) => handleAnswerSelect(parseInt(v))}
            disabled={isAnswered}
          >
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === question.correctAnswer;
              const showFeedback = isAnswered && (isSelected || isCorrectOption);
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${showFeedback ? (isCorrectOption ? "border-success bg-success/10" : isSelected ? "border-destructive bg-destructive/10" : "border-border") : "border-border hover:border-primary"}`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                  {showFeedback && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {showFeedback && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              );
            })}
          </RadioGroup>
        </div>
        {isAnswered && (
          <div
            className={`p-4 rounded-lg ${isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
          >
            <p className="font-medium">{isCorrect ? "Correct!" : "Incorrect"}</p>
            <p className="text-sm mt-1">
              {isCorrect ? "Great job!" : `The correct answer is: ${question.options[question.correctAnswer]}`}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          {!isAnswered ? (
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null} className="flex-1" size="lg">
              Submit
            </Button>
          ) : currentQuestion < multipleChoiceQuestions.length - 1 ? (
            <Button onClick={handleNextQuestion} className="flex-1" size="lg">
              Next
            </Button>
          ) : (
            <Button onClick={() => setShowResult(true)} className="flex-1" size="lg">
              View Results
            </Button>
          )}
        </div>
        <div className="flex gap-1 justify-center">
          {multipleChoiceQuestions.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${answeredQuestions[index] ? "bg-primary" : index === currentQuestion ? "bg-primary/50" : "bg-muted"}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// --- MODULE DETAIL COMPONENT (MAIN COMPONENT) ---

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[] | string;
  correct_answer: string;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content?: string | object;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

const parseModuleContent = (content: any) => {
  if (!content) return { videoUrl: null, textContent: null };
  let parsedContent;
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      return { videoUrl: null, textContent: content };
    }
  } else if (typeof content === "object") {
    parsedContent = content;
  } else {
    return { videoUrl: null, textContent: null };
  }
  return {
    videoUrl: parsedContent.videoUrl || null,
    textContent: parsedContent.textContent || null,
  };
};

const ModuleDetail = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      return;
    }
    const fetchAllData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [moduleRes, progressRes, questionsRes] = await Promise.all([
        supabase.from("training_modules").select("id, title, description, content").eq("id", moduleId).single(),
        supabase
          .from("user_progress")
          .select("completed, progress_percentage")
          .eq("module_id", moduleId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("questions").select("id, question_text, options, correct_answer").eq("module_id", moduleId),
      ]);

      if (moduleRes.error) console.error("Error fetching module:", moduleRes.error.message);
      setModule(moduleRes.data);

      if (progressRes.error) console.error("Error fetching progress:", progressRes.error.message);
      setProgress(progressRes.data);

      if (questionsRes.error) {
        console.error("Error fetching questions:", questionsRes.error.message);
      } else if (questionsRes.data) {
        const formatted = questionsRes.data
          .map((q: DbQuestion) => {
            const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
            const correctIndex = options.findIndex((opt) => opt === q.correct_answer);
            return {
              question: q.question_text,
              options: options,
              correctAnswer: correctIndex,
            };
          })
          .filter((q) => q.correctAnswer !== -1);
        setQuizQuestions(formatted);
      }
      setLoading(false);
    };
    fetchAllData();
  }, [moduleId]);

  const handleModuleComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !moduleId) return;
    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to save progress.", variant: "destructive" });
    } else {
      toast({ title: "Module Complete!", description: "Progress saved." });
      setTimeout(() => navigate("/modules"), 1500);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!module) return <div className="p-6 text-center">Module not found.</div>;

  const { videoUrl, textContent } = parseModuleContent(module.content);
  const hasQuiz = quizQuestions.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/modules")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>
      <Card className="shadow-elevated">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
              <CardDescription className="text-base">{module.description}</CardDescription>
            </div>
            {progress?.completed && <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />}
          </div>
          {progress && !progress.completed && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Your Progress</span>
                <span className="font-medium">{progress.progress_percentage}%</span>
              </div>
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {videoUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video className="w-full h-full object-cover" controls preload="metadata">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          <div className="prose dark:prose-invert max-w-none">
            {textContent && <ReactMarkdown>{textContent}</ReactMarkdown>}
          </div>
          {hasQuiz && !progress?.completed && (
            <ModuleQuiz questions={quizQuestions} moduleId={moduleId} onComplete={handleModuleComplete} />
          )}
          {!hasQuiz && !progress?.completed && (
            <div className="text-center p-4 border-dashed border-2 rounded-lg">
              <p className="text-muted-foreground mb-4">This module does not have a quiz.</p>
              <Button onClick={handleModuleComplete}>Mark as Complete</Button>
            </div>
          )}
          {progress?.completed && (
            <div className="bg-success/10 border border-success p-6 rounded-lg text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-success mb-2">Module Completed</h3>
              <p className="text-muted-foreground">You have successfully completed this module.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
