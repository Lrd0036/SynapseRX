-- Add content and quiz fields to training_modules
ALTER TABLE training_modules 
ADD COLUMN content TEXT,
ADD COLUMN quiz_questions JSONB;