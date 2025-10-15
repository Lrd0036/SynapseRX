// src/components/ModuleQuiz.tsx
import React, { useState, FC, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  id: string;
  module_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  created_at: string;
}

interface OpenEndedQuestion {
  id: string;
  module_id: string;
  question: string;
  good_answer_criteria: string;
  medium_answer_criteria: string;
  bad_answer_criteria: string;
}

interface ModuleQuizProps {
  questions: QuizQuestion[];
  openEndedQuestions: OpenEndedQuestion[];
  moduleId: string;
  onComplete: () => void;
}

const ModuleQuiz: FC<ModuleQuizProps> = ({ questions, openEndedQuestions, moduleId, onComplete }) => {
  const { toast } = useToast();

  const multipleChoiceQuestions = questions.filter((q) => q.question_type === "multiple_choice");
  const totalQuestions = multipleChoiceQuestions.length + openEndedQuestions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [openEndedAnswer, setOpenEndedAnswer] = useState("");
  const [answered, setAnswered] = useState<boolean[]>(new Array(totalQuestions).fill(false));
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [submittingOpenEnded, setSubmittingOpenEnded] = useState(false);

  useEffect(() => {
    console.log("DEBUG: Quiz questions received", questions);
  }, [questions]);

  const isOpenEndedQuestion = currentIndex >= multipleChoiceQuestions.length;
  const currentMCQuestion = !isOpenEndedQuestion ? multipleChoiceQuestions[currentIndex] : null;
  const currentOpenEndedQuestion = isOpenEndedQuestion 
    ? openEndedQuestions[currentIndex - multipleChoiceQuestions.length] 
    : null;

  const handleAnswerSelect = (index: number) => {
    if (!answered[currentIndex]) setSelectedAnswer(index);
  };

  const handleSubmitAnswer = async () => {
    if (isOpenEndedQuestion) {
      // Handle open-ended question
      if (!openEndedAnswer.trim()) {
        toast({ title: "Please provide an answer before submitting", variant: "destructive" });
        return;
      }

      setSubmittingOpenEnded(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Store the response in the database
        const { error } = await (supabase as any)
          .from("open_ended_responses")
          .insert({
            user_id: user.id,
            module_id: moduleId,
            question_id: currentOpenEndedQuestion!.id,
            response_text: openEndedAnswer,
          });

        if (error) throw error;

        toast({ title: "Response submitted", description: "Your answer will be graded by the pharmacist" });

        const newAnswered = [...answered];
        newAnswered[currentIndex] = true;
        setAnswered(newAnswered);

        if (currentIndex + 1 === totalQuestions) {
          setShowResults(true);
        } else {
          setCurrentIndex(currentIndex + 1);
          setOpenEndedAnswer("");
        }
      } catch (error) {
        console.error("Error submitting open-ended response:", error);
        toast({ title: "Error", description: "Failed to submit response", variant: "destructive" });
      } finally {
        setSubmittingOpenEnded(false);
      }
    } else {
      // Handle multiple choice question
      if (selectedAnswer === null) {
        toast({ title: "Please select an answer before submitting", variant: "destructive" });
        return;
      }
      const correctIndex = currentMCQuestion!.options.findIndex((o) => o === currentMCQuestion!.correct_answer);
      const isCorrect = selectedAnswer === correctIndex;
      if (isCorrect) setScore((s) => s + 1);

      const newAnswered = [...answered];
      newAnswered[currentIndex] = true;
      setAnswered(newAnswered);

      if (currentIndex + 1 === totalQuestions) {
        setShowResults(true);
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
      }
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setOpenEndedAnswer("");
    setAnswered(new Array(totalQuestions).fill(false));
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

  if (totalQuestions === 0) {
    return <div className="p-4 text-center text-muted">No assessment quiz available.</div>;
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Assessment Quiz</CardTitle>
        <Badge variant="outline">
          Question {currentIndex + 1} of {totalQuestions}
        </Badge>
      </CardHeader>
      <CardContent>
        {isOpenEndedQuestion ? (
          // Open-ended question
          <>
            <div className="mb-2">
              <Badge variant="secondary">Open-Ended Question</Badge>
            </div>
            <h3 className="mb-4 font-semibold">{currentOpenEndedQuestion!.question}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide a detailed answer. Your response will be graded by a pharmacist.
            </p>
            <Textarea
              value={openEndedAnswer}
              onChange={(e) => setOpenEndedAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[150px] mb-4"
              disabled={answered[currentIndex]}
            />
            {!answered[currentIndex] && (
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handleSubmitAnswer} 
                disabled={!openEndedAnswer.trim() || submittingOpenEnded}
              >
                {submittingOpenEnded ? "Submitting..." : "Submit Answer"}
              </Button>
            )}
          </>
        ) : (
          // Multiple choice question
          <>
            <div className="mb-2">
              <Badge variant="secondary">Multiple Choice</Badge>
            </div>
            <h3 className="mb-4 font-semibold">{currentMCQuestion!.question_text}</h3>
            <RadioGroup
              value={selectedAnswer !== null ? selectedAnswer.toString() : ""}
              onValueChange={(val) => handleAnswerSelect(parseInt(val))}
              disabled={answered[currentIndex]}
            >
              {currentMCQuestion!.options.map((option, idx) => {
                const correctIndex = currentMCQuestion!.options.findIndex((o) => o === currentMCQuestion!.correct_answer);
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleQuiz;
