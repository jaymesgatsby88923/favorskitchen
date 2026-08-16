-- Recipe steps table (replaces recipes.instructions text field)
-- Skip if already applied manually.

CREATE TABLE IF NOT EXISTS public.recipe_steps (
  step_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON public.recipe_steps(recipe_id);

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_steps_admin_all
  ON public.recipe_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY recipe_steps_student_read_enrolled
  ON public.recipe_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.recipe_id = recipe_steps.recipe_id
        AND r.status = 'published'
        AND r.active IS NOT FALSE
    )
    AND EXISTS (
      SELECT 1
      FROM public.curriculum_week_recipes cwr
      JOIN public.curriculum_weeks cw ON cw.week_id = cwr.week_id
      JOIN public.enrollments e ON e.curriculum_id = cw.curriculum_id
      WHERE cwr.recipe_id = recipe_steps.recipe_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- ALTER TABLE public.recipes DROP COLUMN IF EXISTS instructions;
