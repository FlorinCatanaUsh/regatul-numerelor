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
   'manualAccess',coalesce(s.lesson_progress#>'{1,manualAccess}','{}'::jsonb)||jsonb_build_object(p_lesson::text,p_allowed)
  ),true)
 where s.enabled and (p_student_id='all' or s.id=p_student_id);
 get diagnostics affected=row_count;
 if p_student_id='all' then return jsonb_build_object('ok',true,'affected',affected,'lesson',p_lesson,'allowed',p_allowed);end if;
 return jsonb_build_object('ok',true,'profile',public.regat_student_profile(p_student_id),'lesson',p_lesson);
end;$$;
revoke all on function public.regat_teacher_lesson_access(text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.regat_teacher_lesson_access(text,text,integer,boolean) to service_role;


-- Existing unlock lists may contain former teacher overrides. Require the actual preceding key.
do $migration$
declare fn text; definition text; marker text; guard text; lesson integer;
begin
 for fn,lesson in select * from (values ('regat_comparison',3),('regat_ordering',4),('regat_rounding',5),('regat_roman',6)) x(fn,lesson) loop
 definition=pg_get_functiondef(('public.'||fn||'(text,text,integer,text)')::regprocedure);
 marker=' if p_action=''state'' then';
 if position(marker in definition)=0 then raise exception 'Missing guard marker %',fn;end if;
 guard=case lesson when 3 then 'exists(select 1 from regat_private.reading_progress where student_id=sid and key_taken)' when 4 then 'coalesce((lp#>>''{1,comparisonKeyTaken}'')::boolean,false)' when 5 then 'coalesce((lp#>>''{1,orderingKeyTaken}'')::boolean,false)' when 6 then 'coalesce((lp#>>''{1,roundingKeyTaken}'')::boolean,false)' end;
 definition=replace(definition,marker,' if not ('||guard||') then return jsonb_build_object(''ok'',false,''error'',''lesson_locked'');end if;'||chr(10)||marker);
 if lesson=5 then
 definition=replace(definition,' if p_action<>''answer'' then', $key$
 if p_action='take_key' then
  if jsonb_array_length(coalesce(lp#>'{1,roundingSolved}','[]'::jsonb))<6 then return jsonb_build_object('ok',false,'error','six_stars');end if;
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,roundingKeyTaken}','true'::jsonb,true) where id=sid;
  return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 end if;
 if p_action<>'answer' then$key$);
 end if;
 execute definition;
 end loop;
end $migration$;
