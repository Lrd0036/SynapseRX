import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
}

export const ModuleQuiz = ({ questions }: ModuleQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(questions.length).fill(false)
  );

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
    setAnsweredQuestions(new Array(questions.length).fill(false));
  };

  const getScorePercentage = () => Math.round((score / questions.length) * 100);

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
              You scored {score} out of {questions.length} questions correctly
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
          <Button onClick={handleRetakeQuiz} className="w-full" size="lg">
            Retake Quiz
          </Button>
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

        <div className="flex gap-1 justify-center">
          {questions.map((_, index) => (
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
