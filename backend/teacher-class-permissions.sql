create or replace function public.regat_teacher_lesson2(p_token text,p_student_id text,p_allowed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
 if not public.regat_teacher_session(p_token) then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if p_allowed is null then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 if p_student_id='all' then
  perform 1 from regat_private.students where enabled order by id for update;
  insert into regat_private.formation_progress(student_id,lesson2_allowed)
   select id,p_allowed from regat_private.students where enabled order by id
   on conflict(student_id) do update set lesson2_allowed=excluded.lesson2_allowed;
  get diagnostics affected=row_count;
  return jsonb_build_object('ok',true,'affected',affected,'allowed',p_allowed);
 end if;
 perform 1 from regat_private.students where id=p_student_id and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','student_missing');end if;
 insert into regat_private.formation_progress(student_id,lesson2_allowed) values(p_student_id,p_allowed)
  on conflict(student_id) do update set lesson2_allowed=p_allowed;
 return jsonb_build_object('ok',true,'profile',public.regat_student_profile(p_student_id));
end;$$;
