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

  const [currentMCIndex, setCurrentMCIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [mcAnswered, setMcAnswered] = useState<boolean[]>(new Array(multipleChoiceQuestions.length).fill(false));
  const [mcScore, setMcScore] = useState(0);
  const [showMCResults, setShowMCResults] = useState(false);
  
  const [showOpenEnded, setShowOpenEnded] = useState(false);
  const [currentOEIndex, setCurrentOEIndex] = useState(0);
  const [openEndedAnswer, setOpenEndedAnswer] = useState("");
  const [oeGrades, setOeGrades] = useState<string[]>([]);
  const [oeFeedback, setOeFeedback] = useState<string[]>([]);
  const [submittingOpenEnded, setSubmittingOpenEnded] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  const currentMCQuestion = multipleChoiceQuestions[currentMCIndex];
  const currentOEQuestion = openEndedQuestions[currentOEIndex];

  const handleAnswerSelect = (index: number) => {
    if (!mcAnswered[currentMCIndex]) setSelectedAnswer(index);
  };

  const handleSubmitMCAnswer = () => {
    if (selectedAnswer === null) {
      toast({ title: "Please select an answer before submitting", variant: "destructive" });
      return;
    }

    const correctIndex = currentMCQuestion.options.findIndex((o) => o === currentMCQuestion.correct_answer);
    const isCorrect = selectedAnswer === correctIndex;
    if (isCorrect) setMcScore((s) => s + 1);

    const newAnswered = [...mcAnswered];
    newAnswered[currentMCIndex] = true;
    setMcAnswered(newAnswered);

    if (currentMCIndex + 1 === multipleChoiceQuestions.length) {
      setShowMCResults(true);
    } else {
      setCurrentMCIndex(currentMCIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handleSubmitOpenEndedAnswer = async () => {
    if (!openEndedAnswer.trim()) {
      toast({ title: "Please provide an answer before submitting", variant: "destructive" });
      return;
    }

    setSubmittingOpenEnded(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Grade with AI
      const { data: gradeData, error: gradeError } = await supabase.functions.invoke('grade-open-ended', {
        body: {
          answer: openEndedAnswer,
          question: currentOEQuestion.question,
          goodCriteria: currentOEQuestion.good_answer_criteria,
          mediumCriteria: currentOEQuestion.medium_answer_criteria,
          badCriteria: currentOEQuestion.bad_answer_criteria,
        }
      });

      if (gradeError) throw gradeError;

      const { grade, feedback } = gradeData;

      // Store the response with AI grade
      const { error: insertError } = await supabase
        .from("open_ended_responses")
        .insert({
          user_id: user.id,
          module_id: moduleId,
          question_id: currentOEQuestion.id,
          answer: openEndedAnswer,
          ai_grade: grade,
          ai_feedback: feedback,
          graded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setOeGrades([...oeGrades, grade]);
      setOeFeedback([...oeFeedback, feedback]);

      toast({ 
        title: `Grade: ${grade.toUpperCase()}`, 
        description: feedback 
      });

      if (currentOEIndex + 1 === openEndedQuestions.length) {
        setShowFinalResults(true);
      } else {
        setCurrentOEIndex(currentOEIndex + 1);
        setOpenEndedAnswer("");
      }
    } catch (error) {
      console.error("Error submitting open-ended response:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to grade response", 
        variant: "destructive" 
      });
    } finally {
      setSubmittingOpenEnded(false);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentMCIndex(0);
    setSelectedAnswer(null);
    setMcAnswered(new Array(multipleChoiceQuestions.length).fill(false));
    setMcScore(0);
    setShowMCResults(false);
    setShowOpenEnded(false);
    setCurrentOEIndex(0);
    setOpenEndedAnswer("");
    setOeGrades([]);
    setOeFeedback([]);
    setShowFinalResults(false);
  };

  const handleContinueToOpenEnded = () => {
    setShowMCResults(false);
    setShowOpenEnded(true);
  };

  // Final results after both sections
  if (showFinalResults) {
    const mcPercentage = Math.round((mcScore / multipleChoiceQuestions.length) * 100);
    const mcPassed = mcPercentage >= 70;
    
    const goodCount = oeGrades.filter(g => g === 'good').length;
    const oePercentage = openEndedQuestions.length > 0 
      ? Math.round((goodCount / openEndedQuestions.length) * 100) 
      : 100;
    const oePassed = oePercentage >= 70;
    
    const overallPassed = mcPassed && oePassed;

    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> Assessment Complete!
          </CardTitle>
          <Badge variant={overallPassed ? "default" : "destructive"}>
            {overallPassed ? "Passed" : "Needs Review"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Multiple Choice</h3>
              <div className="text-4xl font-bold text-primary">{mcPercentage}%</div>
              <p className="text-sm text-muted-foreground">
                {mcScore} out of {multipleChoiceQuestions.length} correct
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Short Answer Questions</h3>
              <div className="text-4xl font-bold text-primary">{oePercentage}%</div>
              <p className="text-sm text-muted-foreground">
                {goodCount} good, {oeGrades.filter(g => g === 'medium').length} medium, {oeGrades.filter(g => g === 'bad').length} needs improvement
              </p>
            </div>
          </div>

          {overallPassed ? (
            <>
              <p className="text-center text-success">
                Excellent work! You've demonstrated comprehensive understanding.
              </p>
              <Button className="w-full" size="lg" onClick={onComplete}>
                Complete Module & Continue
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-destructive">
                Please review the material and retake the assessment.
              </p>
              <Button className="w-full" size="lg" onClick={handleRetakeQuiz}>
                Retake Assessment
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // MC Results - intermediate screen
  if (showMCResults) {
    const percentage = Math.round((mcScore / multipleChoiceQuestions.length) * 100);
    const passed = percentage >= 70;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Multiple Choice Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p>
            You scored {mcScore} out of {multipleChoiceQuestions.length} questions correctly.
          </p>
          
          {passed && openEndedQuestions.length > 0 ? (
            <>
              <p className="text-success">Great! Now let's move to the short answer questions.</p>
              <Button className="w-full" size="lg" onClick={handleContinueToOpenEnded}>
                Continue to Short Answer Questions
              </Button>
            </>
          ) : passed && openEndedQuestions.length === 0 ? (
            <>
              <p className="text-success">Perfect! You've completed this module.</p>
              <Button className="w-full" size="lg" onClick={onComplete}>
                Complete Module
              </Button>
            </>
          ) : (
            <>
              <p className="text-destructive">
                You need 70% or higher to proceed. Please review and try again.
              </p>
              <Button className="w-full" size="lg" onClick={handleRetakeQuiz}>
                Retake Quiz
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (multipleChoiceQuestions.length === 0 && openEndedQuestions.length === 0) {
    return <div className="p-4 text-center text-muted">No assessment available.</div>;
  }

  // Open-ended questions section
  if (showOpenEnded) {
    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Short Answer Questions</CardTitle>
          <Badge variant="outline">
            Question {currentOEIndex + 1} of {openEndedQuestions.length}
          </Badge>
        </CardHeader>
        <CardContent>
          <h3 className="mb-4 font-semibold">{currentOEQuestion.question}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Provide a detailed answer. Your response will be graded immediately by AI.
          </p>
          <Textarea
            value={openEndedAnswer}
            onChange={(e) => setOpenEndedAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[150px] mb-4"
            disabled={submittingOpenEnded}
          />
          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleSubmitOpenEndedAnswer} 
            disabled={!openEndedAnswer.trim() || submittingOpenEnded}
          >
            {submittingOpenEnded ? "Grading..." : "Submit Answer"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Multiple choice quiz
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Multiple Choice Quiz</CardTitle>
        <Badge variant="outline">
          Question {currentMCIndex + 1} of {multipleChoiceQuestions.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <h3 className="mb-4 font-semibold">{currentMCQuestion.question_text}</h3>
        <RadioGroup
          value={selectedAnswer !== null ? selectedAnswer.toString() : ""}
          onValueChange={(val) => handleAnswerSelect(parseInt(val))}
          disabled={mcAnswered[currentMCIndex]}
        >
          {currentMCQuestion.options.map((option, idx) => {
            const correctIndex = currentMCQuestion.options.findIndex((o) => o === currentMCQuestion.correct_answer);
            const isAnswered = mcAnswered[currentMCIndex];
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
        {!mcAnswered[currentMCIndex] && (
          <Button size="lg" className="w-full" onClick={handleSubmitMCAnswer} disabled={selectedAnswer === null}>
            Submit Answer
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleQuiz;
