// src/components/ModuleQuiz.tsx
import React, { useState, FC, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";

interface QuizQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
  moduleId: string;
  onComplete: () => void;
}

const ModuleQuiz: FC<ModuleQuizProps> = ({ questions, moduleId, onComplete }) => {
  const { toast } = useToast();

  const multipleChoiceQuestions = questions.filter((q) => q.question_type === "multiple_choice");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean[]>(new Array(multipleChoiceQuestions.length).fill(false));
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    console.log("DEBUG: Quiz questions received", questions);
  }, [questions]);

  const currentQuestion = multipleChoiceQuestions[currentIndex];

  const handleAnswerSelect = (index: number) => {
    if (!answered[currentIndex]) setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast({ title: "Please select an answer before submitting", description: "", variant: "destructive" });
      return;
    }
    const correctIndex = currentQuestion.options.findIndex((o) => o === currentQuestion.correct_answer);
    const isCorrect = selectedAnswer === correctIndex;
    if (isCorrect) setScore((s) => s + 1);

    const newAnswered = [...answered];
    newAnswered[currentIndex] = true;
    setAnswered(newAnswered);

    if (currentIndex + 1 === multipleChoiceQuestions.length) {
      setShowResults(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswered(new Array(multipleChoiceQuestions.length).fill(false));
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    const percentage = Math.round((score / multipleChoiceQuestions.length) * 100);
    const passed = percentage >= 70; // Pass rate is 70%
    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> Quiz Completed!
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

          {/* CONDITIONAL BUTTON LOGIC ADDED HERE */}
          {passed ? (
            <Button className="w-full" size="lg" onClick={onComplete}>
              Finalize Module & Continue
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={handleRetakeQuiz}>
              Retake Quiz
            </Button>
          )}
          {/* END CONDITIONAL BUTTON LOGIC */}
        </CardContent>
      </Card>
    );
  }

  if (multipleChoiceQuestions.length === 0) {
    return <div className="p-4 text-center text-muted">No assessment quiz available.</div>;
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Assessment Quiz</CardTitle>
        <Badge variant="outline">
          Question {currentIndex + 1} of {multipleChoiceQuestions.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <h3 className="mb-4 font-semibold">{currentQuestion.question_text}</h3>
        <RadioGroup
          value={selectedAnswer !== null ? selectedAnswer.toString() : ""}
          onValueChange={(val) => handleAnswerSelect(parseInt(val))}
          disabled={answered[currentIndex]}
        >
          {currentQuestion.options.map((option, idx) => {
            const correctIndex = currentQuestion.options.findIndex((o) => o === currentQuestion.correct_answer);
            const isAnswered = answered[currentIndex];
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 mb-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isAnswered
                    ? idx === correctIndex
                      ? "bg-green-100 border-green-500"
                      : selectedAnswer === idx
                        ? "bg-red-100 border-red-500"
                        : "border-gray-300"
                    : "border-gray-300 hover:border-blue-500"
                }`}
              >
                <RadioGroupItem id={`option-${idx}`} value={idx.toString()} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
                {isAnswered && idx === correctIndex && <CheckCircle2 className="text-green-500" />}
                {isAnswered && selectedAnswer === idx && idx !== correctIndex && <XCircle className="text-red-500" />}
              </div>
            );
          })}
        </RadioGroup>
        {!answered[currentIndex] && (
          <Button size="lg" className="w-full" onClick={handleSubmitAnswer} disabled={selectedAnswer === null}>
            Submit Answer
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleQuiz;
