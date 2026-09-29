CREATE OR REPLACE FUNCTION public.linguai_save_memory(p_wp_user_id bigint,p_language text,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.linguai_save_memory(bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.linguai_save_memory(bigint,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';

