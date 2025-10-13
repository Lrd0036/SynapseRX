import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}

export const Quiz = ({ questions, onComplete }: QuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const finalScore = selectedAnswers.reduce((acc, answer, index) => {
        return answer === questions[index].correctAnswer ? acc + 1 : acc;
      }, 0);
      setScore(finalScore);
      setShowResults(true);
      onComplete?.(finalScore);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setScore(0);
  };

  const isAnswered = selectedAnswers[currentQuestion] !== undefined;
  const percentageScore = Math.round((score / questions.length) * 100);

  if (showResults) {
    return (
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-primary">{percentageScore}%</div>
            <p className="text-xl text-muted-foreground">
              You got {score} out of {questions.length} questions correct
            </p>
            {percentageScore >= 80 ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-semibold">Great job! You passed!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <XCircle className="h-6 w-6" />
                <span className="font-semibold">Keep studying to improve your score</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Answer Review</h3>
            {questions.map((question, index) => {
              const userAnswer = selectedAnswers[index];
              const isCorrect = userAnswer === question.correctAnswer;
              return (
                <div key={question.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{question.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your answer: {question.options[userAnswer]}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-success mt-1">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleReset} className="w-full" size="lg">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium">
            {selectedAnswers.filter(a => a !== undefined).length}/{questions.length} answered
          </span>
        </div>
        <CardTitle className="text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={cn(
                "w-full p-4 text-left rounded-lg border-2 transition-all",
                "hover:border-primary hover:bg-primary/5",
                selectedAnswers[currentQuestion] === index
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selectedAnswers[currentQuestion] === index
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedAnswers[currentQuestion] === index && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!isAnswered}>
            {currentQuestion === questions.length - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
