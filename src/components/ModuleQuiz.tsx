import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { supabase } from "../integrations/supabaseclient";
import { useToast } from "../hooks/use-toast";

interface QuizQuestion {
  id?: string | number;
  question_text: string;
  options: string[];
  correct_answer: string;
  type?: string;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
  moduleId?: string;
  onComplete?: () => void;
}

const ModuleQuiz: React.FC<ModuleQuizProps> = ({ questions, moduleId, onComplete }) => {
  const { toast } = useToast();

  const multipleChoiceQuestions = questions.filter((q) => q.type !== "openended");
  const openEndedQuestions = questions.filter((q) => q.type === "openended");

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(multipleChoiceQuestions.length).fill(false),
  );
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showOpenEnded, setShowOpenEnded] = useState(false);
  const [openEndedAnswers, setOpenEndedAnswers] = useState<Record<string, string>>({});

  const handleAnswerSelection = (index: number) => {
    if (!answeredQuestions[currentQuestionIndex]) {
      setSelectedAnswerIndex(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswerIndex === null) return;

    const currentQuestion = multipleChoiceQuestions[currentQuestionIndex];
    const correctAnswerIndex = currentQuestion.options.indexOf(currentQuestion.correct_answer);

    const isCorrect = selectedAnswerIndex === correctAnswerIndex;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const newAnswered = [...answeredQuestions];
    newAnswered[currentQuestionIndex] = true;
    setAnsweredQuestions(newAnswered);

    if (currentQuestionIndex === multipleChoiceQuestions.length - 1) {
      if (openEndedQuestions.length > 0) {
        setShowOpenEnded(true);
      }
      setShowResults(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswerIndex(null);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setAnsweredQuestions(new Array(multipleChoiceQuestions.length).fill(false));
    setScore(0);
    setShowResults(false);
    setShowOpenEnded(false);
    setOpenEndedAnswers({});
  };

  const handleOpenEndedChange = (question: string, value: string) => {
    setOpenEndedAnswers((prev) => ({
      ...prev,
      [question]: value,
    }));
  };

  const handleSubmitOpenEnded = async () => {
    if (!moduleId) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }

    const userId = userData.user.id;

    const responses = Object.entries(openEndedAnswers).map(([question, response]) => ({
      userid: userId,
      moduleid: moduleId,
      question,
      response,
    }));

    const { error } = await supabase.from("moduleresponses").insert(responses);

    if (error) {
      toast({ title: "Error", description: "Failed to submit open-ended responses", variant: "destructive" });
      return;
    }

    toast({ title: "Thank you!", description: "Responses submitted successfully." });

    setShowOpenEnded(false);
    setOpenEndedAnswers({});

    if (onComplete) onComplete();
  };

  if (showOpenEnded && openEndedQuestions.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reflection Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Please answer these open-ended questions to complete the module.</p>
          {openEndedQuestions.map((q, index) => (
            <div key={index}>
              <Label htmlFor={`openended-${index}`}>
                {index + 1}. {q.question_text}
              </Label>
              <textarea
                id={`openended-${index}`}
                className="w-full p-2 border rounded-md"
                rows={4}
                value={openEndedAnswers[q.question_text] || ""}
                onChange={(e) => handleOpenEndedChange(q.question_text, e.target.value)}
              />
            </div>
          ))}
          <Button
            onClick={handleSubmitOpenEnded}
            disabled={
              Object.keys(openEndedAnswers).length !== openEndedQuestions.length ||
              Object.values(openEndedAnswers).some((ans) => ans.trim() === "")
            }
            className="w-full mt-4"
            size="lg"
          >
            Submit and Complete Module
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / multipleChoiceQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Quiz Completed!
          </CardTitle>
          <Badge variant={passed ? "default" : "destructive"}>{passed ? "Passed" : "Needs Review"}</Badge>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p>
            You scored {score} out of {multipleChoiceQuestions.length} questions correctly.
          </p>
          {passed ? (
            <p className="text-success">Great job! You have demonstrated understanding.</p>
          ) : (
            <p className="text-destructive">Please review the module and try again.</p>
          )}
          {openEndedQuestions.length === 0 && (
            <Button onClick={handleRetakeQuiz} className="w-full" size="lg">
              Retake Quiz
            </Button>
          )}
          {openEndedQuestions.length > 0 && (
            <p className="p-4 rounded border border-muted text-muted">
              Please complete the open-ended reflection questions below.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = multipleChoiceQuestions[currentQuestionIndex];
  const correctAnswerIndex = currentQuestion.options.indexOf(currentQuestion.correct_answer);
  const isAnswered = answeredQuestions[currentQuestionIndex];

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Assessment Quiz</CardTitle>
        <Badge variant="outline">
          Question {currentQuestionIndex + 1} of {multipleChoiceQuestions.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <h3 className="mb-4 font-semibold">{currentQuestion.question_text}</h3>
        <RadioGroup
          value={selectedAnswerIndex !== null ? selectedAnswerIndex.toString() : ""}
          onValueChange={(value) => setSelectedAnswerIndex(parseInt(value))}
          disabled={isAnswered}
        >
          {currentQuestion.options.map((option, idx) => {
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 mb-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isAnswered
                    ? idx === correctAnswerIndex
                      ? "bg-green-100 border-green-500"
                      : selectedAnswerIndex === idx
                        ? "bg-red-100 border-red-500"
                        : "border-gray-300"
                    : "border-gray-300 hover:border-blue-500"
                }`}
              >
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
                {isAnswered && idx === correctAnswerIndex && <CheckCircle2 className="text-green-500" />}
                {isAnswered && selectedAnswerIndex === idx && idx !== correctAnswerIndex && (
                  <XCircle className="text-red-500" />
                )}
              </div>
            );
          })}
        </RadioGroup>
        <div className="mt-4 flex gap-4">
          {!isAnswered && (
            <Button onClick={handleSubmitAnswer} disabled={selectedAnswerIndex === null} size="lg" className="flex-1">
              Submit Answer
            </Button>
          )}
          {isAnswered && currentQuestionIndex < multipleChoiceQuestions.length - 1 && (
            <Button
              onClick={() => {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedAnswerIndex(null);
              }}
              size="lg"
              className="flex-1"
            >
              Next Question
            </Button>
          )}
          {isAnswered && currentQuestionIndex === multipleChoiceQuestions.length - 1 && (
            <Button onClick={() => setShowResults(true)} size="lg" className="flex-1">
              View Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleQuiz;
