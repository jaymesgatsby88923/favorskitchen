-- Favor's Kitchen — tables + RLS policies only
-- Run once in Supabase SQL Editor on an empty public schema.

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE public.users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'student', 'instructor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredients (
  ingredient_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  recipe_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer,
  instructions text,
  image_url text,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active boolean DEFAULT true
);

CREATE TABLE public.recipe_ingredients (
  recipe_ingredient_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(ingredient_id) ON DELETE RESTRICT,
  quantity numeric,
  unit text,
  preparation text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.curricula (
  curriculum_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_weeks integer,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active boolean DEFAULT true
);

CREATE TABLE public.curriculum_weeks (
  week_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES public.curricula(curriculum_id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  title text NOT NULL,
  description text,
  publish_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.curriculum_week_recipes (
  week_id uuid NOT NULL REFERENCES public.curriculum_weeks(week_id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_id, recipe_id)
);

CREATE TABLE public.class_sessions (
  class_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.curriculum_weeks(week_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  class_type text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  max_students integer,
  status text NOT NULL DEFAULT 'scheduled',
  meeting_url text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  curriculum_id uuid NOT NULL REFERENCES public.curricula(curriculum_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_week_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own
  ON public.users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY users_select_admin
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY users_admin_all
  ON public.users FOR ALL
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

-- ingredients (admin only)
CREATE POLICY ingredients_admin_all
  ON public.ingredients FOR ALL
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

-- recipes
CREATE POLICY recipes_admin_all
  ON public.recipes FOR ALL
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

CREATE POLICY recipes_student_read_enrolled
  ON public.recipes FOR SELECT
  USING (
    status = 'published'
    AND active IS NOT FALSE
    AND EXISTS (
      SELECT 1
      FROM public.curriculum_week_recipes cwr
      JOIN public.curriculum_weeks cw ON cw.week_id = cwr.week_id
      JOIN public.enrollments e ON e.curriculum_id = cw.curriculum_id
      WHERE cwr.recipe_id = recipes.recipe_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- recipe_ingredients
CREATE POLICY recipe_ingredients_admin_all
  ON public.recipe_ingredients FOR ALL
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

CREATE POLICY recipe_ingredients_student_read_enrolled
  ON public.recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.recipe_id = recipe_ingredients.recipe_id
        AND r.status = 'published'
        AND r.active IS NOT FALSE
    )
    AND EXISTS (
      SELECT 1
      FROM public.curriculum_week_recipes cwr
      JOIN public.curriculum_weeks cw ON cw.week_id = cwr.week_id
      JOIN public.enrollments e ON e.curriculum_id = cw.curriculum_id
      WHERE cwr.recipe_id = recipe_ingredients.recipe_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- curricula
CREATE POLICY curricula_admin_all
  ON public.curricula FOR ALL
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

CREATE POLICY curricula_student_read_enrolled
  ON public.curricula FOR SELECT
  USING (
    status = 'published'
    AND active IS NOT FALSE
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.curriculum_id = curricula.curriculum_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- curriculum_weeks
CREATE POLICY curriculum_weeks_admin_all
  ON public.curriculum_weeks FOR ALL
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

CREATE POLICY curriculum_weeks_student_read_enrolled
  ON public.curriculum_weeks FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.curriculum_id = curriculum_weeks.curriculum_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- curriculum_week_recipes
CREATE POLICY curriculum_week_recipes_admin_all
  ON public.curriculum_week_recipes FOR ALL
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

CREATE POLICY curriculum_week_recipes_student_read_enrolled
  ON public.curriculum_week_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.curriculum_weeks cw ON cw.curriculum_id = e.curriculum_id
      WHERE cw.week_id = curriculum_week_recipes.week_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- class_sessions
CREATE POLICY class_sessions_admin_all
  ON public.class_sessions FOR ALL
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

CREATE POLICY class_sessions_student_read_enrolled
  ON public.class_sessions FOR SELECT
  USING (
    status <> 'cancelled'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.curriculum_weeks cw ON cw.curriculum_id = e.curriculum_id
      WHERE cw.week_id = class_sessions.week_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- enrollments
CREATE POLICY enrollments_select_own
  ON public.enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY enrollments_admin_all
  ON public.enrollments FOR ALL
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
