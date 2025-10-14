/**
 * src/pages/ModuleDetail.tsx
 *
 * This component renders the detailed view for a single training module.
 * It now uses explicit relative paths for all imports to bypass the
 * persistent build error related to path alias resolution.
 */

// Import necessary hooks and components from React and other libraries
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import ReactMarkdown from "react-markdown";

// Import UI components using corrected relative paths
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Award } from "lucide-react";
import { useToast } from "../hooks/use-toast";

// --- All Quiz Logic is now inside this file ---

interface FormattedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  type?: string;
}

const ModuleQuizComponent = ({
  questions,
  moduleId,
  onComplete,
}: {
  questions: FormattedQuizQuestion[];
  moduleId?: string;
  onComplete?: () => void;
}) => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(new Array(questions.length).fill(false));

  const handleAnswerSelect = (answerIndex: number) => {
    if (!answeredQuestions[currentQuestion]) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }
    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = true;
    setAnsweredQuestions(newAnsweredQuestions);

    if (currentQuestion === questions.length - 1) {
      setShowResult(true);
      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      }
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setCurrentQuestion(currentQuestion + 1);
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
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
        <CardContent className="space-y-6 text-center">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p className="text-lg text-muted-foreground">
            You scored {score} out of {questions.length} questions correctly
          </p>
          {passed ? (
            <p className="text-success">Great job! This module will now be marked as complete.</p>
          ) : (
            <p className="text-destructive">Please review the module content and try again.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];
  const isAnswered = answeredQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assessment Quiz</CardTitle>
          <Badge variant="outline">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
          <RadioGroup
            value={selectedAnswer?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
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
              Submit Answer
            </Button>
          ) : currentQuestion < questions.length - 1 ? (
            <Button onClick={handleNextQuestion} className="flex-1" size="lg">
              Next Question
            </Button>
          ) : (
            <Button onClick={() => setShowResult(true)} className="flex-1" size="lg">
              View Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- TypeScript Interfaces ---
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
  return { videoUrl: parsedContent.videoUrl || null, textContent: parsedContent.textContent || null };
};

// --- Main ModuleDetail Component ---
const ModuleDetail = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<FormattedQuizQuestion[]>([]);
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
        const typedQuestions = questionsRes.data as DbQuestion[];
        const formatted = typedQuestions
          .map((q) => {
            const options = Array.isArray(q.options) ? q.options : JSON.parse((q.options as string) || "[]");
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
      toast({ title: "Error", description: "Failed to save your progress.", variant: "destructive" });
    } else {
      toast({ title: "Module Complete!", description: "Great job! Your progress has been saved." });
      setTimeout(() => navigate("/modules"), 1500);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found or failed to load.</div>;

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
            <ModuleQuizComponent questions={quizQuestions} moduleId={moduleId} onComplete={handleModuleComplete} />
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
              <p className="text-muted-foreground">You have successfully completed this training module.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
