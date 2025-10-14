import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Button from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import Label from "../components/ui/label";
import Textarea from "../components/ui/textarea";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import Badge from "../components/ui/badge";
import supabase from "../integrations/supabaseClient";
import useToast from "../hooks/use-toast";

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

const ModuleQuiz: React.FC<ModuleQuizProps> = ({ questions, moduleId, onComplete }) => {
  const toast = useToast();

  const multipleChoiceQuestions = questions.filter((q) => q.type !== "openended");
  const openEndedData = questions.find((q) => q.type === "openended") as { questions: OpenEndedQuestion[] } | undefined;
  const openEndedQuestions = openEndedData?.questions || [];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(multipleChoiceQuestions.length).fill(false),
  );

  const [showOpenEnded, setShowOpenEnded] = useState(false);
  const [openEndedResponses, setOpenEndedResponses] = useState<Record<string, string>>({});

  const handleAnswerSelect = (answerIndex: number) => {
    if (!answeredQuestions[currentQuestion]) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === multipleChoiceQuestions[currentQuestion].correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const newAnsweredQuestions = [...answeredQuestions];
    newAnsweredQuestions[currentQuestion] = true;
    setAnsweredQuestions(newAnsweredQuestions);

    if (currentQuestion === multipleChoiceQuestions.length - 1) {
      setShowResult(true);
      if (openEndedQuestions.length > 0) {
        setTimeout(() => setShowOpenEnded(true), 1500);
      }
    } else {
      setSelectedAnswer(null);
      setCurrentQuestion(currentQuestion + 1);
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
    setShowOpenEnded(false);
    setOpenEndedResponses({});
  };

  const handleOpenEndedChange = (question: string, value: string) => {
    setOpenEndedResponses((prev) => ({
      ...prev,
      [question]: value,
    }));
  };

  const handleSubmitOpenEnded = async () => {
    if (!moduleId || openEndedQuestions.length === 0) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const userId = userData.user.id;

    try {
      const responses = Object.entries(openEndedResponses).map(([question, response]) => ({
        userid: userId,
        moduleid: moduleId,
        question,
        response,
      }));

      const { error } = await supabase.from("moduleresponses").insert(responses);

      if (error) throw error;

      toast({
        title: "Module completed!",
        description: "Your responses have been submitted.",
      });

      setShowOpenEnded(false);
      setOpenEndedResponses({});
      if (onComplete) onComplete();
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getScorePercentage = () => Math.round((score / multipleChoiceQuestions.length) * 100);

  if (showOpenEnded && openEndedQuestions.length > 0) {
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle>Reflection Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Please answer the following open-ended questions to demonstrate your understanding. Your responses will be
            reviewed by your manager.
          </p>
          {openEndedQuestions.map((q, i) => (
            <div key={i}>
              <Label htmlFor={`question-${i}`} className="font-medium mb-2 block">
                {i + 1}. {q.question}
              </Label>
              <Textarea
                id={`question-${i}`}
                placeholder="Type your response here..."
                rows={5}
                className="w-full"
                value={openEndedResponses[q.question] || ""}
                onChange={(e) => handleOpenEndedChange(q.question, e.target.value)}
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
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> Quiz Complete!
          </CardTitle>
          <Badge variant={passed ? "default" : "destructive"}>{passed ? "Passed" : "Review Needed"}</Badge>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p className="text-lg text-muted-foreground">
            You scored {score} out of {multipleChoiceQuestions.length} questions correctly
          </p>
          {passed ? (
            <p className="text-success">Great job! You have demonstrated understanding of the material.</p>
          ) : (
            <p className="text-destructive">Please review the module content and try again.</p>
          )}
          {openEndedQuestions.length === 0 && (
            <Button onClick={handleRetakeQuiz} size="lg" className="w-full">
              Retake Quiz
            </Button>
          )}
          {openEndedQuestions.length > 0 && (
            <p className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
              Please complete the reflection questions to finish this module.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = multipleChoiceQuestions[currentQuestion];
  const isAnswered = answeredQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Card className="shadow-elevated">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Assessment Quiz</CardTitle>
        <Badge variant="outline">
          Question {currentQuestion + 1} of {multipleChoiceQuestions.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
        <RadioGroup
          value={selectedAnswer !== null ? selectedAnswer.toString() : ""}
          onValueChange={(value) => handleAnswerSelect(parseInt(value))}
          disabled={isAnswered}
        >
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;
            const showFeedback = isAnswered;

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
                    : "border-border hover:border-primary cursor-pointer"
                }`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} className="cursor-pointer" />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
                {showFeedback && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-success" />}
                {showFeedback && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-destructive" />}
              </div>
            );
          })}
        </RadioGroup>

        <div className="mt-4 flex gap-3">
          {!isAnswered && (
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null} size="lg" className="flex-1">
              Submit Answer
            </Button>
          )}
          {isAnswered && currentQuestion < multipleChoiceQuestions.length - 1 && (
            <Button onClick={handleNextQuestion} size="lg" className="flex-1">
              Next Question
            </Button>
          )}
          {isAnswered && currentQuestion === multipleChoiceQuestions.length - 1 && (
            <Button onClick={() => setShowResult(true)} size="lg" className="flex-1">
              View Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleQuiz;
