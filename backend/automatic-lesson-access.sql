-- Remove the teacher gate from the live RPCs. Student progress rows are never rewritten.
do $migration$
declare
 target record;
 definition text;
begin
 for target in
  select * from (values
   ('regat_formation', $guard$ if p_action in ('exercises','answer','take_key') and exists(select 1 from regat_private.students where id=sid and lesson_progress#>>'{1,manualAccess,1}'='false') then return jsonb_build_object('ok',false,'error','lesson_locked');end if;$guard$, ''),
   ('regat_formation', $guard$  if not f.lesson2_allowed then return jsonb_build_object('ok',false,'error','teacher_permission');end if;$guard$, ''),
   ('regat_reading', 'f.key_taken and f.lesson2_allowed and f.lesson2_opened', 'f.key_taken and f.lesson2_opened'),
   ('regat_comparison', $guard$  if sid<>'student-04' or not exists(select 1 from regat_private.reading_progress where student_id=sid and key_taken) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;$guard$,
    $guard$  if not exists(select 1 from regat_private.reading_progress where student_id=sid and key_taken) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;$guard$)
  ) changes(fn, old_guard, new_guard)
  union all
  select fn, format($guard$ if lp#>>'{1,manualAccess,%1$s}'='false' or not(coalesce(lp#>>'{1,manualAccess,%1$s}'='true',false) or coalesce(lp#>'{1,unlocked}' @> '[%1$s]'::jsonb,false)) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;$guard$, lesson), ''
  from (values ('regat_comparison',3),('regat_ordering',4),('regat_rounding',5),('regat_roman',6)) lessons(fn, lesson)
 loop
  definition := pg_get_functiondef(('public.'||target.fn||'(text,text,integer,text)')::regprocedure);
  if strpos(definition,target.old_guard)=0 then
   raise exception 'Unexpected access rule in %',target.fn;
  end if;
  execute replace(definition,target.old_guard,target.new_guard);
 end loop;
end $migration$;
