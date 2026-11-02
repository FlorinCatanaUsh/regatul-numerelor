do $migration$
declare definition text; marker text:=' if p_action=''state'' then';
begin
 definition=pg_get_functiondef('public.regat_roman(text,text,integer,text)'::regprocedure);
 if position(marker in definition)=0 then raise exception 'State marker missing';end if;
 definition=replace(definition,marker,$crystal$
 if p_action='take_crystal' then
  if (select count(distinct v::integer) from jsonb_array_elements_text(coalesce(lp#>'{1,romanSolved}','[]'::jsonb)) v where v::integer between 1 and 12)<6 then return jsonb_build_object('ok',false,'error','six_stars');end if;
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,forestCrystalTaken}','true'::jsonb,true),completed_chapters=(select array_agg(distinct v order by v) from unnest(coalesce(completed_chapters,'{}'::integer[])||array[1]) v) where id=sid;
  return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 end if;
$crystal$||marker);
 execute definition;
end $migration$;
