import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export const ModuleQuiz = ({ questions, moduleId, onComplete }: ModuleQuizProps) => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(questions.filter(q => q.type !== "open_ended").length).fill(false)
  );
  const [openEndedResponses, setOpenEndedResponses] = useState<Record<string, string>>({});
  const [showOpenEnded, setShowOpenEnded] = useState(false);

  // Filter questions by type
  const multipleChoiceQuestions = questions.filter(q => q.type !== "open_ended");
  const openEndedData = questions.find(q => q.type === "open_ended") as any;
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
      // Automatically show open-ended questions after quiz if they exist
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

    const { data: { user } } = await supabase.auth.getUser();
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
      
      // Call onComplete handler to mark module as complete
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getScorePercentage = () => Math.round((score / multipleChoiceQuestions.length) * 100);

  // Show open-ended questions
  if (showOpenEnded && openEndedQuestions) {
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle>Reflection Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Please answer the following open-ended questions to demonstrate your understanding. Your responses will be reviewed by your manager.
          </p>
          {openEndedQuestions.map((q: OpenEndedQuestion, index: number) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-${index}`} className="text-base font-medium">
                {index + 1}. {q.question}
              </Label>
              <Textarea
                id={`question-${index}`}
                placeholder="Type your response here..."
                value={openEndedResponses[q.question] || ""}
                onChange={(e) =>
                  setOpenEndedResponses({
                    ...openEndedResponses,
                    [q.question]: e.target.value,
                  })
                }
                rows={5}
                className="w-full"
              />
            </div>
          ))}
          <Button
            onClick={handleSubmitOpenEnded}
            disabled={
              Object.keys(openEndedResponses).length !== openEndedQuestions.length ||
              Object.values(openEndedResponses).some(r => !r.trim())
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

  // Show results
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
            <Badge variant={passed ? "default" : "destructive"}>
              {passed ? "Passed" : "Review Needed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{percentage}%</div>
            <p className="text-lg text-muted-foreground">
              You scored {score} out of {multipleChoiceQuestions.length} questions correctly
            </p>
            {passed ? (
              <p className="text-success">
                Great job! You have demonstrated understanding of the material.
              </p>
            ) : (
              <p className="text-destructive">
                Please review the module content and try again.
              </p>
            )}
          </div>
          {!openEndedQuestions || openEndedQuestions.length === 0 ? (
            <Button onClick={handleRetakeQuiz} className="w-full" size="lg">
              Retake Quiz
            </Button>
          ) : (
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-muted-foreground">
                Please complete the reflection questions to finish this module.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show current question
  const question = multipleChoiceQuestions[currentQuestion];
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
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                    showFeedback
                      ? isCorrectOption
                        ? "border-success bg-success/10"
                        : isSelected
                        ? "border-destructive bg-destructive/10"
                        : "border-border"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                  {showFeedback && isCorrectOption && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {showFeedback && isSelected && !isCorrectOption && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {isAnswered && (
          <div
            className={`p-4 rounded-lg ${
              isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            <p className="font-medium">
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="text-sm mt-1">
              {isCorrect
                ? "Great job! You selected the right answer."
                : `The correct answer is: ${question.options[question.correctAnswer]}`}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {!isAnswered ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="flex-1"
              size="lg"
            >
              Submit Answer
            </Button>
          ) : currentQuestion < multipleChoiceQuestions.length - 1 ? (
            <Button onClick={handleNextQuestion} className="flex-1" size="lg">
              Next Question
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
              className={`h-2 flex-1 rounded-full transition-colors ${
                answeredQuestions[index]
                  ? "bg-primary"
                  : index === currentQuestion
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
