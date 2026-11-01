create or replace function public.regat_teacher_lesson_access(p_token text,p_student_id text,p_lesson integer,p_allowed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare affected integer; delegated jsonb;
begin
 if not public.regat_teacher_session(p_token) then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if p_lesson is null or p_lesson not between 1 and 6 or p_allowed is null then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 if p_lesson=2 then
  delegated=public.regat_teacher_lesson2(p_token,p_student_id,p_allowed);
  return delegated||jsonb_build_object('lesson',2);
 end if;
 perform 1 from regat_private.students where enabled and (p_student_id='all' or id=p_student_id) order by id for update;
 if not found and p_student_id<>'all' then return jsonb_build_object('ok',false,'error','student_missing');end if;
 update regat_private.students s set lesson_progress=jsonb_set(
  s.lesson_progress,'{1}',coalesce(s.lesson_progress->'1','{}'::jsonb)||jsonb_build_object(
   'manualAccess',coalesce(s.lesson_progress#>'{1,manualAccess}','{}'::jsonb)||jsonb_build_object(p_lesson::text,p_allowed),
   'unlocked',(select coalesce(jsonb_agg(v order by v),'[]'::jsonb) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(s.lesson_progress#>'{1,unlocked}','[1]'::jsonb)) where value::integer<>p_lesson union select p_lesson where p_allowed) a)
  ),true)
 where s.enabled and (p_student_id='all' or s.id=p_student_id);
 get diagnostics affected=row_count;
 if p_student_id='all' then return jsonb_build_object('ok',true,'affected',affected,'lesson',p_lesson,'allowed',p_allowed);end if;
 return jsonb_build_object('ok',true,'profile',public.regat_student_profile(p_student_id),'lesson',p_lesson);
end;$$;
revoke all on function public.regat_teacher_lesson_access(text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.regat_teacher_lesson_access(text,text,integer,boolean) to service_role;

-- Preserve the existing exercise and key logic, with a teacher-controlled lesson 1 guard.
do $$ declare definition text; marker text:='perform 1 from regat_private.students where id=sid for update;'; begin
 definition=pg_get_functiondef('public.regat_formation(text,text,integer,text)'::regprocedure);
 if position('manualAccess' in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Formation lock marker not found';end if;
  definition=replace(definition,marker,marker||E'\n if p_action in (''exercises'',''answer'',''take_key'') and exists(select 1 from regat_private.students where id=sid and lesson_progress#>>''{1,manualAccess,1}''=''false'') then return jsonb_build_object(''ok'',false,''error'',''lesson_locked'');end if;');
  execute definition;
 end if;
end $$;
