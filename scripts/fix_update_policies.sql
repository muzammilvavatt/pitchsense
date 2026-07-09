-- Enable users to update their own predictions and replies
CREATE POLICY "Users can update own predictions" ON predictions 
FOR UPDATE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own replies" ON replies 
FOR UPDATE USING (alias = (SELECT alias FROM public.profiles WHERE id = auth.uid()));
