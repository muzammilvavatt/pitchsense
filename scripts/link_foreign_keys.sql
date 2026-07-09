-- 1. Clean up orphaned predictions (users you already deleted from Authentication)
DELETE FROM predictions 
WHERE alias NOT IN (SELECT alias FROM public.profiles);

-- 2. Clean up orphaned replies
DELETE FROM replies 
WHERE alias NOT IN (SELECT alias FROM public.profiles);

-- 3. Link predictions to the user profile with ON DELETE CASCADE
ALTER TABLE predictions 
ADD CONSTRAINT fk_predictions_alias 
FOREIGN KEY (alias) REFERENCES public.profiles(alias) ON DELETE CASCADE;

-- 4. Link replies to the user profile with ON DELETE CASCADE
ALTER TABLE replies 
ADD CONSTRAINT fk_replies_alias 
FOREIGN KEY (alias) REFERENCES public.profiles(alias) ON DELETE CASCADE;
