-- Schema-only snapshot of public application objects, 2026-09-29.

-- For an EMPTY Supabase project ONLY. No user data or credentials.

-- Historical migrations below are already represented; do not replay them on top.

BEGIN;

SET LOCAL search_path = public, extensions;

CREATE TABLE public."lessons" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "student_id" uuid NOT NULL,
 "language" text,
 "topic" text,
 "started_at" timestamp with time zone DEFAULT now() NOT NULL,
 "ended_at" timestamp with time zone,
 "transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "summary" text,
 "ai_feedback" text,
 "lesson_score" smallint,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."mistakes" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "student_id" uuid NOT NULL,
 "lesson_id" uuid,
 "language" text,
 "category" text,
 "original_text" text NOT NULL,
 "corrected_text" text,
 "explanation" text,
 "occurrences" integer DEFAULT 1 NOT NULL,
 "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
 "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
 "next_review_at" timestamp with time zone,
 "resolved" boolean DEFAULT false NOT NULL
);

CREATE TABLE public."profiles" (
 "id" uuid NOT NULL,
 "name" text,
 "native_language" text DEFAULT 'pl'::text,
 "target_language" text DEFAULT 'en'::text,
 "level" text DEFAULT 'A1'::text,
 "learning_goal" text,
 "interests" text,
 "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."skill_progress" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "student_id" uuid NOT NULL,
 "language" text NOT NULL,
 "skill" text NOT NULL,
 "score" numeric DEFAULT 0 NOT NULL,
 "evidence_count" integer DEFAULT 0 NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."student_memory" (
 "legacy_user_id" text NOT NULL,
 "name" text,
 "gender" text DEFAULT 'unknown'::text,
 "language" text DEFAULT 'włoski'::text,
 "level" text,
 "last_lesson_topic" text,
 "what_was_practiced" text,
 "words_to_review" text,
 "mistakes_to_review" text,
 "next_lesson_plan" text,
 "updated_at" timestamp with time zone DEFAULT now(),
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "user_id" uuid,
 "wp_user_id" bigint
);

CREATE TABLE public."student_memory_history" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "wp_user_id" bigint NOT NULL,
 "language" text NOT NULL,
 "memory" jsonb NOT NULL,
 "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."vocabulary" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "student_id" uuid NOT NULL,
 "lesson_id" uuid,
 "language" text,
 "phrase" text NOT NULL,
 "translation" text,
 "example_sentence" text,
 "status" text DEFAULT 'new'::text NOT NULL,
 "mastery_score" smallint DEFAULT 0 NOT NULL,
 "times_seen" integer DEFAULT 1 NOT NULL,
 "times_correct" integer DEFAULT 0 NOT NULL,
 "times_wrong" integer DEFAULT 0 NOT NULL,
 "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
 "next_review_at" timestamp with time zone
);

ALTER TABLE public."lessons" ADD CONSTRAINT "lessons_lesson_score_check" CHECK (((lesson_score >= 0) AND (lesson_score <= 100)));

ALTER TABLE public."lessons" ADD CONSTRAINT "lessons_pkey" PRIMARY KEY (id);

ALTER TABLE public."mistakes" ADD CONSTRAINT "mistakes_pkey" PRIMARY KEY (id);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE public."skill_progress" ADD CONSTRAINT "skill_progress_pkey" PRIMARY KEY (id);

ALTER TABLE public."skill_progress" ADD CONSTRAINT "skill_progress_score_check" CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)));

ALTER TABLE public."skill_progress" ADD CONSTRAINT "skill_progress_student_id_language_skill_key" UNIQUE (student_id, language, skill);

ALTER TABLE public."student_memory" ADD CONSTRAINT "student_memory_pkey" PRIMARY KEY (id);

ALTER TABLE public."student_memory" ADD CONSTRAINT "student_memory_user_id_unique" UNIQUE (user_id);

ALTER TABLE public."student_memory_history" ADD CONSTRAINT "student_memory_history_pkey" PRIMARY KEY (id);

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_mastery_score_check" CHECK (((mastery_score >= 0) AND (mastery_score <= 100)));

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_pkey" PRIMARY KEY (id);

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'learning'::text, 'review'::text, 'mastered'::text])));

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_student_id_language_phrase_key" UNIQUE (student_id, language, phrase);

ALTER TABLE public."lessons" ADD CONSTRAINT "lessons_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_memory(id) ON DELETE CASCADE;

ALTER TABLE public."mistakes" ADD CONSTRAINT "mistakes_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE public."mistakes" ADD CONSTRAINT "mistakes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_memory(id) ON DELETE CASCADE;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."skill_progress" ADD CONSTRAINT "skill_progress_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_memory(id) ON DELETE CASCADE;

ALTER TABLE public."student_memory" ADD CONSTRAINT "student_memory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE public."vocabulary" ADD CONSTRAINT "vocabulary_student_id_fkey" FOREIGN KEY (student_id) REFERENCES student_memory(id) ON DELETE CASCADE;

CREATE INDEX lessons_started_at_idx ON public.lessons USING btree (student_id, started_at DESC);

CREATE INDEX lessons_student_id_idx ON public.lessons USING btree (student_id);

CREATE INDEX mistakes_review_idx ON public.mistakes USING btree (student_id, next_review_at);

CREATE INDEX mistakes_student_id_idx ON public.mistakes USING btree (student_id);

CREATE INDEX skill_progress_student_id_idx ON public.skill_progress USING btree (student_id);

CREATE INDEX student_memory_history_user_language_time ON public.student_memory_history USING btree (wp_user_id, language, recorded_at DESC);

CREATE UNIQUE INDEX student_memory_wp_language_unique ON public.student_memory USING btree (wp_user_id, language) WHERE (wp_user_id IS NOT NULL);

CREATE INDEX vocabulary_review_idx ON public.vocabulary USING btree (student_id, next_review_at);

CREATE INDEX vocabulary_student_id_idx ON public.vocabulary USING btree (student_id);

CREATE OR REPLACE FUNCTION public.create_student_memory_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  if not exists (
    select 1
    from public.student_memory
    where user_id = new.id
  ) then

    insert into public.student_memory (
      id,
      legacy_user_id,
      user_id,
      name,
      updated_at
    )
    values (
      gen_random_uuid(),
      'auth_' || new.id::text,
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(
          coalesce(new.email, new.phone, new.id::text),
          '@',
          1
        )
      ),
      now()
    );

  end if;

  return new;
end;
$function$
;

REVOKE ALL ON FUNCTION public.create_student_memory_for_new_user() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_student_memory_for_new_user() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_student_memory_for_new_user() TO "postgres";

GRANT EXECUTE ON FUNCTION public.create_student_memory_for_new_user() TO "anon";

GRANT EXECUTE ON FUNCTION public.create_student_memory_for_new_user() TO "authenticated";

GRANT EXECUTE ON FUNCTION public.create_student_memory_for_new_user() TO "service_role";

CREATE OR REPLACE FUNCTION public.linguai_save_memory(p_wp_user_id bigint, p_language text, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE saved public.student_memory; result jsonb;
BEGIN
 IF p_wp_user_id IS NULL OR p_wp_user_id<=0 OR p_language IS NULL OR p_language NOT IN ('angielski','hiszpański','włoski','chiński') OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
 RAISE EXCEPTION 'Invalid memory request' USING ERRCODE='22023'; END IF;
 IF p_patch ? 'level' AND coalesce(p_patch->>'level','') NOT IN ('','A0','A1','A2','B1','B2','C1') THEN
 RAISE EXCEPTION 'Invalid level' USING ERRCODE='22023'; END IF;
 INSERT INTO public.student_memory(legacy_user_id,wp_user_id,language,name,gender,level,last_lesson_topic,what_was_practiced,words_to_review,mistakes_to_review,next_lesson_plan,updated_at)
 VALUES('wp_'||p_wp_user_id||'_'||p_language,p_wp_user_id,p_language,p_patch->>'name',coalesce(p_patch->>'gender','unknown'),p_patch->>'level',p_patch->>'last_lesson_topic',p_patch->>'what_was_practiced',p_patch->>'words_to_review',p_patch->>'mistakes_to_review',p_patch->>'next_lesson_plan',clock_timestamp())
 ON CONFLICT(wp_user_id,language) WHERE wp_user_id IS NOT NULL DO UPDATE SET
 name=CASE WHEN p_patch ? 'name' THEN excluded.name ELSE student_memory.name END,
 gender=CASE WHEN p_patch ? 'gender' THEN excluded.gender ELSE student_memory.gender END,
 level=CASE WHEN p_patch ? 'level' THEN excluded.level ELSE student_memory.level END,
 last_lesson_topic=CASE WHEN p_patch ? 'last_lesson_topic' THEN excluded.last_lesson_topic ELSE student_memory.last_lesson_topic END,
 what_was_practiced=CASE WHEN p_patch ? 'what_was_practiced' THEN excluded.what_was_practiced ELSE student_memory.what_was_practiced END,
 words_to_review=CASE WHEN p_patch ? 'words_to_review' THEN excluded.words_to_review ELSE student_memory.words_to_review END,
 mistakes_to_review=CASE WHEN p_patch ? 'mistakes_to_review' THEN excluded.mistakes_to_review ELSE student_memory.mistakes_to_review END,
 next_lesson_plan=CASE WHEN p_patch ? 'next_lesson_plan' THEN excluded.next_lesson_plan ELSE student_memory.next_lesson_plan END,
 updated_at=excluded.updated_at
 RETURNING * INTO saved;
 result=to_jsonb(saved)-'legacy_user_id'-'user_id';
 INSERT INTO public.student_memory_history(wp_user_id,language,memory) VALUES(p_wp_user_id,p_language,result);
 RETURN result;
END $function$
;

REVOKE ALL ON FUNCTION public.linguai_save_memory(bigint,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.linguai_save_memory(bigint,text,jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION public.linguai_save_memory(bigint,text,jsonb) TO "service_role";

ALTER TABLE public."lessons" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."mistakes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."skill_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."student_memory" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."student_memory_history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."vocabulary" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own memory" ON public."student_memory" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "update own memory" ON public."student_memory" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

REVOKE ALL ON TABLE public."lessons" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."mistakes" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."profiles" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."skill_progress" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."student_memory" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."student_memory_history" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE public."vocabulary" FROM PUBLIC,anon,authenticated,service_role;

GRANT DELETE ON TABLE public."lessons" TO "anon";

GRANT INSERT ON TABLE public."lessons" TO "anon";

GRANT REFERENCES ON TABLE public."lessons" TO "anon";

GRANT SELECT ON TABLE public."lessons" TO "anon";

GRANT TRIGGER ON TABLE public."lessons" TO "anon";

GRANT TRUNCATE ON TABLE public."lessons" TO "anon";

GRANT UPDATE ON TABLE public."lessons" TO "anon";

GRANT DELETE ON TABLE public."lessons" TO "authenticated";

GRANT INSERT ON TABLE public."lessons" TO "authenticated";

GRANT REFERENCES ON TABLE public."lessons" TO "authenticated";

GRANT SELECT ON TABLE public."lessons" TO "authenticated";

GRANT TRIGGER ON TABLE public."lessons" TO "authenticated";

GRANT TRUNCATE ON TABLE public."lessons" TO "authenticated";

GRANT UPDATE ON TABLE public."lessons" TO "authenticated";

GRANT DELETE ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."lessons" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."lessons" TO "service_role";

GRANT INSERT ON TABLE public."lessons" TO "service_role";

GRANT REFERENCES ON TABLE public."lessons" TO "service_role";

GRANT SELECT ON TABLE public."lessons" TO "service_role";

GRANT TRIGGER ON TABLE public."lessons" TO "service_role";

GRANT TRUNCATE ON TABLE public."lessons" TO "service_role";

GRANT UPDATE ON TABLE public."lessons" TO "service_role";

GRANT DELETE ON TABLE public."mistakes" TO "anon";

GRANT INSERT ON TABLE public."mistakes" TO "anon";

GRANT REFERENCES ON TABLE public."mistakes" TO "anon";

GRANT SELECT ON TABLE public."mistakes" TO "anon";

GRANT TRIGGER ON TABLE public."mistakes" TO "anon";

GRANT TRUNCATE ON TABLE public."mistakes" TO "anon";

GRANT UPDATE ON TABLE public."mistakes" TO "anon";

GRANT DELETE ON TABLE public."mistakes" TO "authenticated";

GRANT INSERT ON TABLE public."mistakes" TO "authenticated";

GRANT REFERENCES ON TABLE public."mistakes" TO "authenticated";

GRANT SELECT ON TABLE public."mistakes" TO "authenticated";

GRANT TRIGGER ON TABLE public."mistakes" TO "authenticated";

GRANT TRUNCATE ON TABLE public."mistakes" TO "authenticated";

GRANT UPDATE ON TABLE public."mistakes" TO "authenticated";

GRANT DELETE ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."mistakes" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."mistakes" TO "service_role";

GRANT INSERT ON TABLE public."mistakes" TO "service_role";

GRANT REFERENCES ON TABLE public."mistakes" TO "service_role";

GRANT SELECT ON TABLE public."mistakes" TO "service_role";

GRANT TRIGGER ON TABLE public."mistakes" TO "service_role";

GRANT TRUNCATE ON TABLE public."mistakes" TO "service_role";

GRANT UPDATE ON TABLE public."mistakes" TO "service_role";

GRANT DELETE ON TABLE public."profiles" TO "anon";

GRANT INSERT ON TABLE public."profiles" TO "anon";

GRANT REFERENCES ON TABLE public."profiles" TO "anon";

GRANT SELECT ON TABLE public."profiles" TO "anon";

GRANT TRIGGER ON TABLE public."profiles" TO "anon";

GRANT TRUNCATE ON TABLE public."profiles" TO "anon";

GRANT UPDATE ON TABLE public."profiles" TO "anon";

GRANT DELETE ON TABLE public."profiles" TO "authenticated";

GRANT INSERT ON TABLE public."profiles" TO "authenticated";

GRANT REFERENCES ON TABLE public."profiles" TO "authenticated";

GRANT SELECT ON TABLE public."profiles" TO "authenticated";

GRANT TRIGGER ON TABLE public."profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE public."profiles" TO "authenticated";

GRANT UPDATE ON TABLE public."profiles" TO "authenticated";

GRANT DELETE ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."profiles" TO "service_role";

GRANT INSERT ON TABLE public."profiles" TO "service_role";

GRANT REFERENCES ON TABLE public."profiles" TO "service_role";

GRANT SELECT ON TABLE public."profiles" TO "service_role";

GRANT TRIGGER ON TABLE public."profiles" TO "service_role";

GRANT TRUNCATE ON TABLE public."profiles" TO "service_role";

GRANT UPDATE ON TABLE public."profiles" TO "service_role";

GRANT DELETE ON TABLE public."skill_progress" TO "anon";

GRANT INSERT ON TABLE public."skill_progress" TO "anon";

GRANT REFERENCES ON TABLE public."skill_progress" TO "anon";

GRANT SELECT ON TABLE public."skill_progress" TO "anon";

GRANT TRIGGER ON TABLE public."skill_progress" TO "anon";

GRANT TRUNCATE ON TABLE public."skill_progress" TO "anon";

GRANT UPDATE ON TABLE public."skill_progress" TO "anon";

GRANT DELETE ON TABLE public."skill_progress" TO "authenticated";

GRANT INSERT ON TABLE public."skill_progress" TO "authenticated";

GRANT REFERENCES ON TABLE public."skill_progress" TO "authenticated";

GRANT SELECT ON TABLE public."skill_progress" TO "authenticated";

GRANT TRIGGER ON TABLE public."skill_progress" TO "authenticated";

GRANT TRUNCATE ON TABLE public."skill_progress" TO "authenticated";

GRANT UPDATE ON TABLE public."skill_progress" TO "authenticated";

GRANT DELETE ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."skill_progress" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."skill_progress" TO "service_role";

GRANT INSERT ON TABLE public."skill_progress" TO "service_role";

GRANT REFERENCES ON TABLE public."skill_progress" TO "service_role";

GRANT SELECT ON TABLE public."skill_progress" TO "service_role";

GRANT TRIGGER ON TABLE public."skill_progress" TO "service_role";

GRANT TRUNCATE ON TABLE public."skill_progress" TO "service_role";

GRANT UPDATE ON TABLE public."skill_progress" TO "service_role";

GRANT DELETE ON TABLE public."student_memory" TO "anon";

GRANT INSERT ON TABLE public."student_memory" TO "anon";

GRANT REFERENCES ON TABLE public."student_memory" TO "anon";

GRANT SELECT ON TABLE public."student_memory" TO "anon";

GRANT TRIGGER ON TABLE public."student_memory" TO "anon";

GRANT TRUNCATE ON TABLE public."student_memory" TO "anon";

GRANT UPDATE ON TABLE public."student_memory" TO "anon";

GRANT DELETE ON TABLE public."student_memory" TO "authenticated";

GRANT INSERT ON TABLE public."student_memory" TO "authenticated";

GRANT REFERENCES ON TABLE public."student_memory" TO "authenticated";

GRANT SELECT ON TABLE public."student_memory" TO "authenticated";

GRANT TRIGGER ON TABLE public."student_memory" TO "authenticated";

GRANT TRUNCATE ON TABLE public."student_memory" TO "authenticated";

GRANT UPDATE ON TABLE public."student_memory" TO "authenticated";

GRANT DELETE ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."student_memory" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."student_memory" TO "service_role";

GRANT INSERT ON TABLE public."student_memory" TO "service_role";

GRANT REFERENCES ON TABLE public."student_memory" TO "service_role";

GRANT SELECT ON TABLE public."student_memory" TO "service_role";

GRANT TRIGGER ON TABLE public."student_memory" TO "service_role";

GRANT TRUNCATE ON TABLE public."student_memory" TO "service_role";

GRANT UPDATE ON TABLE public."student_memory" TO "service_role";

GRANT DELETE ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."student_memory_history" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."student_memory_history" TO "service_role";

GRANT INSERT ON TABLE public."student_memory_history" TO "service_role";

GRANT REFERENCES ON TABLE public."student_memory_history" TO "service_role";

GRANT SELECT ON TABLE public."student_memory_history" TO "service_role";

GRANT TRIGGER ON TABLE public."student_memory_history" TO "service_role";

GRANT TRUNCATE ON TABLE public."student_memory_history" TO "service_role";

GRANT UPDATE ON TABLE public."student_memory_history" TO "service_role";

GRANT DELETE ON TABLE public."vocabulary" TO "anon";

GRANT INSERT ON TABLE public."vocabulary" TO "anon";

GRANT REFERENCES ON TABLE public."vocabulary" TO "anon";

GRANT SELECT ON TABLE public."vocabulary" TO "anon";

GRANT TRIGGER ON TABLE public."vocabulary" TO "anon";

GRANT TRUNCATE ON TABLE public."vocabulary" TO "anon";

GRANT UPDATE ON TABLE public."vocabulary" TO "anon";

GRANT DELETE ON TABLE public."vocabulary" TO "authenticated";

GRANT INSERT ON TABLE public."vocabulary" TO "authenticated";

GRANT REFERENCES ON TABLE public."vocabulary" TO "authenticated";

GRANT SELECT ON TABLE public."vocabulary" TO "authenticated";

GRANT TRIGGER ON TABLE public."vocabulary" TO "authenticated";

GRANT TRUNCATE ON TABLE public."vocabulary" TO "authenticated";

GRANT UPDATE ON TABLE public."vocabulary" TO "authenticated";

GRANT DELETE ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT INSERT ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT REFERENCES ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT SELECT ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT TRIGGER ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT TRUNCATE ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT UPDATE ON TABLE public."vocabulary" TO "postgres" WITH GRANT OPTION;

GRANT DELETE ON TABLE public."vocabulary" TO "service_role";

GRANT INSERT ON TABLE public."vocabulary" TO "service_role";

GRANT REFERENCES ON TABLE public."vocabulary" TO "service_role";

GRANT SELECT ON TABLE public."vocabulary" TO "service_role";

GRANT TRIGGER ON TABLE public."vocabulary" TO "service_role";

GRANT TRUNCATE ON TABLE public."vocabulary" TO "service_role";

GRANT UPDATE ON TABLE public."vocabulary" TO "service_role";

CREATE TRIGGER on_auth_user_created_memory AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_student_memory_for_new_user();

COMMIT;
