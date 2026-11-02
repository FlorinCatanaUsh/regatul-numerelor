-- A retained key can explicitly open a restored lesson 3 lock.
do $migration$
declare definition text; marker text:=' if p_action=''state'' then';
begin
 definition=pg_get_functiondef('public.regat_comparison(text,text,integer,text)'::regprocedure);
 if position(marker in definition)=0 then raise exception 'State marker missing';end if;
 definition=replace(definition,marker,$guard$
 if p_action='open_lock' then
  if sid<>'student-04' or not exists(select 1 from regat_private.reading_progress where student_id=sid and key_taken) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,comparisonLockOpened}','true'::jsonb,true) where id=sid;
  return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 end if;
 if lp#>>'{1,comparisonLockOpened}'='false' then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
$guard$||marker);
 execute definition;
end $migration$;
